export interface CmsUnlockTokenClaims {
    typ: "cms_unlock";
    uid: string;
    post_type: string;
    locale: string;
    slug: string;
    pv: number;
    iat: number;
    exp: number;
}
export type CmsUnlockTokenVerifyResult = {
    ok: true;
    claims: CmsUnlockTokenClaims;
} | {
    ok: false;
    reason: string;
};
export interface CmsUnlockTokenUtils {
    sign(input: {
        uid: string;
        postType: string;
        locale: string;
        slug: string;
        passwordVersion: number;
        ttlSeconds?: number;
    }): {
        token: string;
        claims: CmsUnlockTokenClaims;
    };
    verify(input: {
        token: string;
        uid: string;
        postType: string;
        locale: string;
        slug: string;
        passwordVersion: number;
    }): CmsUnlockTokenVerifyResult;
}
/**
 * Create a CMS unlock token utility bound to a signing key.
 *
 * @param config.signingKey - The HMAC signing key (e.g., EXPRESS_SECRET_KEY).
 *    Throws on empty key.
 */
export declare const createCmsUnlockTokenUtils: (config: {
    signingKey: string;
}) => CmsUnlockTokenUtils;
//# sourceMappingURL=unlockToken.d.ts.map