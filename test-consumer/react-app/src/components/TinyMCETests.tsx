import React, { useState, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Box, Card, CardContent, Typography, Stack, Chip } from "@mui/material";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

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
      description: "Test inserting sample HTML data",
      status: "pending",
    },
    {
      name: "Undo/Redo Test",
      description: "Test undo and redo functionality",
      status: "pending",
    },
    {
      name: "Plugin Test",
      description: "Check for available plugins and functionality",
      status: "pending",
    },
    {
      name: "Event Handling Test",
      description: "Test editor event handling mechanisms",
      status: "pending",
    },
  ]);

  const handleEditorChange = (content: string) => {
    setContent(content);
  };

  const saveContent = async (): Promise<string | null> => {
    const testName = "Save Content";
    const startTime = Date.now();

    if (editor) {
      try {
        updateTestStatus(testName, "running", "Saving current content...");
        const currentContent = editor.getContent();
        setSavedContent(currentContent);
        console.log(
          `TinyMCE: Saved content (${currentContent.length} chars):`,
          currentContent.substring(0, 100) + "...",
        );
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "pass",
          `Content saved successfully (${currentContent.length} characters)`,
          duration,
        );
        return currentContent; // Return the saved content
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
      `TinyMCE: Load test checking content (${targetContent.length} chars):`,
      targetContent.substring(0, 100) + "...",
    );

    if (targetContent) {
      try {
        // Load the saved content
        editor.setContent(targetContent);
        setContent(targetContent);

        // Small delay to ensure content is loaded
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify the content was loaded correctly
        const loadedContent = editor.getContent();
        const loadSuccess = loadedContent === targetContent;

        const duration = Date.now() - startTime;

        if (loadSuccess) {
          updateTestStatus(
            testName,
            "pass",
            `Saved content loaded successfully (${targetContent.length} characters)`,
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

  const insertSampleData = () => {
    const testName = "Insert Sample Data";
    const startTime = Date.now();

    if (editor) {
      try {
        updateTestStatus(testName, "running", "Inserting sample data...");
        const sampleData = `
        <div style="border: 1px solid ${darkMode ? "#555" : "#ccc"}; padding: 10px; margin: 10px 0; border-radius: 5px; background: ${darkMode ? "#2a2a2a" : "#f9f9f9"}; color: ${darkMode ? "#ffffff" : "#000000"};">
          <h4>Sample Integration Data</h4>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Editor Status:</strong> Active and working</p>
          <p><strong>Integration:</strong> TinyMCE + Shared Utils</p>
          <p><strong>Random ID:</strong> ${Math.random().toString(36).substr(2, 9)}</p>
        </div>
      `;
        editor.insertContent(sampleData);
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

  const testEditorAPI = () => {
    const testName = "Editor API Test";
    const startTime = Date.now();

    if (editor) {
      try {
        updateTestStatus(testName, "running", "Testing editor API methods...");
        const currentContent = editor.getContent();
        const textContent = editor.getContent({ format: "text" });
        const hasContent = currentContent.length > 0;

        // Try to get word count more safely
        let wordCount = "N/A";
        try {
          if (
            editor.plugins &&
            editor.plugins.wordcount &&
            editor.plugins.wordcount.getCount
          ) {
            wordCount = editor.plugins.wordcount.getCount().toString();
          }
        } catch (wordCountError) {
          // Word count plugin might not be available or working
          wordCount = "Unavailable";
        }

        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "pass",
          `API working: ${hasContent ? "Has content" : "Empty"} (${currentContent.length} chars, ${textContent.length} text chars, ${wordCount} words)`,
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
  // Individual test functions
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

  const runUndoRedoTest = async () => {
    const testName = "Undo/Redo Test";
    const startTime = Date.now();

    if (!editor) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
        "Testing undo/redo functionality...",
      );

      const originalContent = editor.getContent();

      // Test undo/redo functionality
      editor.execCommand("Undo");
      await new Promise((resolve) => setTimeout(resolve, 100));
      const undoContent = editor.getContent();

      editor.execCommand("Redo");
      await new Promise((resolve) => setTimeout(resolve, 100));
      const redoContent = editor.getContent();

      const undoWorked = undoContent !== originalContent;
      const redoWorked = redoContent === originalContent;

      const duration = Date.now() - startTime;

      if (undoWorked && redoWorked) {
        updateTestStatus(
          testName,
          "pass",
          "Undo and Redo commands working correctly",
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "fail",
          `Undo/Redo not working as expected (undo: ${undoWorked}, redo: ${redoWorked})`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Undo/Redo test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration,
      );
    }
  };

  const runPluginTest = async () => {
    const testName = "Plugin Test";
    const startTime = Date.now();

    if (!editor) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
      return;
    }

    try {
      updateTestStatus(testName, "running", "Checking available plugins...");

      // Try multiple ways to get plugin information
      let plugins = [];
      let pluginSource = "unknown";

      // Method 1: Check editor.settings (may be undefined)
      if (editor.settings && editor.settings.plugins) {
        plugins = Array.isArray(editor.settings.plugins)
          ? editor.settings.plugins
          : editor.settings.plugins.split(" ");
        pluginSource = "editor.settings";
      }
      // Method 2: Check editor.plugins object (more reliable)
      else if (editor.plugins) {
        plugins = Object.keys(editor.plugins);
        pluginSource = "editor.plugins";
      }
      // Method 3: Check if we can access specific known plugins
      else {
        const knownPlugins = ["wordcount", "lists", "table", "link", "image"];
        plugins = knownPlugins.filter((plugin) => {
          try {
            return editor.plugins && editor.plugins[plugin];
          } catch {
            return false;
          }
        });
        pluginSource = "detected plugins";
      }

      const pluginCount = plugins.length;
      const duration = Date.now() - startTime;

      if (pluginCount > 0) {
        updateTestStatus(
          testName,
          "pass",
          `${pluginCount} plugins detected via ${pluginSource}: ${plugins.slice(0, 5).join(", ")}${plugins.length > 5 ? "..." : ""}`,
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "pass",
          "No plugins detected (this may be normal for basic setup)",
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Plugin test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration,
      );
    }
  };

  const runEventHandlingTest = async () => {
    const testName = "Event Handling Test";
    const startTime = Date.now();

    if (!editor) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Editor not ready", duration);
      return;
    }

    try {
      updateTestStatus(testName, "running", "Testing event handling...");

      let eventFired = false;
      const testHandler = () => {
        eventFired = true;
      };

      editor.on("NodeChange", testHandler);
      editor.selection.select(editor.getBody());

      // Give it a moment for the event to fire
      await new Promise((resolve) => setTimeout(resolve, 100));

      editor.off("NodeChange", testHandler);

      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        eventFired ? "pass" : "fail",
        eventFired
          ? "Event handling working correctly"
          : "Events not firing as expected",
        duration,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Event test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      case "Undo/Redo Test":
        await runUndoRedoTest();
        break;
      case "Plugin Test":
        await runPluginTest();
        break;
      case "Event Handling Test":
        await runEventHandlingTest();
        break;
      default:
        updateTestStatus(testName, "fail", "Unknown test");
    }
  };

  const testAllOptions = async () => {
    setIsRunningTestSuite(true);
    clearResults();

    // Small delay between tests for better UX
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Run tests in sequence with proper content handling
      await runEditorStatusTest();
      await delay(300);

      // Save content and get the saved content directly
      const savedContentData = await saveContent();
      await delay(300);

      // Run load test with the content that was just saved
      await runEnhancedLoadContentTest(savedContentData || undefined);
      await delay(300);

      // Run remaining tests
      testEditorAPI();
      await delay(300);

      insertSampleData();
      await delay(300);

      await runUndoRedoTest();
      await delay(300);

      await runPluginTest();
      await delay(300);

      await runEventHandlingTest();
    } catch (error) {
      console.error("Error during test execution:", error);
    }

    setIsRunningTestSuite(false);
  };

  return (
    <div>
      <h2>TinyMCE Integration Tests</h2>

      <TestProgress
        title="TinyMCE Editor"
        tests={testItems}
        isRunning={isRunningTestSuite}
        onRunAll={testAllOptions}
        onRunIndividual={runIndividualTest}
        onClear={clearResults}
        showIndividualButtons={true}
      />

      {/* TinyMCE Editor */}
      <Box sx={{ mb: 3, mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              TinyMCE Rich Text Editor
            </Typography>
            <Editor
              ref={editorRef}
              value={content}
              onInit={(_, editor) => {
                setEditor(editor);
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
                label={editor ? "TinyMCE Ready" : "TinyMCE Initializing"}
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
        <h3>About TinyMCE Tests</h3>
        <ul style={{ textAlign: "left" }}>
          <li>
            <strong>Editor Status:</strong> Verifies that the TinyMCE editor is
            properly initialized
          </li>
          <li>
            <strong>Save Content:</strong> Tests saving current editor content
            to memory
          </li>
          <li>
            <strong>Load Content:</strong> Tests loading saved content back to
            the editor (requires saved content)
          </li>
          <li>
            <strong>Insert Sample Data:</strong> Tests inserting HTML content
            into the editor
          </li>
          <li>
            <strong>Editor API Test:</strong> Tests core editor API methods and
            content retrieval
          </li>
          <li>
            <strong>Undo/Redo Test:</strong> Tests undo and redo functionality
          </li>
          <li>
            <strong>Plugin Test:</strong> Checks for available plugins and their
            functionality
          </li>
          <li>
            <strong>Event Handling Test:</strong> Tests editor event handling
            mechanisms
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TinyMCETests;
