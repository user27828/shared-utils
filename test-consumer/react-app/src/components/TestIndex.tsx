import React from "react";
import {
  AUTOMATED_SUITE_VIEWS,
  getViewLabel,
  type TestSuiteView,
  type TestView,
} from "./testSuiteRegistry";
import type { SuiteRunSnapshot } from "./testSuiteAutomation";

interface TestIndexProps {
  onNavigate: (view: TestView) => void;
  onRunAllSuites: () => void;
  isRunningAllSuites: boolean;
  activeSuite: TestSuiteView | null;
  suiteRunSnapshots: Record<TestSuiteView, SuiteRunSnapshot>;
}

type TestCategory = {
  name: string;
  description: string;
  view?: TestSuiteView;
  tests: Array<{
    name: string;
    description: string;
    status: "implemented" | "todo";
  }>;
  todoMessage?: string;
};

const TestIndex: React.FC<TestIndexProps> = ({
  onNavigate,
  onRunAllSuites,
  isRunningAllSuites,
  activeSuite,
  suiteRunSnapshots,
}) => {
  const testCategories: TestCategory[] = [
    {
      name: "Turnstile Integration",
      description: "Cloudflare Turnstile CAPTCHA integration tests",
      view: "turnstile",
      tests: [
        {
          name: "Basic Rendering",
          description: "Test basic turnstile widget rendering",
          status: "implemented" as const,
        },
        {
          name: "Configuration Options",
          description: "Test various turnstile configuration options",
          status: "implemented" as const,
        },
        {
          name: "Event Handling",
          description:
            "Test turnstile event callbacks (success, error, timeout)",
          status: "implemented" as const,
        },
        {
          name: "Multiple Widgets",
          description: "Test multiple turnstile widgets on same page",
          status: "implemented" as const,
        },
        {
          name: "Dynamic Theme Switching",
          description: "Test switching between light/dark themes",
          status: "implemented" as const,
        },
        {
          name: "Reset and Cleanup",
          description: "Test widget reset and cleanup functionality",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "Log Utility Tests",
      description: "Logging utility integration tests",
      view: "log",
      tests: [
        {
          name: "Basic Logging",
          description: "Test log, info, warn, error methods",
          status: "implemented" as const,
        },
        {
          name: "Environment Detection",
          description: "Test client vs server environment detection",
          status: "implemented" as const,
        },
        {
          name: "Caller Information",
          description: "Test showCaller feature in browser environment",
          status: "implemented" as const,
        },
        {
          name: "LocalStorage Override",
          description: "Test localStorage debug mode override",
          status: "implemented" as const,
        },
        {
          name: "Production Filtering",
          description: "Test log level filtering in production mode",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "Options Manager Tests",
      description: "Configuration management utility tests",
      view: "options",
      tests: [
        {
          name: "Basic Configuration",
          description: "Test setting and getting configuration options",
          status: "implemented" as const,
        },
        {
          name: "Merge Strategy",
          description: "Test array replacement and object merging strategies",
          status: "implemented" as const,
        },
        {
          name: "Global Options Manager",
          description: "Test cross-utility configuration management",
          status: "implemented" as const,
        },
        {
          name: "Backward Compatibility",
          description: "Test deprecated API methods for compatibility",
          status: "implemented" as const,
        },
        {
          name: "Undefined Handling",
          description: "Test proper handling of undefined values",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "Client Component Tests",
      description:
        "React client components integration tests for form, upload, and layout components",
      view: "client",
      tests: [
        {
          name: "CountrySelect Component",
          description: "Test country selection component (single and multiple)",
          status: "implemented" as const,
        },
        {
          name: "LanguageSelect Component",
          description:
            "Test language selection component (single and multiple)",
          status: "implemented" as const,
        },
        {
          name: "FileUploadList Component",
          description:
            "Test upload, existing-file selection, and server integration flows",
          status: "implemented" as const,
        },
        {
          name: "Layout Components",
          description:
            "Test CheckChip, SelectChip, SplitChip, ProcessStatusChip, Disconnected, and BackdropLoader demos",
          status: "implemented" as const,
        },
        {
          name: "Helper Functions",
          description:
            "Test pathJoinUrl, isDev, getCountryByCode, getLanguageByCode",
          status: "implemented" as const,
        },
        {
          name: "Data Validation",
          description: "Test countries and languages data integrity",
          status: "implemented" as const,
        },
        {
          name: "CSV Export",
          description: "Test CSV data export functionality",
          status: "implemented" as const,
        },
        {
          name: "CSV Import",
          description: "Test CSV file import and parsing functionality",
          status: "implemented" as const,
        },
        {
          name: "Date Utilities",
          description: "Test date formatting, parsing, and timezone utilities",
          status: "implemented" as const,
        },
        {
          name: "Error Handling",
          description: "Test component error handling and edge cases",
          status: "implemented" as const,
        },
        {
          name: "Material-UI Integration",
          description: "Test Material-UI component integration",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "TinyMCE Integration Tests",
      description: "Rich text editor integration with shared-utils data",
      view: "tinymce",
      tests: [
        {
          name: "Basic Editor Setup",
          description:
            "Test TinyMCE editor initialization with dark/light themes",
          status: "implemented" as const,
        },
        {
          name: "Content Management",
          description: "Test save/load content functionality",
          status: "implemented" as const,
        },
        {
          name: "Data Integration",
          description: "Test insertion of countries and languages data",
          status: "implemented" as const,
        },
        {
          name: "CSV Import/Export",
          description: "Test CSV data import as tables and content export",
          status: "implemented" as const,
        },
        {
          name: "Time Utilities",
          description: "Test insertion of formatted dates and relative times",
          status: "implemented" as const,
        },
        {
          name: "Dynamic Content",
          description: "Test real-time content manipulation and statistics",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "EasyMDE Integration Tests",
      description: "Markdown editor integration via the unified WysiwygEditor",
      view: "easymde",
      tests: [
        {
          name: "Basic Editor Setup",
          description: "Test EasyMDE initialization with dark/light themes",
          status: "implemented" as const,
        },
        {
          name: "Asset Insertion",
          description: "Test Image/File/Media insertion hooks",
          status: "implemented" as const,
        },
        {
          name: "Image Upload",
          description: "Test paste/drag image upload handler",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "MDXEditor Integration Tests",
      description: "Markdown editor integration with shared-utils data",
      view: "mdxeditor",
      tests: [
        {
          name: "Basic Editor Setup",
          description: "Test MDXEditor initialization with dark/light themes",
          status: "implemented" as const,
        },
        {
          name: "Content Management",
          description: "Test save/load markdown content functionality",
          status: "implemented" as const,
        },
        {
          name: "Markdown Formatting",
          description: "Test markdown formatting and syntax support",
          status: "implemented" as const,
        },
        {
          name: "Editor API",
          description: "Test getMarkdown, setMarkdown, insertMarkdown methods",
          status: "implemented" as const,
        },
        {
          name: "Focus Management",
          description: "Test editor focus functionality",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "CKEditor 5 Integration Tests",
      description: "CKEditor 5 (GPL) integration with shared-utils hooks",
      view: "ckeditor",
      tests: [
        {
          name: "Basic Editor Setup",
          description:
            "Test CKEditor initialization with dark/light themes and GPL licensing",
          status: "implemented" as const,
        },
        {
          name: "Media Embed",
          description: "Test embedding media URLs without cloud services",
          status: "implemented" as const,
        },
        {
          name: "Paste Markdown",
          description:
            "Test PasteFromMarkdownExperimental converting Markdown on paste",
          status: "implemented" as const,
        },
        {
          name: "Custom File Picker",
          description:
            "Test custom picker UI integration via onPickAsset (image/file/media)",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "CMS Client Tests",
      description: "Client-side CMS UI components and editor integration",
      view: "cms",
      tests: [
        {
          name: "Body Editor",
          description: "Test CmsBodyEditor for HTML/Markdown/JSON/Text",
          status: "implemented" as const,
        },
        {
          name: "Body Renderer",
          description: "Test CmsBodyRenderer preview rendering",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "FM Client Tests",
      description: "Client-side File Manager UI components",
      view: "fm",
      tests: [
        {
          name: "Media Library",
          description: "Test FmMediaLibrary rendering and selection",
          status: "implemented" as const,
        },
        {
          name: "File Picker",
          description: "Test FmFilePicker dialog integration",
          status: "implemented" as const,
        },
      ],
    },
    {
      name: "Future Components Tests",
      description: "Additional React components for future implementation",
      todoMessage:
        "Future components (Advanced Editor Features, Real-time Collaboration) are planned for future implementation",
      tests: [
        {
          name: "Advanced Editor Features",
          description: "Test advanced TinyMCE plugins and custom features",
          status: "todo" as const,
        },
        {
          name: "Real-time Collaboration",
          description: "Test real-time collaborative editing features",
          status: "todo" as const,
        },
      ],
    },
    {
      name: "Server Integration Tests",
      description: "Server-side functionality tests",
      view: "server",
      tests: [
        {
          name: "Turnstile Verification",
          description:
            "Test server-side turnstile token verification and enhanced verification",
          status: "implemented" as const,
        },
        {
          name: "Middleware Integration",
          description:
            "Test Express/Fastify middleware creation, configuration, and execution",
          status: "implemented" as const,
        },
        {
          name: "Cloudflare Worker",
          description:
            "Test Cloudflare Worker creation, HTTP handling, and environment integration",
          status: "implemented" as const,
        },
        {
          name: "Server Options & Configuration",
          description:
            "Test server-side options management and configuration systems",
          status: "implemented" as const,
        },
        {
          name: "Worker Utilities",
          description:
            "Test worker utility functions (origin validation, dev mode detection, etc.)",
          status: "implemented" as const,
        },
        {
          name: "CMS Connector Conformance",
          description:
            "Run CMS connector conformance suite via the server test consumer",
          status: "implemented" as const,
        },
        {
          name: "FM Connector Conformance",
          description:
            "Run File Manager connector conformance suite via the server test consumer",
          status: "implemented" as const,
        },
      ],
    },
  ];

  const getStatusBadge = (status: "implemented" | "todo") => {
    return (
      <span
        className={`status-badge ${status === "implemented" ? "status-implemented" : "status-todo"}`}
      >
        {status === "implemented" ? "READY" : "TODO"}
      </span>
    );
  };

  const getRunBadge = (view: TestSuiteView) => {
    const snapshot = suiteRunSnapshots[view];
    const colorByStatus = {
      idle: "#5f6368",
      queued: "#1976d2",
      running: "#ed6c02",
      passed: "#2e7d32",
      failed: "#d32f2f",
    } as const;

    return (
      <span
        className="status-badge"
        style={{
          marginLeft: "0.5rem",
          backgroundColor: colorByStatus[snapshot.status],
          color: "#ffffff",
        }}
      >
        {snapshot.status.toUpperCase()}
      </span>
    );
  };

  const getRunSummary = (view: TestSuiteView): string => {
    const snapshot = suiteRunSnapshots[view];
    if (snapshot.status === "idle") {
      return "Waiting to run";
    }
    if (snapshot.status === "queued") {
      return "Queued for Run All";
    }
    if (snapshot.status === "running") {
      return "Running now";
    }
    return snapshot.message;
  };

  const handleTestCategoryClick = (
    view?: TestSuiteView,
    todoMessage?: string,
  ) => {
    if (view) {
      onNavigate(view);
      return;
    }

    alert(todoMessage || "This test category is not implemented yet");
  };

  return (
    <div className="test-index">
      <div className="card">
        <h2>Integration Test Suite</h2>
        <p>
          This test consumer workspace provides real-world integration testing
          for the @user27828/shared-utils library. Each category below
          represents a different aspect of the library that can be tested in
          isolation.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={onRunAllSuites}
            disabled={isRunningAllSuites}
            style={{
              marginTop: "0.5rem",
              border: "2px solid #646cff",
              boxShadow: "0 0 0 1px rgba(100, 108, 255, 0.35)",
            }}
          >
            {isRunningAllSuites ? "Running All Suites..." : "Run All"}
          </button>
          {activeSuite && (
            <div style={{ alignSelf: "center" }}>
              Active suite: <strong>{getViewLabel(activeSuite)}</strong>
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: "1.5rem",
          }}
        >
          {AUTOMATED_SUITE_VIEWS.map((view) => (
            <div key={view} className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <strong>{getViewLabel(view)}</strong>
                {getRunBadge(view)}
              </div>
              <p style={{ marginBottom: "0.5rem" }}>{getRunSummary(view)}</p>
              <small>
                {suiteRunSnapshots[view].completedTests}/
                {suiteRunSnapshots[view].totalTests || 0} completed
              </small>
            </div>
          ))}
        </div>
      </div>

      {testCategories.map((category, index) => (
        <div key={index} className="test-section">
          <h2>{category.name}</h2>
          {category.view && getRunBadge(category.view)}
          <p>{category.description}</p>

          <ul className="test-list">
            {category.tests.map((test, testIndex) => (
              <li key={testIndex}>
                <strong>{test.name}</strong>
                {getStatusBadge(test.status)}
                <br />
                <small>{test.description}</small>
              </li>
            ))}
          </ul>

          {category.tests.some((test) => test.status === "implemented") && (
            <button
              onClick={() => handleTestCategoryClick(category.view)}
              style={{ marginTop: "1rem" }}
            >
              Open {category.view ? getViewLabel(category.view) : category.name}
            </button>
          )}

          {!category.tests.some((test) => test.status === "implemented") && (
            <button
              onClick={() =>
                handleTestCategoryClick(undefined, category.todoMessage)
              }
              style={{ marginTop: "1rem" }}
            >
              View Planned Work
            </button>
          )}
        </div>
      ))}

      <div className="card">
        <h3>Implementation Status</h3>
        <p>
          <span className="implemented">✅ Turnstile Integration</span> - Fully
          implemented with comprehensive CAPTCHA testing
        </p>
        <p>
          <span className="implemented">✅ Log Utility Tests</span> -
          Comprehensive browser environment testing implemented
        </p>
        <p>
          <span className="implemented">✅ Options Manager Tests</span> -
          Configuration management and backward compatibility testing
          implemented
        </p>
        <p>
          <span className="implemented">✅ Client Component Tests</span> -
          Complete integration testing for CountrySelect, LanguageSelect,
          FileUploadList, layout components, helpers, data validation, CSV
          Import/Export, and Date Utilities
        </p>
        <p>
          <span className="implemented">✅ TinyMCE Integration Tests</span> -
          Rich text editor integration with shared-utils data, CSV
          import/export, and dynamic content management
        </p>
        <p>
          <span className="implemented">✅ Server Integration Tests</span> -
          Server-side turnstile verification, middleware integration, Cloudflare
          Worker compatibility, and options manager testing
        </p>
        <p>
          <span className="todo">⏳ Future Components</span> - Additional editor
          integrations planned for future implementation
        </p>

        <h3>How to Use</h3>
        <p>
          This test environment allows LLM agents to iterate on both the library
          code and consumer code simultaneously, enabling detection and fixing
          of integration issues that unit tests might miss. Use the Run All
          control for a sequential automation pass, or open any individual suite
          from the cards below.
        </p>
      </div>
    </div>
  );
};

export default TestIndex;
