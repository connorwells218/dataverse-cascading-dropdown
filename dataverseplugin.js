import { LitElement, html, css } from 'lit';
import * as msal from '@azure/msal-browser';

export class DataverseCascadingDropdown extends LitElement {
    static properties = {
        accessToken: { type: String },
        countries: { type: Array },
        cities: { type: Array },
        selectedCountry: { type: String }
    };

    constructor() {
        super();
        this.accessToken = ''; // Will be set dynamically
        this.countries = [];
        this.cities = [];
        this.selectedCountry = '';
        this.dataverseUrl = 'https://safalo.crm.dynamics.com/api/data/v9.2/';

        // MSAL Configuration (Replace with your actual values)
        this.msalConfig = {
            auth: {
                clientId: 'cf764a7f-b412-4621-a5c9-a95dcaa2383c', // Replace with Azure AD App Client ID
                authority: 'https://login.microsoftonline.com/5a2beb23-b1a5-4fc5-90b2-2520f82f9a3b', // Replace with your Tenant ID
                redirectUri: 'https://us.nintex.io' // Replace with your Nintex Forms domain
            }
        };

        this.msalInstance = new msal.PublicClientApplication(this.msalConfig);
    }

    async connectedCallback() {
        super.connectedCallback();
        this.accessToken = await this.getAccessToken();
        await this.loadCountries();
    }

    async getAccessToken() {
        try {
            // Login user with popup
            const loginResponse = await this.msalInstance.loginPopup({
                scopes: ["https://safalo.crm.dynamics.com/.default"]
            });

            // Acquire token silently
            const tokenResponse = await this.msalInstance.acquireTokenSilent({
                scopes: ["https://safalo.crm.dynamics.com/.default"],
                account: loginResponse.account
            });

            return tokenResponse.accessToken;
        } catch (error) {
            console.error("Error acquiring token:", error);
            // If silent authentication fails, try interactive login
            const tokenResponse = await this.msalInstance.acquireTokenPopup({
                scopes: ["https://safalo.crm.dynamics.com/.default"]
            });
            return tokenResponse.accessToken;
        }
    }

    async loadCountries() {
        if (!this.accessToken) return;
        try {
            const response = await fetch(`${this.dataverseUrl}crb53_countrieses`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            this.countries = data.value;
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    }

    async loadCities(countryId) {
        if (!this.accessToken) return;
        try {
            const response = await fetch(
                `${this.dataverseUrl}crb53_citieses?$filter=_crb53_countrylookup_value eq '${countryId}'`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'OData-MaxVersion': '4.0',
                        'OData-Version': '4.0',
                        'Accept': 'application/json'
                    }
                }
            );
            const data = await response.json();
            this.cities = data.value;
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    }

    handleCountryChange(e) {
        this.selectedCountry = e.target.value;
        this.cities = []; // Clear previous cities
        if (this.selectedCountry) {
            this.loadCities(this.selectedCountry);
        }
    }

    static styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: Arial, sans-serif;
    }
    .dropdown-container {
      margin-bottom: 1rem;
    }
    label {
      margin-right: 0.5rem;
      font-weight: bold;
    }
    select {
      padding: 0.5rem;
      min-width: 200px;
    }
  `;

    render() {
        return html`
      <div class="dropdown-container">
        <label for="country-dropdown">Select Country:</label>
        <select id="country-dropdown" @change=${this.handleCountryChange}>
          <option value="">-- Select a country --</option>
          ${this.countries.map(
            country => html`<option value="${country.crb53_countriesid}">${country.crb53_countryname}</option>`
        )}
        </select>
      </div>
      <div class="dropdown-container">
        <label for="city-dropdown">Select City:</label>
        <select id="city-dropdown">
          <option value="">-- Select a city --</option>
          ${this.cities.map(
            city => html`<option value="${city.crb53_citiesid}">${city.crb53_cityname} (${city.crb53_region})</option>`
        )}
        </select>
      </div>
    `;
    }
}

customElements.define('dataverse-cascading-dropdown', DataverseCascadingDropdown);
