export default CountrySelect;
/**
 * Country selection component supporting single or multiple country selection
 *
 * @param {Object} props - Component props
 * @param {string|string[]} props.value - Selected country code(s)
 * @param {function} props.onChange - Change handler function
 * @param {boolean} props.multiple - Whether multiple countries can be selected
 * @param {string|string[]} props.topCountries - ISO code(s) to place at the top
 * @param {boolean} props.showEmpty - Whether to show the "Not Selected/Other" option
 * @param {boolean} props.searchable - Whether to enable search functionality
 * @param {string} props.sortBy - Property to sort by (e.g., "name", "population")
 * @param {string} props.order - Sort order: "asc" or "desc"
 * @param {string} props.label - Label for the select
 * @param {string} props.id - ID for the component
 * @param {string} props.name - Name for the form field
 * @param {boolean} props.required - Whether the field is required
 * @param {boolean} props.disabled - Whether the field is disabled
 * @param {string} props.error - Error message
 * @param {string} props.helperText - Helper text
 * @param {Object} props.sx - Additional styles
 * @param {boolean} props.fullWidth - Whether the component should take up full width
 * @param {string} props.size - Size of the component
 * @param {string} props.variant - Variant of the component
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.showTelCode - Whether to show telephone country code
 * @returns {JSX.Element}
 */
declare function CountrySelect({ value, onChange, multiple, topCountries, showEmpty, searchable, sortBy, order, label, id, name, required, disabled, error, helperText, sx, fullWidth, size, variant, placeholder, showTelCode, ...props }: {
    value: string | string[];
    onChange: Function;
    multiple: boolean;
    topCountries: string | string[];
    showEmpty: boolean;
    searchable: boolean;
    sortBy: string;
    order: string;
    label: string;
    id: string;
    name: string;
    required: boolean;
    disabled: boolean;
    error: string;
    helperText: string;
    sx: Object;
    fullWidth: boolean;
    size: string;
    variant: string;
    placeholder: string;
    showTelCode: boolean;
}): JSX.Element;
declare namespace CountrySelect {
    namespace propTypes {
        let value: any;
        let onChange: any;
        let multiple: any;
        let topCountries: any;
        let showEmpty: any;
        let searchable: any;
        let sortBy: any;
        let order: any;
        let label: any;
        let id: any;
        let name: any;
        let required: any;
        let disabled: any;
        let error: any;
        let helperText: any;
        let sx: any;
        let fullWidth: any;
        let size: any;
        let variant: any;
        let placeholder: any;
        let showTelCode: any;
    }
}
