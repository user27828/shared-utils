import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CMS Password Gate — shared-utils
 *
 * Generic password-unlock form for password-protected CMS content.
 * Accepts either a `CmsApi` instance (uses `publicUnlock`) or a
 * custom `onSubmitPassword` callback for full flexibility.
 */
import { useId, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography, } from "@mui/material";
const CmsPasswordGate = ({ postType, locale, slug, title, onUnlocked, api, onSubmitPassword, }) => {
    const passwordId = useId();
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const helperText = useMemo(() => {
        if (error) {
            return error;
        }
        return "Enter the password to view this content.";
    }, [error]);
    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            let result;
            if (onSubmitPassword) {
                result = await onSubmitPassword(password);
            }
            else if (api) {
                result = await api.publicUnlock({ postType, locale, slug, password });
            }
            else {
                setError("No API instance or handler provided.");
                return;
            }
            if (result.kind === "ok" && result.token) {
                onUnlocked(result.token);
                return;
            }
            if (result.kind === "invalid_password") {
                setError("Incorrect password.");
                return;
            }
            if (result.kind === "not_found") {
                setError("Content not found.");
                return;
            }
            setError(result.message || "Unable to unlock content.");
        }
        catch (e) {
            setError(e?.message || "Unable to unlock content.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs(Paper, { elevation: 2, sx: { p: 3 }, children: [_jsx(Typography, { variant: "h5", sx: { mb: 1 }, children: title || "Password required" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "This content is protected." }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, "aria-live": "polite", children: error })), _jsxs(Box, { component: "form", onSubmit: (e) => {
                    e.preventDefault();
                    void handleSubmit();
                }, children: [_jsx(TextField, { id: passwordId, label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), fullWidth: true, autoComplete: "current-password", disabled: isSubmitting, error: Boolean(error), helperText: helperText }), _jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mt: 2 }, children: [_jsx(Button, { type: "submit", variant: "contained", disabled: isSubmitting || !password.trim(), children: "Unlock" }), isSubmitting && (_jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [_jsx(CircularProgress, { size: 18 }), _jsx(Typography, { variant: "body2", color: "text.secondary", "aria-live": "polite", children: "Unlocking\u2026" })] }))] })] })] }));
};
export default CmsPasswordGate;
