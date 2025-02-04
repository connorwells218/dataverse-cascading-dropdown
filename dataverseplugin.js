import {
    css,
    html,
    LitElement,
} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js';

export class DataverseCascadingDropdown extends LitElement {
    static properties = {
        selectedCountryId: { type: String },
        selectedCountryName: { type: String },
        selectedCityId: { type: String },
        selectedCityName: { type: String },
        countries: { type: Array },
        cities: { type: Array },
        authToken: { type: String }
    };

    static styles = css`
        :host {
            display: block;
            font-family: var(--ntx-font-family, Arial, sans-serif);
        }
        select {
            width: 100%;
            padding: 8px;
            margin-bottom: 8px;
            border: 1px solid var(--ntx-border-color, #ccc);
            border-radius: 4px;
            background-color: white;
            color: black;
            font-size: 16px;
        }
        select:disabled {
            background-color: #f5f5f5;
            color: gray;
        }
        option {
            background-color: white;
            color: black;
        }
    `;

    constructor() {
        super();
        this.selectedCountryId = '';
        this.selectedCountryName = '';
        this.selectedCityId = '';
        this.selectedCityName = '';
        this.countries = [];
        this.cities = [];
        this.authToken = null;
    }

    static getMetaConfig() {
        return {
            controlName: 'Dataverse Cascading Dropdown',
            fallbackDisableSubmit: false,
            version: '1.6',
            properties: {
                selectedCountryName: {
                    type: 'string',
                    title: 'Selected Country',
                    isValueField: true
                },
                selectedCityName: {
                    type: 'string',
                    title: 'Selected City',
                    isValueField: true
                }
            },
            events: ['ntx-value-change']
        };
    }

    async connectedCallback() {
        super.connectedCallback();
        await this.getToken();
    }

    async getToken() {
        if (this.authToken) return this.authToken;

        const proxyEndpoint = "https://dataversemiddlewareapp.azurewebsites.net/api/GetDataverseToken";

        try {
            const response = await fetch(proxyEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) throw new Error(`Token request failed: ${response.status}`);

            const data = await response.json();
            this.authToken = data.access_token;
            sessionStorage.setItem("authToken", this.authToken);

            await this.loadCountries();
            return this.authToken;
        } catch (error) {
            console.error("Error retrieving token:", error);
            return null;
        }
    }

    async loadCountries() {
        if (!this.authToken) {
            console.error("No authentication token available.");
            return;
        }

        try {
            const response = await fetch(
                "https://safalo.crm.dynamics.com/api/data/v9.2/crb53_countrieses",
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${this.authToken}`,
                        "Accept": "application/json"
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error loading countries:", errorData);
                throw new Error(`Failed to load countries: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            this.countries = data.value;
            this.requestUpdate();
        } catch (error) {
            console.error("Error loading countries:", error);
        }
    }

    async loadCities(countryId) {
        if (!countryId) {
            this.cities = [];
            this.requestUpdate();
            return;
        }

        try {
            const response = await fetch(
                `https://safalo.crm.dynamics.com/api/data/v9.2/crb53_citieses?$filter=_crb53_countrylookup_value eq '${countryId}'`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${this.authToken}`,
                        "Accept": "application/json"
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error loading cities:", errorData);
                throw new Error(`Failed to load cities: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            this.cities = data.value;
            this.requestUpdate();
        } catch (error) {
            console.error("Error loading cities:", error);
        }
    }

    handleCountryChange(e) {
        const selectedOption = e.target.selectedOptions[0];
        this.selectedCountryId = selectedOption.value;
        this.selectedCountryName = selectedOption.text;
        this.selectedCityId = "";
        this.selectedCityName = "";

        this.loadCities(this.selectedCountryId); // ✅ Call `loadCities()` when country changes
        this.requestUpdate();

        this.dispatchEvent(new CustomEvent("ntx-value-change", {
            detail: {
                selectedCountry: this.selectedCountryName,
                selectedCity: this.selectedCityName
            },
            bubbles: true,
            composed: true
        }));
    }

    handleCityChange(e) {
        const selectedOption = e.target.selectedOptions[0];
        this.selectedCityId = selectedOption.value;
        this.selectedCityName = selectedOption.text;
        this.requestUpdate();

        this.dispatchEvent(new CustomEvent("ntx-value-change", {
            detail: {
                selectedCountry: this.selectedCountryName,
                selectedCity: this.selectedCityName
            },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        return html`
            <div>
                <select @change=${this.handleCountryChange} .value=${this.selectedCountryId}>
                    <option value="" disabled hidden>Select Country</option>
                    ${this.countries.map(country => html`
                        <option value=${country.crb53_countriesid} ?selected=${this.selectedCountryId === country.crb53_countriesid}>
                            ${country.crb53_countryname}
                        </option>
                    `)}
                </select>

                <select @change=${this.handleCityChange} .value=${this.selectedCityId} ?disabled=${!this.selectedCountryId}>
                    <option value="" disabled hidden>Select City</option>
                    ${this.cities.map(city => html`
                        <option value=${city.crb53_citiesid} ?selected=${this.selectedCityId === city.crb53_citiesid}>
                            ${city.crb53_cityname}
                        </option>
                    `)}
                </select>
            </div>
        `;
    }
}

customElements.define('dataverse-cascading-dropdown', DataverseCascadingDropdown);
