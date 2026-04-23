import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

export interface EmailHtmlPreviewFrameProps {
  html: string;
  title?: string;
  minHeight?: number;
}

const EmailHtmlPreviewFrame: React.FC<EmailHtmlPreviewFrameProps> = ({
  html,
  title = "Email HTML preview",
  minHeight = 520,
}) => {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        component="iframe"
        title={title}
        srcDoc={html}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        loading="lazy"
        sx={{
          width: "100%",
          minHeight,
          border: 0,
          display: "block",
          backgroundColor: "common.white",
        }}
      />
    </Paper>
  );
};

export default EmailHtmlPreviewFrame;