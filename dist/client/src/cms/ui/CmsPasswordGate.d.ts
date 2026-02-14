/**
 * CMS Password Gate — shared-utils
 *
 * Generic password-unlock form for password-protected CMS content.
 * Accepts either a `CmsApi` instance (uses `publicUnlock`) or a
 * custom `onSubmitPassword` callback for full flexibility.
 */
import React from "react";
import type { CmsApi } from "../CmsApi.js";
export interface CmsPasswordGateProps {
    postType: string;
    locale: string;
    slug: string;
    /** Optional heading. Defaults to "Password required". */
    title?: string;
    /** Called on successful unlock with the bearer token. */
    onUnlocked: (token: string) => void;
    /**
     * CmsApi instance whose `publicUnlock` will be called.
     * Ignored when `onSubmitPassword` is provided.
     */
    api?: CmsApi;
    /**
     * Custom unlock handler. When provided, takes precedence over `api`.
     * Should return `{ kind: "ok"; token: string }` on success, or an
     * object with `kind` and `message` on failure.
     */
    onSubmitPassword?: (password: string) => Promise<{
        kind: string;
        token?: string;
        message?: string;
    }>;
}
declare const CmsPasswordGate: React.FC<CmsPasswordGateProps>;
export default CmsPasswordGate;
//# sourceMappingURL=CmsPasswordGate.d.ts.map