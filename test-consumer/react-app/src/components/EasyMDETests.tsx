import React, { useEffect, useRef, useState } from "react";
import WysiwygEditor, {
  type WysiwygAssetKind,
  type WysiwygPickRequest,
  type WysiwygPickResult,
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
import { TestProgress, type TestItem } from "./TestProgress";

interface EasyMDETestsProps {
  darkMode: boolean;
}

type PickerState = {
  open: boolean;
  request: WysiwygPickRequest | null;
  resolve: ((value: WysiwygPickResult | null) => void) | null;
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

const EasyMDETests: React.FC<EasyMDETestsProps> = ({ darkMode }) => {
  const [editor, setEditor] = useState<any>(null);
  const [content, setContent] = useState<string>(
    "# EasyMDE Integration\n\nThis demonstrates **EasyMDE** via the unified `WysiwygEditor` export.\n\nTry the toolbar buttons: Image / File / Media (media is inserted as a plain link).",
  );
  const [savedContent, setSavedContent] = useState<string>("");
  const savedContentRef = useRef<string>("");
  const [isRunningTestSuite, setIsRunningTestSuite] = useState<boolean>(false);

  const [pickerState, setPickerState] = useState<PickerState>({
    open: false,
    request: null,
    resolve: null,
  });

  const pickerStateRef = useRef(pickerState);
  useEffect(() => {
    pickerStateRef.current = pickerState;
  }, [pickerState]);

  const [pickerKind, setPickerKind] = useState<WysiwygAssetKind>("image");
  const [pickerUrl, setPickerUrl] = useState<string>(
    "https://picsum.photos/seed/shared-utils/600/300",
  );

  const [testItems, setTestItems] = useState<TestItem[]>([
    {
      name: "Editor Status",
      description: "Check if editor instance is ready",
      status: "pending",
    },
    {
      name: "Save Content",
      description: "Save current markdown value",
      status: "pending",
    },
    {
      name: "Load Content",
      description: "Load saved markdown back into the editor",
      status: "pending",
    },
    {
      name: "Programmatic Insert",
      description: "Insert markdown using the EasyMDE instance API",
      status: "pending",
    },
  ]);

  const updateTestStatus = (
    testName: string,
    status: TestItem["status"],
    message?: string,
    duration?: number,
  ) => {
    setTestItems((prev) =>
      prev.map((item) => {
        if (item.name !== testName) {
          return item;
        }

        return {
          ...item,
          status,
          message,
          duration,
        };
      }),
    );
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
      updateTestStatus(testName, "fail", "Editor not ready");
      return;
    }

    updateTestStatus(testName, "running", "Saving markdown...");

    const current = String(editor.value?.() || "");
    savedContentRef.current = current;
    setSavedContent(current);

    const duration = Date.now() - startTime;
    updateTestStatus(
      testName,
      "pass",
      `Saved ${current.length} characters`,
      duration,
    );
  };

  const runLoadContentTest = async () => {
    const testName = "Load Content";
    const startTime = Date.now();

    if (!editor) {
      updateTestStatus(testName, "fail", "Editor not ready");
      return;
    }

    const saved = savedContentRef.current;
    if (!saved) {
      updateTestStatus(testName, "fail", "No saved content");
      return;
    }

    updateTestStatus(testName, "running", "Loading markdown...");

    editor.value(saved);

    const duration = Date.now() - startTime;
    updateTestStatus(testName, "pass", "Loaded saved content", duration);
  };

  const runProgrammaticInsertTest = async () => {
    const testName = "Programmatic Insert";
    const startTime = Date.now();

    if (!editor) {
      updateTestStatus(testName, "fail", "Editor not ready");
      return;
    }

    updateTestStatus(testName, "running", "Inserting markdown...");

    const cm = editor.codemirror;
    if (!cm) {
      updateTestStatus(testName, "fail", "CodeMirror missing");
      return;
    }

    cm.replaceSelection(
      "\n\n---\n\nInserted via EasyMDE API at " + new Date().toISOString(),
    );

    const duration = Date.now() - startTime;
    updateTestStatus(testName, "pass", "Inserted markdown", duration);
  };

  const clearResults = () => {
    setTestItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: "pending",
        message: undefined,
        duration: undefined,
      })),
    );
  };

  const runAllTests = async () => {
    if (isRunningTestSuite) {
      return;
    }

    setIsRunningTestSuite(true);
    clearResults();

    try {
      await runEditorStatusTest();
      await runSaveContentTest();
      await runProgrammaticInsertTest();
      await runLoadContentTest();
    } catch (err) {
      console.error("EasyMDE test suite error", err);
    }

    setIsRunningTestSuite(false);
  };

  const onPickAsset = async (request: WysiwygPickRequest) => {
    return await new Promise<WysiwygPickResult | null>((resolve) => {
      setPickerState({
        open: true,
        request,
        resolve,
      });

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
        alt: pickerKind === "image" ? "Example image" : undefined,
      });
    }

    setPickerState({
      open: false,
      request: null,
      resolve: null,
    });
  };

  const onUploadImage = async (request: WysiwygImageUploadRequest) => {
    const file = request.file;
    if (!file) {
      throw new Error("EasyMDE upload expects a File-based upload request");
    }

    const url = await fileToDataUrl(file);
    return { url };
  };

  return (
    <div>
      <h2>EasyMDE Integration Tests</h2>

      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={darkMode ? "Dark" : "Light"}
            color={darkMode ? "info" : "default"}
            variant="outlined"
          />
          <Chip
            label={editor ? "EasyMDE Ready" : "EasyMDE Initializing"}
            color={editor ? "primary" : "warning"}
            size="small"
          />
          <Chip
            label={`${content.length} Characters`}
            color="secondary"
            size="small"
          />
          {savedContent && (
            <Chip
              label={`${savedContent.length} Saved`}
              color="info"
              size="small"
            />
          )}
        </Stack>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            EasyMDE Markdown Editor
          </Typography>

          <WysiwygEditor
            editor="easymde"
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
            easymde={{
              options: {
                status: false,
                spellChecker: false,
              },
            }}
          />

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
              onClick={() => {
                savedContentRef.current = "";
                setSavedContent("");
              }}
              disabled={isRunningTestSuite}
            >
              Clear Saved
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <TestProgress
        title="EasyMDE Test Progress"
        tests={testItems}
        isRunning={isRunningTestSuite}
      />

      <Dialog open={pickerState.open} onClose={handlePickerCancel} fullWidth>
        <DialogTitle>Custom Asset Picker</DialogTitle>
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
          <Button variant="contained" onClick={handlePickerInsert}>
            Insert
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EasyMDETests;
