// Custom type declarations for @user27828/shared-utils
// This file provides explicit type declarations for all subpath exports

declare module "*.css";

declare module "@user27828/shared-utils" {
  export * from "@user27828/shared-utils/dist/utils";
}

declare module "@user27828/shared-utils/client" {
  // Components
  import React from "react";

  export interface CountrySelectProps {
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    multiple?: boolean;
    label?: string;
    topCountries?: string[];
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    placeholder?: string;
    fullWidth?: boolean;
    variant?: "outlined" | "filled" | "standard";
    size?: "small" | "medium";
    required?: boolean;
    autoFocus?: boolean;
  }

  export interface LanguageSelectProps {
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    multiple?: boolean;
    label?: string;
    topLanguages?: string[];
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    placeholder?: string;
    fullWidth?: boolean;
    variant?: "outlined" | "filled" | "standard";
    size?: "small" | "medium";
    required?: boolean;
    autoFocus?: boolean;
  }

  export interface ModeUploadFileProps {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    ext: string;
  }

  export interface FileUploadListProps {
    selectedFile:
      | File
      | ModeUploadFileProps
      | string
      | null
      | (File | ModeUploadFileProps | string)[];
    onUploadFileSelect: (
      file: File | ModeUploadFileProps | null | (File | ModeUploadFileProps)[],
    ) => void;
    title?: string;
    uploadText?: string;
    selectText?: string;
    multipleSelect?: boolean;
    multipleUpload?: boolean;
    loadList?: () =>
      | void
      | Promise<ModeUploadFileProps[]>
      | ModeUploadFileProps[];
    uploadFile?: ({
      method,
      body,
    }: {
      method: string;
      body: FormData;
    }) => any | Promise<any>;
    fileExtensions?: string[] | string;
    showExistingFiles?: boolean;
    showDeleteExistingFiles?: boolean;
    onFileUpload?:
      | ((event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>)
      | boolean
      | null;
    onExistingFileSelect?: (
      file: ModeUploadFileProps | null | ModeUploadFileProps[],
    ) => void;
    onDeleteExistingFile?: (file: ModeUploadFileProps | null) => void;
    onError?: (error: string | Error) => void;
  }

  export interface BackdropLoaderProps {
    open: boolean;
    message?: string;
    localized?: boolean;
    containerSx?: any;
    size?: number;
  }

  export interface CheckChipProps {
    label: React.ReactNode;
    checked?: boolean;
    defaultChecked?: boolean;
    indeterminate?: boolean;
    onChange?: (
      event: React.ChangeEvent<HTMLInputElement>,
      checked: boolean,
    ) => void;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    icon?: React.ReactElement;
    checkedIcon?: React.ReactElement;
    indeterminateIcon?: React.ReactElement;
    disabled?: boolean;
    size?: "small" | "medium";
    color?:
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "warning"
      | "info"
      | "success";
    sx?: any;
  }

  export interface DisconnectedProps {
    message?: string;
    onRetry?: () => void;
    sx?: any;
  }

  export interface ProcessStatusChipProps {
    status: string;
    label: string;
    color?:
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "warning"
      | "info"
      | "success";
    finalStatuses: string[];
    percentage?: number | null;
    showPercentage?: boolean;
    linearPercentagePlacement?: "left" | "right";
    placement?: "top" | "bottom" | "left" | "right";
    progressProps?: any;
    size?: "small" | "medium";
    sx?: any;
  }

  export interface SelectChipOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    endIcon?: React.ReactNode;
    tooltip?: React.ReactNode;
    rowSx?: any;
    color?: string;
    disabled?: boolean;
  }

  export interface SelectChipProps {
    selectedValues: string[];
    options: SelectChipOption[];
    onChange: (selectedValues: string[]) => void;
    onOptionReselect?: (value: string) => void;
    isLoading?: boolean;
    emptyLabel?: string;
    getDisplayText?: (
      selectedValues: string[],
      options: SelectChipOption[],
    ) => string;
    placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
    minMenuWidth?: number;
    disabled?: boolean;
    showApplyButton?: boolean;
    onMenuOpen?: () => void;
    onMenuClose?: () => void;
    error?: boolean;
    size?: "small" | "medium";
    color?:
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "warning"
      | "info"
      | "success";
    sx?: any;
    multiple?: boolean;
  }

  export interface SplitChipItem {
    label: React.ReactNode;
    color?: string;
    icon?: React.ReactNode;
    dividerColor?: string;
    customDivider?: React.ReactNode;
    onClick?: () => void;
    sx?: any;
  }

  export interface SplitChipProps {
    items: SplitChipItem[];
    variant?: "filled" | "outlined";
    size?: "small" | "medium";
    dividerColor?: string;
    dividerProps?: any;
    sx?: any;
  }

  export const BackdropLoader: React.FC<BackdropLoaderProps>;
  export const CheckChip: React.FC<CheckChipProps>;
  export const CountrySelect: React.FC<CountrySelectProps>;
  export const Disconnected: React.FC<DisconnectedProps>;
  export const LanguageSelect: React.FC<LanguageSelectProps>;
  export const FileUploadList: React.FC<FileUploadListProps>;
  export const ProcessStatusChip: React.FC<ProcessStatusChipProps>;
  export const SelectChip: React.FC<SelectChipProps>;
  export const SplitChip: React.FC<SplitChipProps>;

  // Helper functions
  export function getCountryByCode(code: string): any;
  export function getLanguageByCode(code: string): any;
  export function pathJoinUrl(...parts: string[]): string;
  export function isDev(): boolean;

  // CSV functions
  export function exportDataToCsv(options: {
    data: any[];
    fields: any[];
    filename: string;
  }): void;
  export function importCsvData(file: File, options?: any): Promise<any>;
  export function validateCsvFile(file: File, options?: any): any;

  // Date utilities
  export function formatDate(date: any, format: string): string;
  export function parseDate(dateString: string, format?: string): Date | null;
  export function addToDate(
    date: Date,
    amount: number,
    unit: string,
  ): Date | null;
  export function dateDifference(
    date1: Date,
    date2: Date,
    unit: string,
  ): number | null;
  export function isValidDate(date: any): boolean;
  export function getRelativeTime(date: Date, relativeTo?: Date): string;
  export function getTimezoneInfo(): any;
  export function isLeapYear(year: number): boolean;
  export function getDaysInMonth(year: number, month: number): number;
}

declare module "@user27828/shared-utils/utils" {
  export * from "@user27828/shared-utils/dist/utils";
}

declare module "@user27828/shared-utils/server" {
  export * from "@user27828/shared-utils/dist/server";
}
