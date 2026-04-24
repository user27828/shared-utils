export interface EmailAddressLike {
    email: string;
    name?: string;
}
export declare const extractEmailAddress: (value: unknown) => string | undefined;
export declare const normalizeEmailAddressValue: (email: unknown, fieldName?: string) => string;
export declare const normalizeEmailAddress: (address: EmailAddressLike) => EmailAddressLike;
export declare const formatEmailAddress: (address: EmailAddressLike) => string;
//# sourceMappingURL=address.d.ts.map