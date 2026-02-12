"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCmsPassword = exports.hashCmsPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const BCRYPT_ROUNDS = 12;
const hashCmsPassword = async (password) => {
    const trimmed = String(password || "").trim();
    if (!trimmed) {
        return null;
    }
    return bcryptjs_1.default.hash(trimmed, BCRYPT_ROUNDS);
};
exports.hashCmsPassword = hashCmsPassword;
const verifyCmsPassword = async (password, hash) => {
    if (!password || !hash) {
        return false;
    }
    return bcryptjs_1.default.compare(password, hash);
};
exports.verifyCmsPassword = verifyCmsPassword;
//# sourceMappingURL=password.js.map