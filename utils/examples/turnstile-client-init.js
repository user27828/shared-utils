/**
 * Client-side Turnstile initialization example
 * Include this in your main client entry point (e.g., src/main.js, src/index.js)
 */
import { turnstile } from '@shared-utils/utils';

// Configure Turnstile for client-side
turnstile.setOptions({
  siteKey: 'YOUR_TURNSTILE_SITE_KEY', // Get this from Cloudflare Dashboard
  widget: {
    theme: 'auto', // 'light', 'dark', or 'auto'
    size: 'normal', // 'normal' or 'compact'
    appearance: 'always', // 'always', 'execute', or 'interaction-only'
    retry: 'auto',
    'retry-interval': 8000,
    'refresh-expired': 'auto',
  },
  // Optional: Add custom interceptor for analytics/monitoring
  interceptor: (action, data) => {
    console.log(`Turnstile ${action}:`, data);
    
    // Example: Send events to analytics
    if (action === 'render-success' && window.gtag) {
      window.gtag('event', 'turnstile_rendered', {
        widget_id: data.widgetId,
      });
    }
    
    if (action === 'verify-complete' && window.gtag) {
      window.gtag('event', 'turnstile_verified', {
        success: data.result.success,
      });
    }
  }
});

// Example: Render widget in a form
async function setupTurnstileInForm() {
  try {
    const widgetId = await turnstile.render('#turnstile-container', {
      callback: (token) => {
        console.log('Turnstile token received:', token);
        // Enable form submission or handle token
        document.getElementById('submit-btn').disabled = false;
      },
      'error-callback': (error) => {
        console.error('Turnstile error:', error);
        // Handle error (show message to user, etc.)
      },
      'expired-callback': () => {
        console.log('Turnstile token expired');
        // Disable form submission until renewed
        document.getElementById('submit-btn').disabled = true;
      }
    });

    console.log('Turnstile widget rendered with ID:', widgetId);
  } catch (error) {
    console.error('Failed to render Turnstile:', error);
  }
}

// Example: Get token for form submission
function getTokenForSubmission() {
  const token = turnstile.getResponse();
  if (!token) {
    alert('Please complete the Turnstile challenge');
    return null;
  }
  return token;
}

// Example: Reset widget on form error
function resetTurnstileOnError() {
  turnstile.reset();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  turnstile.cleanup();
});

export default turnstile;
