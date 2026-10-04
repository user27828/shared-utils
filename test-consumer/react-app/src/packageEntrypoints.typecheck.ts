import type {
  CmsApi,
  CmsClientConfig,
} from "@user27828/shared-utils/cms/client/api";
import type { UseCmsPublicOptions } from "@user27828/shared-utils/cms/client/hooks";
import type {
  EmailTemplateClientConfig,
  EmailTemplateDetail,
} from "@user27828/shared-utils/email/client/api";
import type { UseEmailTemplatesOptions } from "@user27828/shared-utils/email/client/hooks";
import type {
  FmApi,
  FmClientConfig,
} from "@user27828/shared-utils/fm/client/api";
import type { UseFmListFilesParams } from "@user27828/shared-utils/fm/client/hooks";
import type { DebounceOptions } from "@user27828/shared-utils/client/debounce";
import type { CmsAdminUiConfig } from "@user27828/shared-utils/cms/client/ui";
import type { EasyMDEEditorProps } from "@user27828/shared-utils/client/wysiwyg/easymde";
import type { WysiwygEditorAdapterMap } from "@user27828/shared-utils/client/wysiwyg";
import type { ComponentProps } from "react";
import type CountrySelectWithHostData from "@user27828/shared-utils/client/components/form/CountrySelect/custom-data";
import type LanguageSelectWithHostData from "@user27828/shared-utils/client/components/form/LanguageSelect/custom-data";
import type { getCountryOptionsFromData } from "@user27828/shared-utils/client/countries/core";
import type { getLanguageOptionsFromData } from "@user27828/shared-utils/client/languages/core";
import type { CalendarEvent } from "@user27828/shared-utils/utils/calendar";

/** Compile-time fixture for public entrypoint declarations and subpath names. */
export type PublicEntrypointTypes = {
  cms: CmsApi | CmsClientConfig | UseCmsPublicOptions;
  email:
    EmailTemplateClientConfig | EmailTemplateDetail | UseEmailTemplatesOptions;
  fm: FmApi | FmClientConfig | UseFmListFilesParams;
  debounce: DebounceOptions;
};

/** Compile-time fixture for editor isolation and host-provided CMS adapters. */
export type EditorEntrypointTypes = {
  adapters: WysiwygEditorAdapterMap;
  easyMde: EasyMDEEditorProps;
  cms: CmsAdminUiConfig;
};

/** Host-supplied data paths and the split calendar API stay publicly typed. */
export type OptionalDataEntrypointTypes = {
  countryOptions: ReturnType<typeof getCountryOptionsFromData>;
  languageOptions: ReturnType<typeof getLanguageOptionsFromData>;
  countrySelectorProps: ComponentProps<typeof CountrySelectWithHostData>;
  languageSelectorProps: ComponentProps<typeof LanguageSelectWithHostData>;
  calendarEvent: CalendarEvent;
};

/** Schema-derived contracts can be imported without React/editor declarations. */
export type {
  CmsCreateRequest,
  CmsPublicPayload,
} from "@user27828/shared-utils/cms/types";
export type {
  FmUploadInitRequest,
  FmFileRow,
} from "@user27828/shared-utils/fm/types";
