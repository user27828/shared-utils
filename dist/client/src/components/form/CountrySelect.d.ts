export default CountrySelect;
/**
 * Country selection component supporting single or multiple country selection
 *
 * @param {Object} param0 - Component props
 * @param {string|string[]} param0.value - Selected country code(s)
 * @param {function} param0.onChange - Change handler function
 * @param {boolean} [param0.multiple=false] - Whether multiple countries can be selected
 * @param {string|string[]} [param0.topCountries=[]] - ISO code(s) to place at the top
 * @param {boolean} [param0.showEmpty=true] - Whether to show the "Not Selected/Other" option
 * @param {boolean} [param0.searchable=true] - Whether to enable search functionality
 * @param {string} [param0.sortBy="name"] - Property to sort by (e.g., "name", "population")
 * @param {string} [param0.order="asc"] - Sort order: "asc" or "desc"
 * @param {string} [param0.label="Country"] - Label for the select
 * @param {string} [param0.id="country-select"] - ID for the component
 * @param {string} [param0.name="countries"] - Name for the form field
 * @param {boolean} [param0.required=false] - Whether the field is required
 * @param {boolean} [param0.disabled=false] - Whether the field is disabled
 * @param {string} [param0.error=false] - Error message
 * @param {string} [param0.helperText=""] - Helper text
 * @param {Object} [param0.sx={}] - Additional styles
 * @param {boolean} [param0.fullWidth=true] - Whether the component should take up full width
 * @param {string} [param0.size="medium"] - Size of the component
 * @param {string} [param0.variant="outlined"] - Variant of the component
 * @param {string} [param0.placeholder="Select country"] - Placeholder text
 * @param {boolean} [param0.showTelCode=false] - Whether to show telephone country code
 * @param {Object} [param0.props] - Additional props to pass to <Autocomplete>
 * @returns {JSX.Element}
 */
declare function CountrySelect({ value, onChange, multiple, topCountries, showEmpty, searchable, sortBy, order, label, id, name, required, disabled, error, helperText, sx, fullWidth, size, variant, placeholder, showTelCode, ...props }: {
    value: string | string[];
    onChange: Function;
    multiple?: boolean | undefined;
    topCountries?: string | string[] | undefined;
    showEmpty?: boolean | undefined;
    searchable?: boolean | undefined;
    sortBy?: string | undefined;
    order?: string | undefined;
    label?: string | undefined;
    id?: string | undefined;
    name?: string | undefined;
    required?: boolean | undefined;
    disabled?: boolean | undefined;
    error?: string | undefined;
    helperText?: string | undefined;
    sx?: Object | undefined;
    fullWidth?: boolean | undefined;
    size?: string | undefined;
    variant?: string | undefined;
    placeholder?: string | undefined;
    showTelCode?: boolean | undefined;
    props?: Object | undefined;
}): JSX.Element;
declare namespace CountrySelect {
    namespace propTypes {
        let value: PropTypes.Requireable<NonNullable<string | number | (NonNullable<string | number | null | undefined> | null | undefined)[] | null | undefined>>;
        let onChange: PropTypes.Validator<(...args: any[]) => any>;
        let multiple: PropTypes.Requireable<boolean>;
        let topCountries: PropTypes.Requireable<NonNullable<string | (string | null | undefined)[] | null | undefined>>;
        let showEmpty: PropTypes.Requireable<boolean>;
        let searchable: PropTypes.Requireable<boolean>;
        let sortBy: PropTypes.Requireable<string>;
        let order: PropTypes.Requireable<string>;
        let label: PropTypes.Requireable<string>;
        let id: PropTypes.Requireable<string>;
        let name: PropTypes.Requireable<string>;
        let required: PropTypes.Requireable<boolean>;
        let disabled: PropTypes.Requireable<boolean>;
        let error: PropTypes.Requireable<boolean>;
        let helperText: PropTypes.Requireable<string>;
        let sx: PropTypes.Requireable<object>;
        let fullWidth: PropTypes.Requireable<boolean>;
        let size: PropTypes.Requireable<string>;
        let variant: PropTypes.Requireable<string>;
        let placeholder: PropTypes.Requireable<string>;
        let showTelCode: PropTypes.Requireable<boolean>;
    }
}
import PropTypes from "prop-types";
//# sourceMappingURL=CountrySelect.d.ts.map