import { isValidEmail } from "../../../utils/index.js";
import { EmailError } from "./errors.js";
const EMAIL_CONTROL_CHARACTER_REGEX = /[\u0000-\u001F\u007F]/;
const trimToDefinedString = (value) => {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed;
};
export const extractEmailAddress = (value) => {
    const trimmed = trimToDefinedString(value);
    if (!trimmed) {
        return undefined;
    }
    const match = trimmed.match(/<([^<>]+)>/);
    return trimToDefinedString(match ? match[1] : trimmed);
};
export const normalizeEmailAddressValue = (email, fieldName = "email") => {
    const normalizedEmail = trimToDefinedString(email);
    if (!normalizedEmail) {
        throw new EmailError(`${fieldName} is required`, "EMAIL_ADDRESS_INVALID", {
            field: fieldName,
        });
    }
    if (EMAIL_CONTROL_CHARACTER_REGEX.test(normalizedEmail)) {
        throw new EmailError(`${fieldName} cannot contain control characters`, "EMAIL_ADDRESS_INVALID", { field: fieldName });
    }
    if (!isValidEmail(normalizedEmail, true)) {
        throw new EmailError(`${fieldName} must be a valid email address`, "EMAIL_ADDRESS_INVALID", { field: fieldName });
    }
    return normalizedEmail;
};
const normalizeEmailDisplayName = (name, fieldName = "name") => {
    const normalizedName = trimToDefinedString(name);
    if (!normalizedName) {
        return undefined;
    }
    if (EMAIL_CONTROL_CHARACTER_REGEX.test(normalizedName)) {
        throw new EmailError(`${fieldName} cannot contain control characters`, "EMAIL_ADDRESS_INVALID", { field: fieldName });
    }
    return normalizedName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};
export const normalizeEmailAddress = (address) => {
    const email = normalizeEmailAddressValue(address.email);
    const name = normalizeEmailDisplayName(address.name);
    if (!name) {
        return { email };
    }
    return {
        email,
        name,
    };
};
export const formatEmailAddress = (address) => {
    const normalizedAddress = normalizeEmailAddress(address);
    if (normalizedAddress.name) {
        return `"${normalizedAddress.name}" <${normalizedAddress.email}>`;
    }
    return normalizedAddress.email;
};
//# sourceMappingURL=address.js.map