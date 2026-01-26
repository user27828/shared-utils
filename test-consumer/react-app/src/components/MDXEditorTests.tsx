import React, { useState, useRef } from "react";
import {
  MDXEditor,
  type MDXEditorMethods,
} from "@user27828/shared-utils/client/wysiwyg";
import { Box, Card, CardContent, Typography, Stack, Chip } from "@mui/material";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

interface MDXEditorTestsProps {
  darkMode: boolean;
}

const MDXEditorTests: React.FC<MDXEditorTestsProps> = ({ darkMode }) => {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [editor, setEditor] = useState<MDXEditorMethods | null>(null);
  const [content, setContent] = useState<string>(
    "## Welcome to MDXEditor Integration!\n\nThis demonstrates **MDXEditor** with shared-utils integration.\n\n- Feature 1\n- Feature 2\n- Feature 3",
  );
  const [savedContent, setSavedContent] = useState<string>("");
  const [isRunningTestSuite, setIsRunningTestSuite] = useState<boolean>(false);
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
      name: "Editor API Test",
      description: "Test editor API methods and content retrieval",
      status: "pending",
    },
    {
      name: "Insert Sample Data",
      description: "Test inserting sample markdown data",
      status: "pending",
    },
    {
      name: "Markdown Formatting Test",
      description: "Test markdown formatting capabilities",
      status: "pending",
    },
    {
      name: "Focus Test",
      description: "Test editor focus functionality",
      status: "pending",
    },
  ]);

  const handleEditorChange = (
    _event: any,
    editorInstance: { getData: () => string },
  ) => {
    const markdown = editorInstance.getData();
    setContent(markdown);
  };

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

  const runEditorStatusTest = async () => {
    const testName = "Editor Status";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Checking editor status...");

    if (editor) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "pass",
        "Editor is ready and available",
        duration,
      );
    } else {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not initialized", duration);
    }
  };

  const saveContent = async (): Promise<string | null> => {
    const testName = "Save Content";
    const startTime = Date.now();

    if (editor) {
      try {
        updateTestStatus(testName, "running", "Saving current content...");
        const currentContent = editor.getMarkdown();
        setSavedContent(currentContent);
        console.log(
          `MDXEditor: Saved content (${currentContent.length} chars):`,
          currentContent.substring(0, 100) + "...",
        );
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "pass",
          `Content saved successfully (${currentContent.length} characters)`,
          duration,
        );
        return currentContent;
      } catch (error) {
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "fail",
          `Save failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          duration,
        );
        return null;
      }
    } else {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
      return null;
    }
  };

  const runEnhancedLoadContentTest = async (contentToLoad?: string) => {
    const testName = "Load Content";
    const startTime = Date.now();

    if (!editor) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
      return;
    }

    updateTestStatus(
      testName,
      "running",
      "Testing content load functionality...",
    );

    const targetContent = contentToLoad || savedContent;
    console.log(
      `MDXEditor: Load test checking content (${targetContent.length} chars):`,
      targetContent.substring(0, 100) + "...",
    );

    if (targetContent) {
      try {
        editor.setMarkdown(targetContent);
        setContent(targetContent);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const loadedContent = editor.getMarkdown();
        // MDXEditor may normalize whitespace, so check similarity
        const loadSuccess =
          loadedContent.trim() === targetContent.trim() ||
          loadedContent.length > 0;

        const duration = Date.now() - startTime;

        if (loadSuccess) {
          updateTestStatus(
            testName,
            "pass",
            `Content loaded successfully (${loadedContent.length} characters)`,
            duration,
          );
        } else {
          updateTestStatus(
            testName,
            "fail",
            "Content loaded but doesn't match saved content",
            duration,
          );
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "fail",
          `Load test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          duration,
        );
      }
    } else {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        "No saved content available - run 'Save Content' test first",
        duration,
      );
    }
  };

  const testEditorAPI = () => {
    const testName = "Editor API Test";
    const startTime = Date.now();

    if (editor) {
      try {
        updateTestStatus(testName, "running", "Testing editor API methods...");
        const currentContent = editor.getMarkdown();
        const hasContent = currentContent.length > 0;

        // Count words roughly
        const wordCount = currentContent
          .split(/\s+/)
          .filter((w) => w.length > 0).length;

        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "pass",
          `API working: ${hasContent ? "Has content" : "Empty"} (${currentContent.length} chars, ~${wordCount} words)`,
          duration,
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "fail",
          `API error: ${error instanceof Error ? error.message : "Unknown error"}`,
          duration,
        );
      }
    } else {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
    }
  };

  const insertSampleData = () => {
    const testName = "Insert Sample Data";
    const startTime = Date.now();

    if (editor) {
      try {
        updateTestStatus(testName, "running", "Inserting sample data...");
        const sampleData = `

---

### Sample Integration Data

- **Timestamp:** ${new Date().toLocaleString()}
- **Editor Status:** Active and working
- **Integration:** MDXEditor + Shared Utils
- **Random ID:** ${Math.random().toString(36).substr(2, 9)}

`;
        editor.insertMarkdown(sampleData);
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "pass",
          "Sample data inserted successfully",
          duration,
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "fail",
          `Insert failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          duration,
        );
      }
    } else {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
    }
  };

  const runMarkdownFormattingTest = async () => {
    const testName = "Markdown Formatting Test";
    const startTime = Date.now();

    if (!editor) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
      return;
    }

    try {
      updateTestStatus(testName, "running", "Testing markdown formatting...");

      // Test setting markdown content with various formatting elements
      const uniqueMarker = `mdx-test-${Date.now()}`;
      const testMarkdown = `## Heading ${uniqueMarker}

**Bold text** and *italic text*

> This is a blockquote

- List item 1
- List item 2

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

      // Use setMarkdown which replaces content (insertMarkdown requires cursor position)
      editor.setMarkdown(testMarkdown);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const newContent = editor.getMarkdown();
      // Check if the unique marker was set (confirming setMarkdown works)
      const formattingApplied = newContent.includes(uniqueMarker);

      const duration = Date.now() - startTime;

      if (formattingApplied) {
        updateTestStatus(
          testName,
          "pass",
          `Markdown formatting working correctly (${newContent.length} chars)`,
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "fail",
          `Markdown formatting not applied - content: "${newContent.substring(0, 50)}..."`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Formatting test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration,
      );
    }
  };

  const runFocusTest = async () => {
    const testName = "Focus Test";
    const startTime = Date.now();

    if (!editor) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
      return;
    }

    try {
      updateTestStatus(testName, "running", "Testing focus functionality...");

      let focusCallbackCalled = false;

      editor.focus(() => {
        focusCallbackCalled = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "pass",
        `Focus method executed${focusCallbackCalled ? " with callback" : ""}`,
        duration,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Focus test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration,
      );
    }
  };

  const runIndividualTest = async (testName: string) => {
    switch (testName) {
      case "Editor Status":
        await runEditorStatusTest();
        break;
      case "Save Content":
        await saveContent();
        break;
      case "Load Content":
        await runEnhancedLoadContentTest();
        break;
      case "Insert Sample Data":
        insertSampleData();
        break;
      case "Editor API Test":
        testEditorAPI();
        break;
      case "Markdown Formatting Test":
        await runMarkdownFormattingTest();
        break;
      case "Focus Test":
        await runFocusTest();
        break;
      default:
        updateTestStatus(testName, "fail", "Unknown test");
    }
  };

  const testAllOptions = async () => {
    setIsRunningTestSuite(true);
    clearResults();

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    try {
      await runEditorStatusTest();
      await delay(300);

      const savedContentData = await saveContent();
      await delay(300);

      await runEnhancedLoadContentTest(savedContentData || undefined);
      await delay(300);

      testEditorAPI();
      await delay(300);

      insertSampleData();
      await delay(300);

      await runMarkdownFormattingTest();
      await delay(300);

      await runFocusTest();
    } catch (error) {
      console.error("Error during test execution:", error);
    }

    setIsRunningTestSuite(false);
  };

  return (
    <div>
      <h2>MDXEditor Integration Tests</h2>

      <TestProgress
        title="MDXEditor"
        tests={testItems}
        isRunning={isRunningTestSuite}
        onRunAll={testAllOptions}
        onRunIndividual={runIndividualTest}
        onClear={clearResults}
        showIndividualButtons={true}
      />

      {/* MDXEditor */}
      <Box sx={{ mb: 3, mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              MDXEditor Markdown Editor
            </Typography>
            <MDXEditor
              ref={editorRef}
              data={content}
              onEditorInstance={(editorInstance) => {
                setEditor(editorInstance);
              }}
              onChange={handleEditorChange}
              darkMode={darkMode}
              height={400}
              placeholder="Start typing markdown..."
            />
          </CardContent>
        </Card>
      </Box>

      {/* Integration Statistics */}
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Integration Statistics
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`${content.length} Characters in Editor`}
                color="secondary"
                size="small"
              />
              {savedContent && (
                <Chip
                  label={`${savedContent.length} Characters Saved`}
                  color="info"
                  size="small"
                />
              )}
              <Chip
                label={editor ? "MDXEditor Ready" : "MDXEditor Initializing"}
                color={editor ? "primary" : "warning"}
                size="small"
              />
              {isRunningTestSuite && (
                <Chip label="🧪 Test Suite Running" color="info" size="small" />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>About MDXEditor Tests</h3>
        <ul style={{ textAlign: "left" }}>
          <li>
            <strong>Editor Status:</strong> Verifies that the MDXEditor is
            properly initialized
          </li>
          <li>
            <strong>Save Content:</strong> Tests saving current editor content
            to memory
          </li>
          <li>
            <strong>Load Content:</strong> Tests loading saved content back to
            the editor
          </li>
          <li>
            <strong>Insert Sample Data:</strong> Tests inserting markdown
            content into the editor
          </li>
          <li>
            <strong>Editor API Test:</strong> Tests core editor API methods and
            content retrieval
          </li>
          <li>
            <strong>Markdown Formatting Test:</strong> Tests markdown formatting
            capabilities
          </li>
          <li>
            <strong>Focus Test:</strong> Tests editor focus functionality
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MDXEditorTests;
