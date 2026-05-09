import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline, IconButton, Box } from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import TestIndex from "./components/TestIndex";
import TurnstileTests from "./components/TurnstileTests";
import LogTests from "./components/LogTests";
import OptionsManagerTests from "./components/OptionsManagerTests";
import ClientComponentTests from "./components/ClientComponentTests";
import TinyMCETests from "./components/TinyMCETests";
import MDXEditorTests from "./components/MDXEditorTests";
import CKEditorTests from "./components/CKEditorTests";
import EasyMDETests from "./components/EasyMDETests";
import ServerIntegrationTests from "./components/ServerIntegrationTests";
import CmsTests from "./components/CmsTests";
import FmTests from "./components/FmTests";
import {
  AUTOMATED_SUITE_VIEWS,
  TEST_NAV_ITEMS,
  type TestSuiteView,
  type TestView,
} from "./components/testSuiteRegistry";
import {
  applySuiteAutomationResult,
  createInitialSuiteSnapshots,
  type SuiteAutomationProps,
  type SuiteAutomationResult,
  type SuiteRunSnapshot,
} from "./components/testSuiteAutomation";

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

const App: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<TestView>("index");
  const [suiteRunSnapshots, setSuiteRunSnapshots] = React.useState<
    Record<TestSuiteView, SuiteRunSnapshot>
  >(() => createInitialSuiteSnapshots());
  const [activeAutomation, setActiveAutomation] =
    React.useState<ActiveAutomationState | null>(null);

  // Theme state - default to dark mode
  const [isDarkMode, setIsDarkMode] = React.useState(true);

  const isRunningAllSuites = activeAutomation !== null;
  const activeSuite = activeAutomation
    ? activeAutomation.queue[activeAutomation.index]
    : null;

  const handleNavigate = (view: TestView) => {
    if (isRunningAllSuites) {
      return;
    }
    setCurrentView(view);
  };

  const handleRunAllSuites = () => {
    const queue = [...AUTOMATED_SUITE_VIEWS];
    const firstView = queue[0];
    const runId = Date.now();

    setSuiteRunSnapshots(createQueuedSnapshots(runId, firstView));
    setActiveAutomation({ runId, queue, index: 0 });
    setCurrentView(firstView);
  };

  const handleSuiteAutomationComplete = (result: SuiteAutomationResult) => {
    const currentAutomation = activeAutomation;

    setSuiteRunSnapshots((current) => {
      const nextSnapshots = {
        ...current,
        [result.view]: applySuiteAutomationResult(current[result.view], result),
      };

      if (currentAutomation && currentAutomation.runId === result.runId) {
        const nextView = currentAutomation.queue[currentAutomation.index + 1];
        if (nextView) {
          nextSnapshots[nextView] = {
            ...nextSnapshots[nextView],
            status: "running",
            lastRunId: result.runId,
            message: "Running suite",
          };
        }
      }

      return nextSnapshots;
    });

    if (!currentAutomation || currentAutomation.runId !== result.runId) {
      return;
    }

    if (currentAutomation.queue[currentAutomation.index] !== result.view) {
      return;
    }

    const nextIndex = currentAutomation.index + 1;
    if (nextIndex >= currentAutomation.queue.length) {
      setActiveAutomation(null);
      setCurrentView("index");
      return;
    }

    const nextView = currentAutomation.queue[nextIndex];
    setActiveAutomation({
      ...currentAutomation,
      index: nextIndex,
    });
    setCurrentView(nextView);
  };

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
          {currentView === "turnstile" && (
            <TurnstileTests {...getAutomationProps("turnstile")} />
          )}
          {currentView === "log" && <LogTests {...getAutomationProps("log")} />}
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
          {currentView === "fm" && <FmTests {...getAutomationProps("fm")} />}
          {currentView === "server" && (
            <ServerIntegrationTests {...getAutomationProps("server")} />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
