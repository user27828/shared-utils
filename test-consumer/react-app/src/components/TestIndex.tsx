import React from "react";

interface TestIndexProps {
  onNavigate: (view: "index" | "turnstile" | "log") => void;
}

interface TestItem {
  name: string;
  description: string;
  status: "implemented" | "todo";
  category: string;
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
          status: "todo" as const,
          category: "options",
        },
        {
          name: "Deep Merging",
          description: "Test deep merging of configuration objects",
          status: "todo" as const,
          category: "options",
        },
        {
          name: "Cross-Utility Configuration",
          description: "Test shared configuration between utilities",
          status: "todo" as const,
          category: "options",
        },
      ],
    },
    {
      name: "Client Components Tests",
      description: "React components integration tests",
      tests: [
        {
          name: "CSV Import Component",
          description: "Test CSV file import and parsing component",
          status: "todo" as const,
          category: "components",
        },
        {
          name: "Date Utilities",
          description: "Test date formatting and timezone utilities",
          status: "todo" as const,
          category: "components",
        },
        {
          name: "TinyMCE Integration",
          description: "Test TinyMCE editor integration component",
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
          description: "Test server-side turnstile token verification",
          status: "todo" as const,
          category: "server",
        },
        {
          name: "Middleware Integration",
          description: "Test Express/Fastify middleware integration",
          status: "todo" as const,
          category: "server",
        },
        {
          name: "Cloudflare Worker",
          description: "Test Cloudflare Worker deployment and functionality",
          status: "todo" as const,
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
          implemented and ready for testing
        </p>
        <p>
          <span className="implemented">✅ Log Utility Tests</span> -
          Comprehensive browser environment testing implemented
        </p>
        <p>
          <span className="todo">⏳ Other Tests</span> - Options Manager, Client
          Components, and Server Integration tests planned for future
          implementation
        </p>

        <h3>How to Use</h3>
        <p>
          This test environment allows LLM agents to iterate on both the library
          code and consumer code simultaneously, enabling detection and fixing
          of integration issues that unit tests might miss.
        </p>
      </div>
    </div>
  );
};

export default TestIndex;
