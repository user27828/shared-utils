import React, { useState, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  Chip,
} from "@mui/material";

interface TinyMCETestsProps {
  darkMode: boolean;
}

const TinyMCETests: React.FC<TinyMCETestsProps> = ({ darkMode }) => {
  const editorRef = useRef<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const [content, setContent] = useState<string>(
    "<h2>Welcome to TinyMCE Integration!</h2><p>This demonstrates TinyMCE with shared-utils integration.</p>",
  );
  const [savedContent, setSavedContent] = useState<string>("");
  const [testResults, setTestResults] = useState<
    Array<{ name: string; status: "pass" | "fail"; message: string }>
  >([]);

  const handleEditorChange = (content: string) => {
    setContent(content);
  };

  const saveContent = () => {
    if (editor) {
      try {
        const currentContent = editor.getContent();
        setSavedContent(currentContent);
        addTestResult(
          "Save Content",
          "pass",
          `Content saved successfully (${currentContent.length} characters)`,
        );
      } catch (error) {
        addTestResult(
          "Save Content",
          "fail",
          `Save failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      addTestResult("Save Content", "fail", "Editor not ready");
    }
  };

  const loadSavedContent = () => {
    if (savedContent && editor) {
      try {
        editor.setContent(savedContent);
        setContent(savedContent);
        addTestResult(
          "Load Content",
          "pass",
          "Saved content loaded successfully",
        );
      } catch (error) {
        addTestResult(
          "Load Content",
          "fail",
          `Load failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else if (!editor) {
      addTestResult("Load Content", "fail", "Editor not ready");
    } else {
      addTestResult("Load Content", "fail", "No saved content available");
    }
  };

  const insertSampleData = () => {
    if (editor) {
      try {
        const sampleData = `
        <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0; border-radius: 5px;">
          <h4>Sample Integration Data</h4>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Editor Status:</strong> Active and working</p>
          <p><strong>Integration:</strong> TinyMCE + Shared Utils</p>
          <p><strong>Random ID:</strong> ${Math.random().toString(36).substr(2, 9)}</p>
        </div>
      `;
        editor.insertContent(sampleData);
        addTestResult(
          "Insert Sample Data",
          "pass",
          "Sample data inserted successfully",
        );
      } catch (error) {
        addTestResult(
          "Insert Sample Data",
          "fail",
          `Insert failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      addTestResult("Insert Sample Data", "fail", "Editor not ready");
    }
  };

  const addTestResult = (
    name: string,
    status: "pass" | "fail",
    message: string,
  ) => {
    setTestResults((prev) => [...prev, { name, status, message }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testEditorAPI = () => {
    if (editor) {
      try {
        const currentContent = editor.getContent();
        const textContent = editor.getContent({ format: "text" });
        const hasContent = currentContent.length > 0;
        const wordCount = editor.plugins.wordcount
          ? editor.plugins.wordcount.getCount()
          : "N/A";

        addTestResult(
          "Editor API Test",
          "pass",
          `API working: ${hasContent ? "Has content" : "Empty"} (${currentContent.length} chars, ${textContent.length} text chars, ${wordCount} words)`,
        );
      } catch (error) {
        addTestResult(
          "Editor API Test",
          "fail",
          `API error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      addTestResult("Editor API Test", "fail", "Editor not ready");
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          TinyMCE Integration Tests
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          This section tests TinyMCE rich text editor integration with the
          shared-utils framework.
        </Typography>

        {/* Control Panel */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Button variant="contained" size="small" onClick={saveContent}>
              Save Content
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={loadSavedContent}
              disabled={!savedContent}
            >
              Load Saved ({savedContent ? "Available" : "None"})
            </Button>
            <Button variant="outlined" size="small" onClick={insertSampleData}>
              Insert Sample Data
            </Button>
            <Button variant="outlined" size="small" onClick={testEditorAPI}>
              Test API
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                addTestResult(
                  "Editor Status",
                  editor ? "pass" : "fail",
                  editor
                    ? "Editor is ready and available"
                    : "Editor not initialized yet",
                )
              }
            >
              Check Status
            </Button>
          </Box>
        </Stack>

        {/* TinyMCE Editor */}
        <Box sx={{ mb: 3 }}>
          <Editor
            ref={editorRef}
            value={content}
            onInit={(_, editor) => {
              setEditor(editor);
              addTestResult(
                "Editor Initialization",
                "pass",
                "TinyMCE editor initialized successfully",
              );
            }}
            onEditorChange={handleEditorChange}
            init={{
              height: 400,
              menubar: true,
              skin: darkMode ? "oxide-dark" : "oxide",
              content_css: darkMode ? "dark" : "default",
              base_url: "/tinymce",
              suffix: ".min",
              plugins: [
                "advlist",
                "autolink",
                "lists",
                "link",
                "image",
                "charmap",
                "preview",
                "anchor",
                "searchreplace",
                "visualblocks",
                "code",
                "fullscreen",
                "insertdatetime",
                "media",
                "table",
                "help",
                "wordcount",
              ],
              toolbar:
                "undo redo | blocks | " +
                "bold italic forecolor | alignleft aligncenter " +
                "alignright alignjustify | bullist numlist outdent indent | " +
                "removeformat | table | help",
              content_style:
                "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
            }}
          />
        </Box>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Typography variant="h6">Test Results</Typography>
              <Button size="small" onClick={clearResults}>
                Clear
              </Button>
            </Box>
            <Stack spacing={1}>
              {testResults.map((result, index) => (
                <Alert
                  key={index}
                  severity={result.status === "pass" ? "success" : "error"}
                  variant="outlined"
                >
                  <strong>{result.name}:</strong> {result.message}
                </Alert>
              ))}
            </Stack>
          </Box>
        )}

        {/* Integration Stats */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Integration Statistics
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={`${content.length} Characters in Editor`}
              color="secondary"
              size="small"
            />
            <Chip
              label={`${testResults.filter((r) => r.status === "pass").length} Tests Passed`}
              color="success"
              size="small"
            />
            {testResults.filter((r) => r.status === "fail").length > 0 && (
              <Chip
                label={`${testResults.filter((r) => r.status === "fail").length} Tests Failed`}
                color="error"
                size="small"
              />
            )}
            <Chip
              label={editor ? "TinyMCE Ready" : "TinyMCE Initializing"}
              color={editor ? "primary" : "warning"}
              size="small"
            />
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TinyMCETests;
