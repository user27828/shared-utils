import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Brightness4 from "@mui/icons-material/Brightness4";
import Brightness7 from "@mui/icons-material/Brightness7";
import TestIndex from "./components/TestIndex.js";
import {
  AUTOMATED_SUITE_VIEWS,
  TEST_NAV_ITEMS,
  type TestSuiteView,
  type TestView,
} from "./components/testSuiteRegistry.js";
import {
  applySuiteAutomationResult,
  createInitialSuiteSnapshots,
  type SuiteAutomationProps,
  type SuiteAutomationResult,
  type SuiteRunSnapshot,
} from "./components/testSuiteAutomation.js";

const TurnstileTests = React.lazy(
  () => import("./components/TurnstileTests.js"),
);
const LogTests = React.lazy(() => import("./components/LogTests.js"));
const OptionsManagerTests = React.lazy(
  () => import("./components/OptionsManagerTests.js"),
);
const ClientComponentTests = React.lazy(
  () => import("./components/ClientComponentTests.js"),
);
const TinyMCETests = React.lazy(() => import("./components/TinyMCETests.js"));
const MDXEditorTests = React.lazy(
  () => import("./components/MDXEditorTests.js"),
);
const CKEditorTests = React.lazy(
  () => import("./components/CKEditorTests.js"),
);
const EasyMDETests = React.lazy(
  () => import("./components/EasyMDETests.js"),
);
const ServerIntegrationTests = React.lazy(
  () => import("./components/ServerIntegrationTests.js"),
);
const CmsTests = React.lazy(() => import("./components/CmsTests.js"));
const FmTests = React.lazy(() => import("./components/FmTests.js"));

// Create light theme
const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#646cff",
    },
    background: {
      default: "#ffffff",
      paper: "#f5f5f5",
    },
  },
});

// Create dark theme that matches the existing dark CSS
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#242424",
      paper: "#1a1a1a",
    },
    primary: {
      main: "#646cff",
    },
    text: {
      primary: "rgba(255, 255, 255, 0.87)",
      secondary: "rgba(255, 255, 255, 0.6)",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.23)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.4)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#646cff",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "rgba(255, 255, 255, 0.6)",
          "&.Mui-focused": {
            color: "#646cff",
          },
        },
      },
    },
  },
});

type ActiveAutomationState = {
  runId: number;
  queue: TestSuiteView[];
  index: number;
};

type AppAutomationState = {
  currentView: TestView;
  suiteRunSnapshots: Record<TestSuiteView, SuiteRunSnapshot>;
  activeAutomation: ActiveAutomationState | null;
};

type AppAutomationAction =
  | {
      type: "run-all";
      runId: number;
      queue: TestSuiteView[];
    }
  | {
      type: "navigate";
      view: TestView;
    }
  | {
      type: "suite-complete";
      result: SuiteAutomationResult;
    };

const SuiteLoadingState: React.FC = () => {
  return <div role="status">Loading test suite...</div>;
};

const createQueuedSnapshots = (
  runId: number,
  activeView: TestSuiteView,
): Record<TestSuiteView, SuiteRunSnapshot> => {
  const snapshots = createInitialSuiteSnapshots();

  for (const view of AUTOMATED_SUITE_VIEWS) {
    snapshots[view] = {
      ...snapshots[view],
      status: view === activeView ? "running" : "queued",
      lastRunId: runId,
      message: view === activeView ? "Running suite" : "Queued",
    };
  }

  return snapshots;
};

const createInitialAutomationState = (): AppAutomationState => {
  return {
    currentView: "index",
    suiteRunSnapshots: createInitialSuiteSnapshots(),
    activeAutomation: null,
  };
};

const appAutomationReducer = (
  state: AppAutomationState,
  action: AppAutomationAction,
): AppAutomationState => {
  switch (action.type) {
    case "run-all": {
      if (state.activeAutomation || action.queue.length === 0) {
        return state;
      }

      const firstView = action.queue[0];
      return {
        currentView: firstView,
        suiteRunSnapshots: createQueuedSnapshots(action.runId, firstView),
        activeAutomation: {
          runId: action.runId,
          queue: action.queue,
          index: 0,
        },
      };
    }
    case "navigate": {
      if (state.activeAutomation) {
        return state;
      }

      return {
        ...state,
        currentView: action.view,
      };
    }
    case "suite-complete": {
      const { result } = action;
      const currentAutomation = state.activeAutomation;

      if (
        !currentAutomation ||
        currentAutomation.runId !== result.runId ||
        currentAutomation.queue[currentAutomation.index] !== result.view
      ) {
        return state;
      }

      const nextSnapshots = {
        ...state.suiteRunSnapshots,
        [result.view]: applySuiteAutomationResult(
          state.suiteRunSnapshots[result.view],
          result,
        ),
      };
      const nextIndex = currentAutomation.index + 1;

      if (nextIndex >= currentAutomation.queue.length) {
        return {
          currentView: "index",
          suiteRunSnapshots: nextSnapshots,
          activeAutomation: null,
        };
      }

      const nextView = currentAutomation.queue[nextIndex];
      nextSnapshots[nextView] = {
        ...nextSnapshots[nextView],
        status: "running",
        lastRunId: result.runId,
        message: "Running suite",
      };

      return {
        currentView: nextView,
        suiteRunSnapshots: nextSnapshots,
        activeAutomation: {
          ...currentAutomation,
          index: nextIndex,
        },
      };
    }
  }
};

