import React from 'react';

export interface LanguageSelectProps {
  // Selected language code(s) - can be a string for single selection or array for multiple
  value?: string | string[];
  
  // Change handler function
  onChange: (value: string | string[]) => void;
  
  /**
   * Whether multiple languages can be selected
   * @default false
   */
  multiple?: boolean;
  // ISO code(s), IETF tag(s), or {ietfRegions: [array]} object
  topLanguages?: string | string[] | { ietfRegions: string | string[] };
  
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
   * Property to sort by (e.g., "name", "speakers")
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
   * @default "Language"
   */
  label?: string;
  
  /**
   * ID for the component
   */
  id?: string;
  
  /**
   * Name for the form field
   */
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
   * Error message/state
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
   * @default "Select language"
   */
  placeholder?: string;
  
  /**
   * Any other props to be spread
   */
  [key: string]: any;
}

/**
 * Language selection component supporting single or multiple language selection
 */
export default function LanguageSelect(props: LanguageSelectProps): JSX.Element;