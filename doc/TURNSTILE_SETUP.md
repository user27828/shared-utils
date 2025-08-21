# Cloudflare Turnstile Setup Guide

This guide will help you set up Cloudflare Turnstile with the shared-utils library.

## Prerequisites

1. Cloudflare account
2. Domain managed by Cloudflare (for production)
3. Node.js/npm or yarn for your project

## Step 1: Get Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Security** > **Turnstile**
3. Click **Add Site**
4. Enter your domain name
5. Choose widget type:
   - **Managed** (recommended): Cloudflare decides when to show challenges
   - **Non-interactive**: Always invisible, no user interaction
   - **Invisible**: Shows challenge when needed, but invisible by default
6. Copy your **Site Key** and **Secret Key**

## Step 2: Install and Configure

### Client-Side Setup

```javascript
// In your main client entry point (e.g., src/main.js)
import { turnstile } from '@shared-utils/utils';

turnstile.setOptions({
  siteKey: 'YOUR_SITE_KEY_HERE', // From Cloudflare Dashboard
  widget: {
    theme: 'auto',
    size: 'normal',
  }
});
```

### Server-Side Setup (Option A: Direct API)

```javascript
// In your server code
import { turnstile } from '@shared-utils/utils';

turnstile.setOptions({
  secretKey: process.env.TURNSTILE_SECRET_KEY, // Set as environment variable
});

// Use in your routes
app.post('/api/form', async (req, res) => {
  const token = req.body['cf-turnstile-response'];
  const result = await turnstile.verify(token, req.ip);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Verification failed' });
  }
  
  // Process form...
});
```

### Server-Side Setup (Option B: Cloudflare Worker)

For better security and performance, deploy the included Cloudflare Worker:

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Configure the Worker**:
   ```bash
   cd /path/to/shared-utils/server
   cp wrangler.toml wrangler.local.toml
   # Edit wrangler.local.toml with your settings
   ```

3. **Set Secret Key**:
   ```bash
   wrangler secret put TURNSTILE_SECRET_KEY
   # Enter your secret key when prompted
   ```

4. **Deploy Worker**:
   ```bash
   wrangler deploy
   ```

5. **Update Client Config**:
   ```javascript
   turnstile.setOptions({
     apiUrl: 'https://your-worker.your-subdomain.workers.dev',
   });
   ```

## Step 3: Usage Examples

### Basic Form Integration

```html
<!-- In your HTML form -->
<form id="contact-form">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  
  <!-- Turnstile widget will be rendered here -->
  <div id="turnstile-container"></div>
  
  <button type="submit" id="submit-btn" disabled>Submit</button>
</form>
```

```javascript
// JavaScript
import { turnstile } from '@shared-utils/utils';

// Render Turnstile widget
turnstile.render('#turnstile-container', {
  callback: (token) => {
    document.getElementById('submit-btn').disabled = false;
  },
  'expired-callback': () => {
    document.getElementById('submit-btn').disabled = true;
  }
});

// Handle form submission
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const token = turnstile.getResponse();
  if (!token) {
    alert('Please complete the security check');
    return;
  }

  const formData = new FormData(e.target);
  formData.append('cf-turnstile-response', token);

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      alert('Form submitted successfully!');
      e.target.reset();
      turnstile.reset();
    } else {
      alert('Submission failed. Please try again.');
      turnstile.reset();
    }
  } catch (error) {
    console.error('Submission error:', error);
    turnstile.reset();
  }
});
```

### React Integration

```jsx
import React, { useState } from 'react';
import TurnstileComponent from './turnstile-react-component';

function ContactForm() {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please complete the security verification');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: e.target.name.value,
          email: e.target.email.value,
          message: e.target.message.value,
          turnstileToken: token
        })
      });

      if (response.ok) {
        alert('Message sent successfully!');
        e.target.reset();
        setToken('');
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="name" required />
      <input type="email" name="email" required />
      <textarea name="message" required></textarea>
      
      <TurnstileComponent
        siteKey="YOUR_SITE_KEY"
        onSuccess={setToken}
        onExpired={() => setToken('')}
      />
      
      <button type="submit" disabled={!token || isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Step 4: Environment Variables

Set these environment variables in your deployment:

### Client-Side (Build-time)
```bash
VITE_TURNSTILE_SITE_KEY=your_site_key_here
# or
REACT_APP_TURNSTILE_SITE_KEY=your_site_key_here
# or
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
```

### Server-Side (Runtime)
```bash
TURNSTILE_SECRET_KEY=your_secret_key_here
```

### Cloudflare Worker
- `TURNSTILE_SECRET_KEY`: Your secret key (set via `wrangler secret put`)
- `ALLOWED_ORIGINS`: Comma-separated allowed origins (optional)

## Step 5: Testing

### Test Mode
Cloudflare provides test keys for development:

- **Site Key**: `1x00000000000000000000AA`
- **Secret Key**: `1x0000000000000000000000000000000AA`

These always return successful verification.

### Production Testing
1. Test with your actual keys on a staging environment
2. Verify that failed challenges are handled properly
3. Test token expiration scenarios
4. Test different device types and browsers

## Security Best Practices

1. **Always verify tokens server-side** - Never trust client-side validation
2. **Use HTTPS** - Turnstile requires secure connections in production
3. **Set appropriate CORS headers** - Limit origins that can use your verification endpoint
4. **Monitor verification failures** - Set up logging and alerting for suspicious activity
5. **Handle edge cases** - Network failures, timeouts, and script blocking
6. **Rate limiting** - Implement rate limiting on your verification endpoints

## Troubleshooting

### Common Issues

1. **Widget not loading**:
   - Check site key is correct
   - Verify domain is registered in Cloudflare Dashboard
   - Check for ad blockers or script blockers

2. **Verification failing**:
   - Check secret key is correct
   - Verify token hasn't expired (tokens are valid for 5 minutes)
   - Check server can reach Cloudflare API

3. **CORS errors**:
   - Configure `ALLOWED_ORIGINS` in your Worker
   - Check your server CORS settings

4. **Multiple widgets**:
   - Each widget needs a unique container
   - Use widget IDs to manage multiple instances

### Debug Mode

Enable debug logging:

```javascript
turnstile.setOptions({
  interceptor: (action, data) => {
    console.log(`Turnstile ${action}:`, data);
  }
});
```

## API Reference

See the main Turnstile utility file for complete API documentation:
- `turnstile.render()` - Render widget
- `turnstile.verify()` - Verify token server-side
- `turnstile.getResponse()` - Get current token
- `turnstile.reset()` - Reset widget
- `turnstile.remove()` - Remove widget
- `turnstile.isExpired()` - Check if token expired
