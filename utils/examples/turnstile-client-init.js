/**
 * Client-side Turnstile initialization example
 * Include this in your main client entry point (e.g., src/main.js, src/index.js)
 */
import { turnstile } from "@shared-utils/utils";

// Configure Turnstile for client-side
turnstile.setOptions({
  siteKey: "YOUR_TURNSTILE_SITE_KEY", // Get this from Cloudflare Dashboard
  widget: {
    theme: "auto", // 'light', 'dark', or 'auto'
    size: "flexible", // 'normal', 'compact', or 'flexible'
    appearance: "always", // 'always', 'execute', or 'interaction-only'
    execution: "render", // 'render' or 'execute'
    retry: "auto",
    "retry-interval": 8000,
    "refresh-expired": "auto",
  },
});

// Example: Render widget in a form
async function setupTurnstileInForm() {
  try {
    const widgetId = await turnstile.render("#turnstile-container", {
      action: "contact-form",
      callback: (token) => {
        console.log("Turnstile token received:", token);

        if (window.gtag) {
          window.gtag("event", "turnstile_token_received", {
            token_present: Boolean(token),
          });
        }

        // Enable form submission or handle token
        document.getElementById("submit-btn").disabled = false;
      },
      "error-callback": (errorCode) => {
        console.error("Turnstile error:", errorCode);

        if (window.gtag) {
          window.gtag("event", "turnstile_error", {
            error_code: errorCode || "unknown",
          });
        }

        // Handle error (show message to user, etc.)
      },
      "expired-callback": () => {
        console.log("Turnstile token expired");

        if (window.gtag) {
          window.gtag("event", "turnstile_expired");
        }

        // Disable form submission until renewed
        document.getElementById("submit-btn").disabled = true;
      },
    });

    console.log("Turnstile widget rendered with ID:", widgetId);
  } catch (error) {
    console.error("Failed to render Turnstile:", error);
  }
}

// Example: Get token for form submission
function getTokenForSubmission() {
  const token = turnstile.getResponse();
  if (!token) {
    alert("Please complete the Turnstile challenge");
    return null;
  }
  return token;
}

// Example: Reset widget on form error
function resetTurnstileOnError() {
  turnstile.reset();
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  turnstile.cleanup();
});

export default turnstile;
