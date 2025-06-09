export default LanguageSelect;
/**
 * Language selection component supporting single or multiple language selection
 *
 * @param {Object} param0 - Component props
 * @param {string|string[]} param0.value - Selected language code(s)
 * @param {function} param0.onChange - Change handler function
 * @param {string} [param0.name="languages"] - Name for the form field
 * @param {string} [param0.id="language-select"] - React node ID for the component (must be unique for calling component)
 * @param {string|string[]|Object} [param0.topLanguages=[...]] - ISO code(s), IETF tag(s), or {ietfRegions: [array]} object
 * @param {boolean} [param0.multiple=false] - Whether multiple languages can be selected
 * @param {boolean} [param0.showEmpty=true] - Whether to show the "Not Selected/Other" option
 * @param {boolean} [param0.searchable=true] - Whether to enable search functionality
 * @param {string} [param0.sortBy="name"] - Property to sort by (e.g., "name", "speakers")
 * @param {string} [param0.order="asc"] - Sort order: "asc" or "desc"
 * @param {string} [param0.label="Language"] - Label for the select
 * @param {boolean} [param0.required=false] - Whether the field is required
 * @param {boolean} [param0.disabled=false] - Whether the field is disabled
 * @param {string} [param0.error=false] - Error message
 * @param {string} [param0.helperText=""] - Helper text
 * @param {Object} [param0.sx={}] - Additional styles
 * @param {boolean} [param0.fullWidth=true] - Whether the component should take up full width
 * @param {string} [param0.size="medium"] - Size of the component
 * @param {string} [param0.variant="outlined"] - Variant of the component
 * @param {string} [param0.placeholder="Select language"] - Placeholder text
 * @param {Object} [param0.props] - Additional props to pass to the <Autocomplete> component
 * @returns {JSX.Element}
 */
declare function LanguageSelect({ value, onChange, name, id, multiple, topLanguages, showEmpty, searchable, sortBy, order, label, required, disabled, error, helperText, sx, fullWidth, size, variant, placeholder, ...props }: {
    value: string | string[];
    onChange: Function;
    name?: string | undefined;
    id?: string | undefined;
    topLanguages?: string | Object | string[] | undefined;
    multiple?: boolean | undefined;
    showEmpty?: boolean | undefined;
    searchable?: boolean | undefined;
    sortBy?: string | undefined;
    order?: string | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    disabled?: boolean | undefined;
    error?: string | undefined;
    helperText?: string | undefined;
    sx?: Object | undefined;
    fullWidth?: boolean | undefined;
    size?: string | undefined;
    variant?: string | undefined;
    placeholder?: string | undefined;
    props?: Object | undefined;
}): JSX.Element;
declare namespace LanguageSelect {
    namespace propTypes {
        let value: any;
        let onChange: any;
        let multiple: any;
        let topLanguages: any;
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
    }
}
