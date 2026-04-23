import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import type { EmailRenderWarnings } from "../../../../utils/src/email/types.js";
import EmailHtmlPreviewFrame from "./EmailHtmlPreviewFrame.js";
import EmailTextPreviewPanel from "./EmailTextPreviewPanel.js";

export interface EmailPreviewTabsProps {
  subject: string;
  html: string;
  text: string;
  warnings?: EmailRenderWarnings;
}

type PreviewTabValue = "html" | "text" | "rawHtml" | "rawText";

const TabPanel: React.FC<{
  active: PreviewTabValue;
  value: PreviewTabValue;
  children: React.ReactNode;
}> = ({ active, value, children }) => {
  if (active !== value) {
    return null;
  }

  return <Box sx={{ pt: 2 }}>{children}</Box>;
};

const EmailPreviewTabs: React.FC<EmailPreviewTabsProps> = ({
  subject,
  html,
  text,
  warnings,
}) => {
  const [tab, setTab] = useState<PreviewTabValue>("html");

  const warningChips = useMemo(() => {
    const chips: string[] = [];
    if (warnings?.missingExplicitTextRenderer) {
      chips.push("Generated text fallback");
    }
    if (warnings?.usedGeneratedText) {
      chips.push("Auto-derived plain text");
    }
    return chips;
  }, [warnings]);

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            Subject
          </Typography>
          <Typography variant="h6">{subject}</Typography>
          {warningChips.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {warningChips.map((warning) => (
                <Chip key={warning} label={warning} size="small" />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Paper>

      <Box>
        <Tabs
          value={tab}
          onChange={(_event, value: PreviewTabValue) => {
            setTab(value);
          }}
        >
          <Tab value="html" label="HTML Preview" />
          <Tab value="text" label="Plain Text" />
          <Tab value="rawHtml" label="Raw HTML" />
          <Tab value="rawText" label="Raw Text" />
        </Tabs>

        <TabPanel active={tab} value="html">
          <EmailHtmlPreviewFrame html={html} />
        </TabPanel>

        <TabPanel active={tab} value="text">
          <EmailTextPreviewPanel text={text} />
        </TabPanel>

        <TabPanel active={tab} value="rawHtml">
          <EmailTextPreviewPanel text={html} minHeight={520} />
        </TabPanel>

        <TabPanel active={tab} value="rawText">
          <EmailTextPreviewPanel text={text} minHeight={520} />
        </TabPanel>
      </Box>
    </Stack>
  );
};

export default EmailPreviewTabs;