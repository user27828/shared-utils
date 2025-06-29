import React from "react";

interface TestIndexProps {
  onNavigate: (
    view:
      | "index"
      | "turnstile"
      | "log"
      | "options"
      | "client"
      | "tinymce"
      | "server",
  ) => void;
}

const TestIndex: React.FC<TestIndexProps> = ({ onNavigate }) => {
  const testCategories = [
    {
      name: "Turnstile Integration",
      description: "Cloudflare Turnstile CAPTCHA integration tests",
      tests: [
        {
          name: "Basic Rendering",
          description: "Test basic turnstile widget rendering",
          status: "implemented" as const,
          category: "turnstile",
        },
        {
          name: "Configuration Options",
          description: "Test various turnstile configuration options",
          status: "implemented" as const,
          category: "turnstile",
        },
        {
          name: "Event Handling",
          description:
            "Test turnstile event callbacks (success, error, timeout)",
          status: "implemented" as const,
          category: "turnstile",
        },
        {
          name: "Multiple Widgets",
          description: "Test multiple turnstile widgets on same page",
          status: "implemented" as const,
          category: "turnstile",
        },
        {
          name: "Dynamic Theme Switching",
          description: "Test switching between light/dark themes",
          status: "implemented" as const,
          category: "turnstile",
        },
        {
          name: "Reset and Cleanup",
          description: "Test widget reset and cleanup functionality",
          status: "implemented" as const,
          category: "turnstile",
        },
      ],
    },
    {
      name: "Log Utility Tests",
      description: "Logging utility integration tests",
      tests: [
        {
          name: "Basic Logging",
          description: "Test log, info, warn, error methods",
          status: "implemented" as const,
          category: "log",
        },
        {
          name: "Environment Detection",
          description: "Test client vs server environment detection",
          status: "implemented" as const,
          category: "log",
        },
        {
          name: "Caller Information",
          description: "Test showCaller feature in browser environment",
          status: "implemented" as const,
          category: "log",
        },
        {
          name: "LocalStorage Override",
          description: "Test localStorage debug mode override",
          status: "implemented" as const,
          category: "log",
        },
        {
          name: "Production Filtering",
          description: "Test log level filtering in production mode",
          status: "implemented" as const,
          category: "log",
        },
      ],
    },
    {
      name: "Options Manager Tests",
      description: "Configuration management utility tests",
      tests: [
        {
          name: "Basic Configuration",
          description: "Test setting and getting configuration options",
          status: "implemented" as const,
          category: "options",
        },
        {
          name: "Merge Strategy",
          description: "Test array replacement and object merging strategies",
          status: "implemented" as const,
          category: "options",
        },
        {
          name: "Global Options Manager",
          description: "Test cross-utility configuration management",
          status: "implemented" as const,
          category: "options",
        },
        {
          name: "Backward Compatibility",
          description: "Test deprecated API methods for compatibility",
          status: "implemented" as const,
          category: "options",
        },
        {
          name: "Undefined Handling",
          description: "Test proper handling of undefined values",
          status: "implemented" as const,
          category: "options",
        },
      ],
    },
    {
      name: "Client Component Tests",
      description: "React client components integration tests",
      tests: [
        {
          name: "CountrySelect Component",
          description: "Test country selection component (single and multiple)",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "LanguageSelect Component",
          description:
            "Test language selection component (single and multiple)",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "CalendarAdd Component",
          description: "Test calendar event creation component (logic tests)",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "Helper Functions",
          description:
            "Test pathJoinUrl, isDev, getCountryByCode, getLanguageByCode",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "Data Validation",
          description:
            "Test countries, languages, and demographic data integrity",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "CSV Export",
          description: "Test CSV data export functionality",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "CSV Import",
          description: "Test CSV file import and parsing functionality",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "Date Utilities",
          description: "Test date formatting, parsing, and timezone utilities",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "Error Handling",
          description: "Test component error handling and edge cases",
          status: "implemented" as const,
          category: "client",
        },
        {
          name: "Material-UI Integration",
          description: "Test Material-UI component integration",
          status: "implemented" as const,
          category: "client",
        },
      ],
    },
    {
      name: "TinyMCE Integration Tests",
      description: "Rich text editor integration with shared-utils data",
      tests: [
        {
          name: "Basic Editor Setup",
          description:
            "Test TinyMCE editor initialization with dark/light themes",
          status: "implemented" as const,
          category: "tinymce",
        },
        {
          name: "Content Management",
          description: "Test save/load content functionality",
          status: "implemented" as const,
          category: "tinymce",
        },
        {
          name: "Data Integration",
          description: "Test insertion of countries and languages data",
          status: "implemented" as const,
          category: "tinymce",
        },
        {
          name: "CSV Import/Export",
          description: "Test CSV data import as tables and content export",
          status: "implemented" as const,
          category: "tinymce",
        },
        {
          name: "Time Utilities",
          description: "Test insertion of formatted dates and relative times",
          status: "implemented" as const,
          category: "tinymce",
        },
        {
          name: "Dynamic Content",
          description: "Test real-time content manipulation and statistics",
          status: "implemented" as const,
          category: "tinymce",
        },
      ],
    },
    {
      name: "Future Components Tests",
      description: "Additional React components for future implementation",
      tests: [
        {
          name: "Advanced Editor Features",
          description: "Test advanced TinyMCE plugins and custom features",
          status: "todo" as const,
          category: "components",
        },
        {
          name: "Real-time Collaboration",
          description: "Test real-time collaborative editing features",
          status: "todo" as const,
          category: "components",
        },
      ],
    },
    {
      name: "Server Integration Tests",
      description: "Server-side functionality tests",
      tests: [
        {
          name: "Turnstile Verification",
          description:
            "Test server-side turnstile token verification and enhanced verification",
          status: "implemented" as const,
          category: "server",
        },
        {
          name: "Middleware Integration",
          description:
            "Test Express/Fastify middleware creation, configuration, and execution",
          status: "implemented" as const,
          category: "server",
        },
        {
          name: "Cloudflare Worker",
          description:
            "Test Cloudflare Worker creation, HTTP handling, and environment integration",
          status: "implemented" as const,
          category: "server",
        },
        {
          name: "Server Options & Configuration",
          description:
            "Test server-side options management and configuration systems",
          status: "implemented" as const,
          category: "server",
        },
        {
          name: "Worker Utilities",
          description:
            "Test worker utility functions (origin validation, dev mode detection, etc.)",
          status: "implemented" as const,
          category: "server",
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

  const handleTestCategoryClick = (category: string) => {
    if (category === "turnstile") {
      onNavigate("turnstile");
    } else if (category === "log") {
      onNavigate("log");
    } else if (category === "options") {
      onNavigate("options");
    } else if (category === "client") {
      onNavigate("client");
    } else if (category === "tinymce") {
      onNavigate("tinymce");
    } else if (category === "components") {
      // Future components - show notification
      alert(
        "Future components (Advanced Editor Features, Real-time Collaboration) are planned for future implementation",
      );
    } else if (category === "server") {
      onNavigate("server");
    } else {
      // For other categories not yet implemented
      alert(`${category} tests are not yet implemented`);
    }
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
      </div>

      {testCategories.map((category, index) => (
        <div key={index} className="test-section">
          <h2>{category.name}</h2>
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
              onClick={() =>
                handleTestCategoryClick(category.tests[0].category)
              }
              style={{ marginTop: "1rem" }}
            >
              Run {category.name}
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
          CalendarAdd, helpers, data validation, CSV Import/Export, and Date
          Utilities
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
          of integration issues that unit tests might miss. Click "Run" buttons
          to execute comprehensive test suites.
        </p>
      </div>
    </div>
  );
};

export default TestIndex;
