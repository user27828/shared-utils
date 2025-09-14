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
import ServerIntegrationTests from "./components/ServerIntegrationTests";

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

const App: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<
    "index" | "turnstile" | "log" | "options" | "client" | "tinymce" | "server"
  >("index");

  // Theme state - default to dark mode
  const [isDarkMode, setIsDarkMode] = React.useState(true);

  const handleNavigate = (
    view:
      | "index"
      | "turnstile"
      | "log"
      | "options"
      | "client"
      | "tinymce"
      | "server",
  ) => {
    setCurrentView(view);
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
            <button
              onClick={() => handleNavigate("index")}
              style={{
                backgroundColor:
                  currentView === "index"
                    ? "#646cff"
                    : isDarkMode
                      ? "#1a1a1a"
                      : "#e0e0e0",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              Test Index
            </button>
            <button
              onClick={() => handleNavigate("turnstile")}
              style={{
                backgroundColor:
                  currentView === "turnstile"
                    ? "#646cff"
                    : isDarkMode
                      ? "#1a1a1a"
                      : "#e0e0e0",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              Turnstile Tests
            </button>
            <button
              onClick={() => handleNavigate("log")}
              style={{
                backgroundColor:
                  currentView === "log"
                    ? "#646cff"
                    : isDarkMode
                      ? "#1a1a1a"
                      : "#e0e0e0",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              Log Tests
            </button>
            <button
              onClick={() => handleNavigate("options")}
              style={{
                backgroundColor:
                  currentView === "options"
                    ? "#646cff"
                    : isDarkMode
                      ? "#1a1a1a"
                      : "#e0e0e0",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              Options Manager
            </button>
            <button
              onClick={() => handleNavigate("client")}
              style={{
                backgroundColor:
                  currentView === "client"
                    ? "#646cff"
                    : isDarkMode
                      ? "#1a1a1a"
                      : "#e0e0e0",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              Client Components
            </button>
            <button
              onClick={() => handleNavigate("tinymce")}
              style={{
                backgroundColor:
                  currentView === "tinymce"
                    ? "#646cff"
                    : isDarkMode
                      ? "#1a1a1a"
                      : "#e0e0e0",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              TinyMCE Tests
            </button>
            <button
              onClick={() => handleNavigate("server")}
              style={{
                backgroundColor:
                  currentView === "server"
                    ? "#646cff"
                    : isDarkMode
                      ? "#1a1a1a"
                      : "#e0e0e0",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              Server Tests
            </button>
          </nav>
        </header>

        <main>
          {currentView === "index" && <TestIndex onNavigate={handleNavigate} />}
          {currentView === "turnstile" && <TurnstileTests />}
          {currentView === "log" && <LogTests />}
          {currentView === "options" && <OptionsManagerTests />}
          {currentView === "client" && <ClientComponentTests />}
          {currentView === "tinymce" && <TinyMCETests darkMode={isDarkMode} />}
          {currentView === "server" && <ServerIntegrationTests />}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
