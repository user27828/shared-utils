import React from "react";
import TestIndex from "./components/TestIndex";
import TurnstileTests from "./components/TurnstileTests";
import LogTests from "./components/LogTests";

const App: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<
    "index" | "turnstile" | "log"
  >("index");

  const handleNavigate = (view: "index" | "turnstile" | "log") => {
    setCurrentView(view);
  };

  return (
    <div className="App">
      <header>
        <h1>Shared Utils Test Consumer</h1>
        <p>Integration testing environment for @user27828/shared-utils</p>

        <nav style={{ margin: "1rem 0" }}>
          <button
            onClick={() => handleNavigate("index")}
            style={{
              backgroundColor: currentView === "index" ? "#646cff" : "#1a1a1a",
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
        </nav>
      </header>

      <main>
        {currentView === "index" && <TestIndex onNavigate={handleNavigate} />}
        {currentView === "turnstile" && <TurnstileTests />}
        {currentView === "log" && <LogTests />}
      </main>
    </div>
  );
};

export default App;
