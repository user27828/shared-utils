/**
 * CMS Unlock Token — shared-utils
 *
 * Generic HMAC-SHA256 unlock token utility for password-protected content.
 * The signing key is injectable (no hardcoded env dependency).
 *
 * Usage:
 *   const tokenUtils = createCmsUnlockTokenUtils({ signingKey: env.EXPRESS_SECRET_KEY });
 *   const { token } = tokenUtils.sign({ uid, postType, locale, slug, passwordVersion });
 *   const result = tokenUtils.verify({ token, uid, postType, locale, slug, passwordVersion });
 */
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────

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

export type CmsUnlockTokenVerifyResult =
  | { ok: true; claims: CmsUnlockTokenClaims }
  | { ok: false; reason: string };

export interface CmsUnlockTokenUtils {
  sign(input: {
    uid: string;
    postType: string;
    locale: string;
    slug: string;
    passwordVersion: number;
    ttlSeconds?: number;
  }): { token: string; claims: CmsUnlockTokenClaims };

  verify(input: {
    token: string;
    uid: string;
    postType: string;
    locale: string;
    slug: string;
    passwordVersion: number;
  }): CmsUnlockTokenVerifyResult;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const b64url = (buf: Buffer): string =>
  buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const b64urlJson = (obj: unknown): string =>
  b64url(Buffer.from(JSON.stringify(obj), "utf8"));

const timingSafeEqualStr = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
};

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Create a CMS unlock token utility bound to a signing key.
 *
 * @param config.signingKey - The HMAC signing key (e.g., EXPRESS_SECRET_KEY).
 *    Throws on empty key.
 */
export const createCmsUnlockTokenUtils = (config: {
  signingKey: string;
}): CmsUnlockTokenUtils => {
  const keyStr = String(config.signingKey || "");
  if (!keyStr) {
    throw new Error("signingKey is required for CMS unlock tokens");
  }
  const key = Buffer.from(keyStr, "utf8");

  const sign: CmsUnlockTokenUtils["sign"] = (input) => {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(
      60,
      Math.min(Number(input.ttlSeconds || 1800), 24 * 60 * 60),
    );

    const claims: CmsUnlockTokenClaims = {
      typ: "cms_unlock",
      uid: String(input.uid),
      post_type: String(input.postType),
      locale: String(input.locale),
      slug: String(input.slug),
      pv: Math.max(0, Number(input.passwordVersion || 0)),
      iat: now,
      exp: now + ttl,
    };

    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = b64urlJson(header);
    const encodedPayload = b64urlJson(claims);
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const sig = crypto
      .createHmac("sha256", key)
      .update(signingInput)
      .digest();

    const token = `${signingInput}.${b64url(sig)}`;
    return { token, claims };
  };

  const verify: CmsUnlockTokenUtils["verify"] = (input) => {
    const token = String(input.token || "").trim();
    if (!token) {
      return { ok: false, reason: "missing" };
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return { ok: false, reason: "format" };
    }

    const [h, p, s] = parts;
    const signingInput = `${h}.${p}`;

    const expectedSig = crypto
      .createHmac("sha256", key)
      .update(signingInput)
      .digest();
    const expected = b64url(expectedSig);

    if (!timingSafeEqualStr(expected, s)) {
      return { ok: false, reason: "signature" };
    }

    let claims: CmsUnlockTokenClaims;
    try {
      const base64 = p.replace(/-/g, "+").replace(/_/g, "/");
      const padLen = (4 - (base64.length % 4)) % 4;
      const padded = base64 + "=".repeat(padLen);
      const payloadJson = Buffer.from(padded, "base64").toString("utf8");
      claims = JSON.parse(payloadJson);
    } catch {
      return { ok: false, reason: "payload" };
    }

    if (!claims || claims.typ !== "cms_unlock") {
      return { ok: false, reason: "typ" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (!claims.exp || now >= Number(claims.exp)) {
      return { ok: false, reason: "expired" };
    }

    if (String(claims.uid) !== String(input.uid)) {
      return { ok: false, reason: "uid" };
    }
    if (String(claims.post_type) !== String(input.postType)) {
      return { ok: false, reason: "post_type" };
    }
    if (String(claims.locale) !== String(input.locale)) {
      return { ok: false, reason: "locale" };
    }
    if (String(claims.slug) !== String(input.slug)) {
      return { ok: false, reason: "slug" };
    }

    if (Number(claims.pv) !== Number(input.passwordVersion)) {
      return { ok: false, reason: "password_version" };
    }

    return { ok: true, claims };
  };

  return { sign, verify };
};
