import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

export interface EmailTextPreviewPanelProps {
  text: string;
  minHeight?: number;
}

const EmailTextPreviewPanel: React.FC<EmailTextPreviewPanelProps> = ({
  text,
  minHeight = 320,
}) => {
  return (
    <Paper variant="outlined">
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          minHeight,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "Monaco, Menlo, Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {text}
      </Box>
    </Paper>
  );
};

export default EmailTextPreviewPanel;