const App: React.FC = () => {
  const [automationState, dispatchAutomation] = React.useReducer(
    appAutomationReducer,
    undefined,
    createInitialAutomationState,
  );

  // Theme state - default to dark mode
  const [isDarkMode, setIsDarkMode] = React.useState(true);

  const { currentView, suiteRunSnapshots, activeAutomation } = automationState;
  const isRunningAllSuites = activeAutomation !== null;
  const activeSuite = activeAutomation
    ? activeAutomation.queue[activeAutomation.index]
    : null;

  const handleNavigate = (view: TestView) => {
    dispatchAutomation({ type: "navigate", view });
  };

  const handleRunAllSuites = () => {
    const queue = [...AUTOMATED_SUITE_VIEWS];
    const runId = Date.now();

    dispatchAutomation({ type: "run-all", runId, queue });
  };

  const handleSuiteAutomationComplete = React.useCallback(
    (result: SuiteAutomationResult) => {
      dispatchAutomation({ type: "suite-complete", result });
    },
    [],
  );

  const getAutomationProps = (view: TestSuiteView): SuiteAutomationProps => {
    if (!activeAutomation || activeSuite !== view) {
      return {};
    }

    return {
      automationRunId: activeAutomation.runId,
      onAutomationComplete: handleSuiteAutomationComplete,
    };
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <div className="App">
        <header>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <div>
              <h1>Shared Utils Test Consumer</h1>
              <p>Integration testing environment for @user27828/shared-utils</p>
            </div>
            <IconButton
              onClick={toggleTheme}
              color="inherit"
              sx={{ ml: 1 }}
              aria-label="toggle theme"
            >
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>

          <nav style={{ margin: "1rem 0" }}>
            {TEST_NAV_ITEMS.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                disabled={isRunningAllSuites}
                style={{
                  backgroundColor:
                    currentView === item.view
                      ? "#646cff"
                      : isDarkMode
                        ? "#1a1a1a"
                        : "#e0e0e0",
                  color: isDarkMode ? "#ffffff" : "#000000",
                  opacity: isRunningAllSuites ? 0.7 : 1,
                  cursor: isRunningAllSuites ? "not-allowed" : "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main>
          {currentView === "index" && (
            <TestIndex
              onNavigate={handleNavigate}
              onRunAllSuites={handleRunAllSuites}
              isRunningAllSuites={isRunningAllSuites}
              activeSuite={activeSuite}
              suiteRunSnapshots={suiteRunSnapshots}
            />
          )}
          <React.Suspense fallback={<SuiteLoadingState />}>
            {currentView === "turnstile" && (
              <TurnstileTests {...getAutomationProps("turnstile")} />
            )}
            {currentView === "log" && (
              <LogTests {...getAutomationProps("log")} />
            )}
            {currentView === "options" && (
              <OptionsManagerTests {...getAutomationProps("options")} />
            )}
            {currentView === "client" && (
              <ClientComponentTests {...getAutomationProps("client")} />
            )}
            {currentView === "tinymce" && (
              <TinyMCETests
                darkMode={isDarkMode}
                {...getAutomationProps("tinymce")}
              />
            )}
            {currentView === "easymde" && (
              <EasyMDETests
                darkMode={isDarkMode}
                {...getAutomationProps("easymde")}
              />
            )}
            {currentView === "mdxeditor" && (
              <MDXEditorTests
                darkMode={isDarkMode}
                {...getAutomationProps("mdxeditor")}
              />
            )}
            {currentView === "ckeditor" && (
              <CKEditorTests
                darkMode={isDarkMode}
                {...getAutomationProps("ckeditor")}
              />
            )}
            {currentView === "cms" && (
              <CmsTests darkMode={isDarkMode} {...getAutomationProps("cms")} />
            )}
            {currentView === "fm" && (
              <FmTests {...getAutomationProps("fm")} />
            )}
            {currentView === "server" && (
              <ServerIntegrationTests {...getAutomationProps("server")} />
            )}
          </React.Suspense>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
