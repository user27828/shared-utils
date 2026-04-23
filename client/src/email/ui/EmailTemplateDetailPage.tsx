import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
  EmailTemplateDetail,
  EmailTemplatePreviewResponse,
} from "../../../../utils/src/email/types.js";
import EmailPreviewTabs from "./EmailPreviewTabs.js";

export interface EmailTemplateDetailPageProps {
  template: EmailTemplateDetail | null;
  preview: EmailTemplatePreviewResponse | null;
  selectedFixtureUid: string | null;
  isLoading?: boolean;
  isSendingTest?: boolean;
  error?: Error | string | null;
  onBack?: () => void;
  onFixtureChange: (fixtureUid: string | null) => void;
  onSendTestEmail?: () => void;
}

const EmailTemplateDetailPage: React.FC<EmailTemplateDetailPageProps> = ({
  template,
  preview,
  selectedFixtureUid,
  isLoading = false,
  isSendingTest = false,
  error,
  onBack,
  onFixtureChange,
  onSendTestEmail,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {typeof error === "string" ? error : error.message}
      </Alert>
    );
  }

  if (!template || !preview) {
    return <Alert severity="info">No email template selected.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" gutterBottom>
            {template.name}
          </Typography>
          <Typography color="text.secondary">{template.uid}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {onBack ? (
            <Button variant="outlined" onClick={onBack}>
              Back
            </Button>
          ) : null}
          {onSendTestEmail ? (
            <Button
              variant="contained"
              onClick={onSendTestEmail}
              disabled={isSendingTest}
            >
              {isSendingTest ? "Queueing..." : "Send test email"}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={template.category} size="small" />
            {template.sendScenarios.map((scenario) => (
              <Chip key={scenario} label={scenario} size="small" variant="outlined" />
            ))}
          </Stack>
          <Typography color="text.secondary">{template.description}</Typography>
          <TextField
            select
            label="Preview fixture"
            value={selectedFixtureUid ?? preview.fixtureUid ?? ""}
            onChange={(event) => {
              onFixtureChange(event.target.value || null);
            }}
            sx={{ maxWidth: 360 }}
          >
            {template.previewFixtures.map((fixture) => (
              <MenuItem key={fixture.uid} value={fixture.uid}>
                {fixture.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <EmailPreviewTabs
        subject={preview.subject}
        html={preview.html}
        text={preview.text}
        warnings={preview.warnings}
      />
    </Stack>
  );
};

export default EmailTemplateDetailPage;