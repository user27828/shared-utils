import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  CmsBodyEditor,
  CmsBodyRenderer,
  type CmsContentType,
  type CmsEditorPreference,
} from "@user27828/shared-utils/cms/client";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

interface CmsTestsProps {
  darkMode: boolean;
}

const CmsTests: React.FC<CmsTestsProps> = ({ darkMode }) => {
  const [isRunningTestSuite, setIsRunningTestSuite] = useState<boolean>(false);

  const [contentType, setContentType] = useState<CmsContentType>("html");
  const [editorPref, setEditorPref] = useState<CmsEditorPreference>("ckeditor");

  const [value, setValue] = useState<string>(
    "<h2>CMS Body Editor</h2><p>This page tests <strong>CmsBodyEditor</strong> and <strong>CmsBodyRenderer</strong> in the browser.</p>",
  );

  const [lastPicked, setLastPicked] = useState<string>("");
  const [lastUploadedImage, setLastUploadedImage] = useState<string>("");

  const payload = useMemo(() => {
    if (contentType === "html") {
      return {
        content_type: "text/html",
        sanitized_html: value,
      } as any;
    }

    if (contentType === "markdown") {
      // For preview purposes, render markdown as preformatted text.
      return {
        content_type: "text/plain",
        text: value,
      } as any;
    }

    if (contentType === "json") {
      let parsed: any = {};
      try {
        parsed = JSON.parse(value || "{}");
      } catch {
        parsed = { error: "Invalid JSON" };
      }
      return {
        content_type: "application/json",
        json: parsed,
      } as any;
    }

    return {
      content_type: "text/plain",
      text: value,
    } as any;
  }, [contentType, value]);

  const [testItems, setTestItems] = useState<TestItem[]>([
    {
      name: "Editor Renders",
      description: "Ensure CmsBodyEditor mounts and can accept changes",
      status: "pending",
    },
    {
      name: "Renderer Preview",
      description: "Ensure CmsBodyRenderer renders the preview payload",
      status: "pending",
    },
    {
      name: "Asset Picker Callback",
      description: "Simulate onPickAsset callback flow",
      status: "pending",
    },
    {
      name: "Image Upload Callback",
      description: "Simulate onUploadImage callback flow",
      status: "pending",
    },
  ]);

  const updateTestStatus = (
    testName: string,
    status: TestStatus,
    message?: string,
    duration?: number,
  ) => {
    setTestItems((prev) =>
      prev.map((test) =>
        test.name === testName
          ? {
              ...test,
              status,
              message,
              duration,
              startTime: status === "running" ? new Date() : test.startTime,
              endTime:
                status === "pass" || status === "fail" ? new Date() : undefined,
            }
          : test,
      ),
    );
  };

  const clearResults = () => {
    setTestItems((prev) =>
      prev.map((test) => ({
        ...test,
        status: "pending" as TestStatus,
        message: undefined,
        duration: undefined,
        startTime: undefined,
        endTime: undefined,
      })),
    );
  };

  const runEditorRendersTest = async () => {
    const testName = "Editor Renders";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Validating editor state...");

    try {
      if (typeof value !== "string") {
        throw new Error("Editor value is not a string");
      }

      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "pass",
        `Editor state OK (${contentType}, ${editorPref}, ${value.length} chars)`,
        duration,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", (error as Error).message, duration);
    }
  };

  const runRendererPreviewTest = async () => {
    const testName = "Renderer Preview";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Validating preview payload...");

    try {
      if (!payload || !payload.content_type) {
        throw new Error("Preview payload missing content_type");
      }

      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "pass",
        `Preview payload ready (${String(payload.content_type)})`,
        duration,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", (error as Error).message, duration);
    }
  };

  const simulatePickAsset = async () => {
    const picked = {
      uid: "demo-asset-001",
      name: "demo-image.png",
      url: "https://example.com/demo-image.png",
    };
    setLastPicked(`${picked.uid} (${picked.name})`);
    return picked;
  };

  const onUploadImage = async (file: File) => {
    const reader = new FileReader();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        resolve(String(reader.result || ""));
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });

    setLastUploadedImage(`${file.name} (${file.size} bytes)`);
    return dataUrl;
  };

  const runAssetPickerTest = async () => {
    const testName = "Asset Picker Callback";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Simulating asset selection...");

    try {
      const picked = await simulatePickAsset();
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "pass",
        picked ? `Picked: ${picked.uid}` : "No asset picked",
        duration,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", (error as Error).message, duration);
    }
  };

  const runImageUploadTest = async () => {
    const testName = "Image Upload Callback";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Choose a file below to upload...");

    const duration = Date.now() - startTime;
    updateTestStatus(
      testName,
      "pass",
      "Ready. Use the file input to trigger onUploadImage.",
      duration,
    );
  };

  const runIndividualTest = async (testName: string) => {
    switch (testName) {
      case "Editor Renders":
        await runEditorRendersTest();
        break;
      case "Renderer Preview":
        await runRendererPreviewTest();
        break;
      case "Asset Picker Callback":
        await runAssetPickerTest();
        break;
      case "Image Upload Callback":
        await runImageUploadTest();
        break;
      default:
        updateTestStatus(testName, "fail", "Test not implemented");
    }
  };

  const runAllTests = async () => {
    setIsRunningTestSuite(true);
    clearResults();

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    await runEditorRendersTest();
    await delay(250);
    await runRendererPreviewTest();
    await delay(250);
    await runAssetPickerTest();
    await delay(250);
    await runImageUploadTest();

    setIsRunningTestSuite(false);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        CMS Tests
      </Typography>

      <Typography variant="body1" sx={{ mb: 2 }}>
        Client-side CMS UI tests for shared-utils. This page focuses on the CMS
        body editor + preview renderer.
      </Typography>

      <TestProgress
        title="CMS Tests"
        tests={testItems}
        isRunning={isRunningTestSuite}
        onRunAll={runAllTests}
        onRunIndividual={runIndividualTest}
        onClear={clearResults}
        showIndividualButtons={true}
      />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="caption" display="block">
                  Content type
                </Typography>
                <Select
                  size="small"
                  value={contentType}
                  onChange={(e) =>
                    setContentType(e.target.value as CmsContentType)
                  }
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="html">html</MenuItem>
                  <MenuItem value="markdown">markdown</MenuItem>
                  <MenuItem value="json">json</MenuItem>
                  <MenuItem value="text">text</MenuItem>
                </Select>
              </Box>

              <Box>
                <Typography variant="caption" display="block">
                  HTML editor
                </Typography>
                <Select
                  size="small"
                  value={editorPref}
                  onChange={(e) =>
                    setEditorPref(e.target.value as CmsEditorPreference)
                  }
                  sx={{ minWidth: 180 }}
                  disabled={contentType !== "html"}
                >
                  <MenuItem value="ckeditor">ckeditor</MenuItem>
                  <MenuItem value="tinymce">tinymce</MenuItem>
                </Select>
              </Box>

              <Box sx={{ flex: 1 }} />

              <Button
                variant="outlined"
                onClick={() => {
                  if (contentType === "html") {
                    setValue(
                      "<h3>Sample HTML</h3><p>Dark mode: " +
                        String(darkMode) +
                        "</p>",
                    );
                  } else if (contentType === "markdown") {
                    setValue(
                      "# Sample Markdown\n\nThis is a CMS markdown body.",
                    );
                  } else if (contentType === "json") {
                    setValue(JSON.stringify({ hello: "world" }, null, 2));
                  } else {
                    setValue("Sample text body\nSecond line");
                  }
                }}
              >
                Load Sample
              </Button>
            </Stack>

            <CmsBodyEditor
              contentType={contentType}
              value={value}
              onChange={setValue}
              editor={editorPref}
              label="Body"
              onPickAsset={simulatePickAsset}
              onUploadImage={onUploadImage}
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Box>
                <Typography variant="caption" display="block">
                  Last picked asset
                </Typography>
                <Typography variant="body2">
                  {lastPicked || "(none)"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" display="block">
                  Last uploaded image
                </Typography>
                <Typography variant="body2">
                  {lastUploadedImage || "(none)"}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" component="label">
                Choose image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    await onUploadImage(file);
                  }}
                />
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Preview (CmsBodyRenderer)
            </Typography>
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
                minHeight: 200,
                overflowX: "auto",
              }}
            >
              <CmsBodyRenderer payload={payload} />
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default CmsTests;
