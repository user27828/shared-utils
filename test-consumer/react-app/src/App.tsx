import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import TestIndex from "./components/TestIndex";
import TurnstileTests from "./components/TurnstileTests";
import LogTests from "./components/LogTests";
import OptionsManagerTests from "./components/OptionsManagerTests";
import ClientComponentTests from "./components/ClientComponentTests";
import TinyMCETests from "./components/TinyMCETests";

// Create a dark theme that matches the existing dark CSS
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
    "index" | "turnstile" | "log" | "options" | "client" | "tinymce"
  >("index");

  const handleNavigate = (
    view: "index" | "turnstile" | "log" | "options" | "client" | "tinymce",
  ) => {
    setCurrentView(view);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <header>
          <h1>Shared Utils Test Consumer</h1>
          <p>Integration testing environment for @user27828/shared-utils</p>

          <nav style={{ margin: "1rem 0" }}>
            <button
              onClick={() => handleNavigate("index")}
              style={{
                backgroundColor:
                  currentView === "index" ? "#646cff" : "#1a1a1a",
              }}
            >
              Test Index
            </button>
            <button
              onClick={() => handleNavigate("turnstile")}
              style={{
                backgroundColor:
                  currentView === "turnstile" ? "#646cff" : "#1a1a1a",
              }}
            >
              Turnstile Tests
            </button>
            <button
              onClick={() => handleNavigate("log")}
              style={{
                backgroundColor: currentView === "log" ? "#646cff" : "#1a1a1a",
              }}
            >
              Log Tests
            </button>
            <button
              onClick={() => handleNavigate("options")}
              style={{
                backgroundColor:
                  currentView === "options" ? "#646cff" : "#1a1a1a",
              }}
            >
              Options Manager
            </button>
            <button
              onClick={() => handleNavigate("client")}
              style={{
                backgroundColor:
                  currentView === "client" ? "#646cff" : "#1a1a1a",
              }}
            >
              Client Components
            </button>
            <button
              onClick={() => handleNavigate("tinymce")}
              style={{
                backgroundColor:
                  currentView === "tinymce" ? "#646cff" : "#1a1a1a",
              }}
            >
              TinyMCE Tests
            </button>
          </nav>
        </header>

        <main>
          {currentView === "index" && <TestIndex onNavigate={handleNavigate} />}
          {currentView === "turnstile" && <TurnstileTests />}
          {currentView === "log" && <LogTests />}
          {currentView === "options" && <OptionsManagerTests />}
          {currentView === "client" && <ClientComponentTests />}
          {currentView === "tinymce" && <TinyMCETests darkMode={true} />}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
