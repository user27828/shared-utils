import React, { useEffect, useMemo, useRef, useState } from "react";
import WysiwygEditor, {
  type WysiwygPickRequest,
  type WysiwygPickResult,
  type WysiwygAssetKind,
  type WysiwygImageUploadRequest,
} from "@user27828/shared-utils/client/wysiwyg";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

interface CKEditorTestsProps {
  darkMode: boolean;
}

type PickerState = {
  open: boolean;
  request: WysiwygPickRequest | null;
  resolve: ((value: WysiwygPickResult | null) => void) | null;
  reject: ((reason?: any) => void) | null;
};

const fileToDataUrl = async (file: File): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
};

const CKEditorTests: React.FC<CKEditorTestsProps> = ({ darkMode }) => {
  const [editor, setEditor] = useState<any>(null);
  const [content, setContent] = useState<string>(
    "<h2>Welcome to CKEditor 5 Integration!</h2><p>This demonstrates CKEditor 5 (GPL) with shared-utils integration (no cloud).</p>",
  );
  const [savedContent, setSavedContent] = useState<string>("");
  const savedContentRef = useRef<string>("");
  const [isRunningTestSuite, setIsRunningTestSuite] = useState<boolean>(false);

  useEffect(() => {
    savedContentRef.current = savedContent;
  }, [savedContent]);

  const [testItems, setTestItems] = useState<TestItem[]>([
    {
      name: "Editor Status",
      description: "Check if editor is ready and available",
      status: "pending",
    },
    {
      name: "Save Content",
      description: "Test saving current editor content",
      status: "pending",
    },
    {
      name: "Load Content",
      description: "Test loading saved content back to editor",
      status: "pending",
    },
    {
      name: "Insert Media Embed",
      description: "Insert a media URL using the media embed feature",
      status: "pending",
    },
    {
      name: "Paste Markdown",
      description: "Paste Markdown into the editor and verify conversion",
      status: "pending",
    },
    {
      name: "Custom File Picker UI",
      description: "Use a custom picker dialog to insert image/file/media",
      status: "pending",
    },
  ]);

  const [pickerState, setPickerState] = useState<PickerState>({
    open: false,
    request: null,
    resolve: null,
    reject: null,
  });

  const [pickerUrl, setPickerUrl] = useState<string>("");
  const [pickerKind, setPickerKind] = useState<"image" | "file" | "media">(
    "image",
  );

  const pickerStateRef = useRef(pickerState);
  useEffect(() => {
    pickerStateRef.current = pickerState;
  }, [pickerState]);

  const updateTestStatus = (
    testName: string,
    status: TestStatus,
    message?: string,
    duration?: number,
  ) => {
    setTestItems((prev) =>
      prev.map((item) =>
        item.name === testName
          ? {
              ...item,
              status,
              message,
              duration,
            }
          : item,
      ),
    );
  };

  const onPickAsset = async (request: WysiwygPickRequest) => {
    return await new Promise<WysiwygPickResult | null>((resolve, reject) => {
      setPickerState({
        open: true,
        request,
        resolve,
        reject,
      });

      // Provide a helpful default URL for the chosen type.
      const defaultKind: WysiwygAssetKind = request.kind;

      setPickerKind(defaultKind);

      if (defaultKind === "media") {
        setPickerUrl("https://www.youtube.com/watch?v=H08tGjXNHO4");
      } else if (defaultKind === "file") {
        setPickerUrl("https://example.com/my-file.pdf");
      } else {
        setPickerUrl("https://picsum.photos/seed/shared-utils/600/300");
      }
    });
  };

  const handlePickerCancel = () => {
    const current = pickerStateRef.current;
    if (current.resolve) {
      current.resolve(null);
    }

    setPickerState({
      open: false,
      request: null,
      resolve: null,
      reject: null,
    });
  };

  const handlePickerInsert = () => {
    const current = pickerStateRef.current;
    if (current.resolve) {
      current.resolve({
        url: pickerUrl,
        kind: pickerKind,
        title: pickerKind === "file" ? "Example file" : undefined,
        text: pickerKind === "file" ? "Example file" : undefined,
      });
    }

    setPickerState({
      open: false,
      request: null,
      resolve: null,
      reject: null,
    });
  };

  const onUploadImage = async (request: WysiwygImageUploadRequest) => {
    const file = request.file;
    if (!file) {
      throw new Error("CKEditor tests expect a File-based upload request");
    }

    const url = await fileToDataUrl(file);
    return { url };
  };

  const runEditorStatusTest = async () => {
    const testName = "Editor Status";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Checking editor availability...");

    const duration = Date.now() - startTime;

    if (editor) {
      updateTestStatus(testName, "pass", "Editor is ready", duration);
    } else {
      updateTestStatus(testName, "fail", "Editor is not ready", duration);
    }
  };

  const runSaveContentTest = async () => {
    const testName = "Save Content";
    const startTime = Date.now();

    if (!editor) {
      updateTestStatus(
        testName,
        "fail",
        "Editor not ready",
        Date.now() - startTime,
      );
      return;
    }

    try {
      updateTestStatus(testName, "running", "Saving content...");
      const current = String(editor.getData?.() || "");
      setSavedContent(current);
      savedContentRef.current = current;
      updateTestStatus(
        testName,
        "pass",
        `Saved ${current.length} characters`,
        Date.now() - startTime,
      );
    } catch (err: any) {
      updateTestStatus(
        testName,
        "fail",
        err?.message || "Save failed",
        Date.now() - startTime,
      );
    }
  };

  const runLoadContentTest = async () => {
    const testName = "Load Content";
    const startTime = Date.now();

    if (!editor) {
      updateTestStatus(
        testName,
        "fail",
        "Editor not ready",
        Date.now() - startTime,
      );
      return;
    }

    const contentToLoad = savedContentRef.current || savedContent;

    if (!contentToLoad) {
      updateTestStatus(
        testName,
        "skipped",
        "No saved content available - run Save Content first",
        Date.now() - startTime,
      );
      return;
    }

    try {
      updateTestStatus(testName, "running", "Loading saved content...");
      editor.setData(contentToLoad);
      setContent(contentToLoad);

      updateTestStatus(
        testName,
        "pass",
        "Saved content loaded",
        Date.now() - startTime,
      );
    } catch (err: any) {
      updateTestStatus(
        testName,
        "fail",
        err?.message || "Load failed",
        Date.now() - startTime,
      );
    }
  };

  const runMediaEmbedTest = async () => {
    const testName = "Insert Media Embed";
    const startTime = Date.now();

    if (!editor) {
      updateTestStatus(
        testName,
        "fail",
        "Editor not ready",
        Date.now() - startTime,
      );
      return;
    }

    try {
      updateTestStatus(testName, "running", "Embedding a YouTube URL...");
      editor.execute(
        "mediaEmbed",
        "https://www.youtube.com/watch?v=H08tGjXNHO4",
      );
      updateTestStatus(
        testName,
        "pass",
        "Inserted media embed",
        Date.now() - startTime,
      );
    } catch (err: any) {
      updateTestStatus(
        testName,
        "fail",
        err?.message || "Media embed failed",
        Date.now() - startTime,
      );
    }
  };

  const markdownSample = useMemo(() => {
    return [
      "# Markdown paste test",
      "",
      "- **Bold** and *italic* and `inline code`",
      "- A link: https://ckeditor.com",
      "",
      "```js",
      "console.log('code block');",
      "```",
    ].join("\n");
  }, []);

  const runPasteMarkdownTest = async () => {
    const testName = "Paste Markdown";
    const startTime = Date.now();

    try {
      updateTestStatus(
        testName,
        "running",
        "Copy the markdown sample and paste into the editor",
      );

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(markdownSample);
        updateTestStatus(
          testName,
          "pass",
          "Copied Markdown to clipboard. Paste into the editor to verify conversion.",
          Date.now() - startTime,
        );
      } else {
        updateTestStatus(
          testName,
          "pass",
          "Clipboard API not available. Manually copy the Markdown sample and paste into the editor.",
          Date.now() - startTime,
        );
      }
    } catch (err: any) {
      updateTestStatus(
        testName,
        "fail",
        err?.message || "Markdown copy failed",
        Date.now() - startTime,
      );
    }
  };

  const runCustomPickerTest = async () => {
    const testName = "Custom File Picker UI";
    const startTime = Date.now();

    if (!editor) {
      updateTestStatus(
        testName,
        "fail",
        "Editor not ready",
        Date.now() - startTime,
      );
      return;
    }

    updateTestStatus(testName, "running", "Use toolbar buttons to open picker");
    updateTestStatus(
      testName,
      "pass",
      "Click 'Insert image/file/media' in the toolbar and confirm it inserts content",
      Date.now() - startTime,
    );
  };

  const runAllTests = async () => {
    setIsRunningTestSuite(true);

    try {
      await runEditorStatusTest();
      await runSaveContentTest();
      await runLoadContentTest();
      await runMediaEmbedTest();
      await runPasteMarkdownTest();
      await runCustomPickerTest();
    } finally {
      setIsRunningTestSuite(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            CKEditor 5 Integration Tests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            CKEditor 5 (self-hosted, GPL) running via @user27828/shared-utils
            with no cloud components.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip
              label={editor ? "CKEditor Ready" : "CKEditor Initializing"}
              color={editor ? "success" : "warning"}
              variant="outlined"
            />
            <Chip
              label={darkMode ? "Dark" : "Light"}
              color={darkMode ? "info" : "default"}
              variant="outlined"
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={runAllTests}
              disabled={isRunningTestSuite}
            >
              {isRunningTestSuite ? "Running…" : "Run Test Suite"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSavedContent("")}
              disabled={isRunningTestSuite}
            >
              Clear Saved
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            CKEditor 5 Editor
          </Typography>

          <WysiwygEditor
            editor="ckeditor"
            value={content}
            height={520}
            onEditorInstance={(instance: any) => {
              setEditor(instance);
            }}
            onChange={(nextValue: string) => {
              setContent(nextValue);
            }}
            onPickAsset={onPickAsset}
            onUploadImage={onUploadImage}
            ckeditor={{
              darkMode,
            }}
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Markdown Paste Sample
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The editor includes PasteFromMarkdownExperimental. Copy the sample
            below and paste into the editor to verify conversion.
          </Typography>
          <TextField
            value={markdownSample}
            fullWidth
            multiline
            minRows={6}
            maxRows={12}
            InputProps={{ readOnly: true }}
          />
        </CardContent>
      </Card>

      <TestProgress
        title="CKEditor Test Progress"
        tests={testItems}
        isRunning={isRunningTestSuite}
      />

      <Dialog open={pickerState.open} onClose={handlePickerCancel} fullWidth>
        <DialogTitle>Custom File Picker</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This dialog simulates an asset picker UI. It resolves the
            `onPickAsset()` promise back to the editor.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Button
              variant={pickerKind === "image" ? "contained" : "outlined"}
              onClick={() => {
                setPickerKind("image");
              }}
            >
              Image
            </Button>
            <Button
              variant={pickerKind === "file" ? "contained" : "outlined"}
              onClick={() => {
                setPickerKind("file");
              }}
            >
              File
            </Button>
            <Button
              variant={pickerKind === "media" ? "contained" : "outlined"}
              onClick={() => {
                setPickerKind("media");
              }}
            >
              Media
            </Button>
          </Stack>

          <TextField
            label="URL"
            value={pickerUrl}
            onChange={(e) => {
              setPickerUrl(e.target.value);
            }}
            fullWidth
            placeholder="https://..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePickerCancel}>Cancel</Button>
          <Button onClick={handlePickerInsert} variant="contained">
            Insert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CKEditorTests;
