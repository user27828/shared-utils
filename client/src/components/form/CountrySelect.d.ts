import React from 'react';

export interface CountrySelectProps {
  // Selected country code(s) - can be a string for single selection or array for multiple
  value?: string | string[]; 
  // Change handler function
  onChange: (value: string | string[]) => void;

  /**
   * Whether multiple countries can be selected
   * @default false
   */
  multiple?: boolean;

  // ISO code(s) to place at the top
  topCountries?: string | string[];

  /**
   * Whether to show the "Not Selected/Other" option
   * @default true
   */
  showEmpty?: boolean;

  /**
   * Whether to enable search functionality
   * @default true
   */
  searchable?: boolean;

  /**
   * Property to sort by (e.g., "name", "population")
   * @default "name"
   */
  sortBy?: string;

  /**
   * Sort order: "asc" or "desc"
   * @default "asc"
   */
  order?: "asc" | "desc";

  /**
   * Label for the select
   * @default "Country"
   */
  label?: string;

  // ID for the component
  id?: string;

  // Name for the form field
  name?: string;

  /**
   * Whether the field is required
   * @default false
   */
  required?: boolean;

  /**
   * Whether the field is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Error state
   * @default false
   */
  error?: boolean;

  /**
   * Helper text
   * @default ""
   */
  helperText?: string;

  /**
   * Additional styles
   * @default {}
   */
  sx?: Record<string, any>;

  /**
   * Whether the component should take up full width
   * @default true
   */
  fullWidth?: boolean;

  /**
   * Size of the component
   * @default "medium"
   */
  size?: "small" | "medium" | "large";
  
  /**
   * Variant of the component
   * @default "outlined"
   */
  variant?: "standard" | "outlined" | "filled";

  /**
   * Placeholder text
   * @default "Select country"
   */
  placeholder?: string;

  /**
   * Whether to show telephone country code
   * @default false
   */
  showTelCode?: boolean;

  // Any other props to be spread
  [key: string]: any;
}

/**
 * Country selection component supporting single or multiple country selection
 */
export default function CountrySelect(props: CountrySelectProps): JSX.Element; // Changed to export default