import React, { useState } from "react";
import { Card, CardContent, Typography, Button, Stack } from "@mui/material";

// Example of using the new WYSIWYG import pattern
const loadWysiwygComponents = async () => {
  try {
    const { TinyMceEditor, TinyMceBundle } = await import(
      "@user27828/shared-utils/client/wysiwyg"
    );
    return { TinyMceEditor, TinyMceBundle };
  } catch (error) {
    console.warn("WYSIWYG components not available:", error);
    return null;
  }
};

const WysiwygTestExample: React.FC = () => {
  const [content, setContent] = useState(
    "<p>Testing the new WYSIWYG import pattern!</p>",
  );
  const [Components, setComponents] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLoadComponents = async () => {
    setLoading(true);
    const components = await loadWysiwygComponents();
    setComponents(components);
    setLoading(false);
  };

  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          WYSIWYG Import Test
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This demonstrates the new separate import path for WYSIWYG components.
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="contained"
            onClick={handleLoadComponents}
            disabled={loading || !!Components}
          >
            {loading
              ? "Loading..."
              : Components
                ? "Components Loaded"
                : "Load WYSIWYG Components"}
          </Button>

          {Components && (
            <div>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                TinyMCE Editor Loaded Successfully!
              </Typography>
              <Components.TinyMceEditor
                data={content}
                onChange={(value: string) => setContent(value)}
              />
            </div>
          )}

          {!Components && !loading && (
            <Typography variant="body2" color="info.main">
              Click the button to dynamically load WYSIWYG components from the
              new import path.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default WysiwygTestExample;
