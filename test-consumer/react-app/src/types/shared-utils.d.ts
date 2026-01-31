// Custom type declarations for @user27828/shared-utils
// This file provides explicit type declarations for all subpath exports

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

  export const CountrySelect: React.FC<CountrySelectProps>;
  export const LanguageSelect: React.FC<LanguageSelectProps>;
  export const FileUploadList: React.FC<FileUploadListProps>;

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

// WYSIWYG Components - separate import path
declare module "@user27828/shared-utils/client/wysiwyg" {
  import React from "react";

  export type WysiwygEditorKind = "tinymce" | "ckeditor" | "easymde";
  export type WysiwygAssetKind = "file" | "image" | "media";

  export type WysiwygPickRequest = {
    value: string;
    kind: WysiwygAssetKind;
  };

  export type WysiwygPickResult = {
    url: string;
    title?: string;
    text?: string;
    alt?: string;
    kind?: WysiwygAssetKind;
  };

  export type WysiwygProgressFn = (percent: number) => void;

  export type WysiwygImageUploadRequest = {
    file?: File;
    blob?: Blob;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    progress?: WysiwygProgressFn;
  };

  export type WysiwygImageUploadResult = {
    url: string;
  };

  export type WysiwygChangeContext = {
    editor: WysiwygEditorKind;
    instance: any;
    rawEvent?: any;
  };

  export interface WysiwygEditorProps {
    editor?: WysiwygEditorKind;
    value?: string;
    readOnly?: boolean;
    height?: string | number;
    onChange?: (value: string, ctx: WysiwygChangeContext) => void;
    onEditorInstance?: (
      instance: any,
      ctx: { editor: WysiwygEditorKind },
    ) => void;
    onPickAsset?: (
      request: WysiwygPickRequest,
    ) => Promise<WysiwygPickResult | null>;
    onUploadImage?: (
      request: WysiwygImageUploadRequest,
    ) => Promise<WysiwygImageUploadResult>;
    canonicalizeUrl?: (url: string) => string;
    tinymce?: Record<string, any>;
    ckeditor?: Record<string, any>;
    easymde?: Record<string, any>;
    suspenseFallback?: React.ReactNode;
  }

  export const WysiwygEditor: React.FC<WysiwygEditorProps>;
  const _default: React.FC<WysiwygEditorProps>;
  export default _default;

  export interface TinyMceEditorProps {
    data?: string;
    onChange?: (event: any, editor: { getData: () => string }) => void;
    [key: string]: any;
  }

  export const TinyMceEditor: React.FC<TinyMceEditorProps>;

  export interface CKEditor5FilePickerMeta {
    filetype?: "file" | "image" | "media";
  }

  export interface CKEditor5PickRequest {
    value: string;
    meta: CKEditor5FilePickerMeta;
  }

  export interface CKEditor5PickResult {
    url: string;
    title?: string;
    text?: string;
    alt?: string;
    kind?: "file" | "image" | "media";
  }

  export interface CKEditor5ImageUploadRequest {
    file: File;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    progress?: (percent: number) => void;
  }

  export interface CKEditor5ImageUploadResult {
    url: string;
  }

  export interface CKEditor5ClassicProps {
    data?: string;
    onChange?: (event: any, editor: { getData: () => string }) => void;
    onEditorInstance?: (editor: any) => void;
    onPickFile?: (
      request: CKEditor5PickRequest,
    ) => Promise<CKEditor5PickResult | null>;
    onUploadImage?: (
      request: CKEditor5ImageUploadRequest,
    ) => Promise<CKEditor5ImageUploadResult>;
    canonicalizeUrl?: (url: string) => string;
    darkMode?: boolean;
    readOnly?: boolean;
    height?: string | number;
    config?: Record<string, any>;
    additionalPlugins?: any[];
  }

  export const CKEditor5Classic: React.FC<CKEditor5ClassicProps>;

  // MDXEditor types
  export interface MDXEditorMethods {
    getMarkdown: () => string;
    setMarkdown: (markdown: string) => void;
    insertMarkdown: (markdown: string) => void;
    focus: (
      callbackFn?: (() => void) | undefined,
      opts?: { defaultSelection?: "rootStart" | "rootEnd" },
    ) => void;
  }

  export interface MDXEditorImageUploadRequest {
    file: File;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }

  export interface MDXEditorImageUploadResult {
    url: string;
  }

  export interface MDXEditorComponentProps {
    data?: string;
    onChange?: (event: any, editor: { getData: () => string }) => void;
    onEditorInstance?: (editor: MDXEditorMethods) => void;
    onUploadImage?: (
      request: MDXEditorImageUploadRequest,
    ) => Promise<MDXEditorImageUploadResult>;
    canonicalizeUrl?: (url: string) => string;
    darkMode?: boolean;
    height?: string | number;
    imageAutocompleteSuggestions?: string[];
    showToolbar?: boolean;
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
  }

  export const MDXEditor: React.ForwardRefExoticComponent<
    MDXEditorComponentProps & React.RefAttributes<MDXEditorMethods>
  >;
}
