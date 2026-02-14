/**
 * CMS Password Gate — shared-utils
 *
 * Generic password-unlock form for password-protected CMS content.
 * Accepts either a `CmsApi` instance (uses `publicUnlock`) or a
 * custom `onSubmitPassword` callback for full flexibility.
 */
import React, { useId, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
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

const CmsPasswordGate: React.FC<CmsPasswordGateProps> = ({
  postType,
  locale,
  slug,
  title,
  onUnlocked,
  api,
  onSubmitPassword,
}) => {
  const passwordId = useId();

  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const helperText = useMemo(() => {
    if (error) {
      return error;
    }
    return "Enter the password to view this content.";
  }, [error]);

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      let result: { kind: string; token?: string; message?: string };

      if (onSubmitPassword) {
        result = await onSubmitPassword(password);
      } else if (api) {
        result = await api.publicUnlock({ postType, locale, slug, password });
      } else {
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
    } catch (e: any) {
      setError(e?.message || "Unable to unlock content.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        {title || "Password required"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This content is protected.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} aria-live="polite">
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <TextField
          id={passwordId}
          label="Password"
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
          fullWidth
          autoComplete="current-password"
          disabled={isSubmitting}
          error={Boolean(error)}
          helperText={helperText}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !password.trim()}
          >
            Unlock
          </Button>

          {isSubmitting && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} />
              <Typography
                variant="body2"
                color="text.secondary"
                aria-live="polite"
              >
                Unlocking…
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default CmsPasswordGate;
