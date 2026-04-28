# Cloudflare Turnstile Setup Guide

This guide follows Cloudflare's current Turnstile model:

1. Render the widget in the browser.
2. Submit the token to your server.
3. Verify the token server-side on every protected request.

The shared-utils package mirrors that split directly:

- `@user27828/shared-utils/utils` handles browser-side widget rendering.
- `@user27828/shared-utils/server` handles token verification, middleware, and Worker deployment.

## Prerequisites

1. Create a Turnstile widget in Cloudflare and copy the site key and secret key.
2. Use `http://` or `https://` pages for the client widget.
3. Keep the secret key on the server only.

## Client-Side Setup

Use the browser helper for explicit-render flows such as SPAs and dynamic forms.

```javascript
import { turnstile } from "@user27828/shared-utils/utils";

turnstile.setOptions({
  siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  widget: {
    theme: "auto",
    size: "flexible",
  },
});

const widgetId = await turnstile.render("#turnstile-container", {
  action: "contact-form",
  callback: (token) => {
    console.log("Turnstile token received", token);
  },
  "expired-callback": () => {
    turnstile.reset(widgetId);
  },
});
```

The helper loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` automatically and exposes the standard widget lifecycle methods.

If you are building a static page and want Cloudflare's implicit rendering, use Cloudflare's raw HTML pattern directly instead of the helper.

## Server-Side Verification

Verify every token on your backend.

```javascript
import { verifyTurnstileToken } from "@user27828/shared-utils/server";

app.post("/api/contact", async (req, res) => {
  const token = req.body.turnstileToken || req.body["cf-turnstile-response"];

  const result = await verifyTurnstileToken(token, {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    remoteip: req.ip,
    expectedAction: "contact-form",
    expectedHostname: "example.com",
  });

  if (!result.success) {
    return res.status(400).json({
      error: "Turnstile verification failed",
      codes: result["error-codes"],
    });
  }

  res.json({ success: true });
});
```

The verifier adds two library-level failure codes when you opt into extra checks:

- `action-mismatch`
- `hostname-mismatch`

## Express Middleware

If you want a reusable route guard, configure `turnstile-server` once and use the middleware.

```javascript
import { optionsManager } from "@user27828/shared-utils/utils";
import { createTurnstileMiddleware } from "@user27828/shared-utils/server";

optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    expectedAction: "contact-form",
    expectedHostname: "example.com",
  },
});

const verifyTurnstile = createTurnstileMiddleware();

app.post("/api/contact", verifyTurnstile, (req, res) => {
  res.json({ success: true, hostname: req.turnstile.hostname });
});
```

## Cloudflare Worker Setup

If you want the verification endpoint at the edge, deploy the Worker factory.

```typescript
import { createTurnstileWorker } from "@user27828/shared-utils/server";

export default createTurnstileWorker({
  allowedOrigins: ["https://example.com"],
  expectedAction: "contact-form",
  expectedHostname: "example.com",
});
```

The Worker verifies tokens with Siteverify, enforces configured browser origins for cross-origin calls, and does not bypass verification in development or on localhost.

## Environment Variables

Client-side:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
```

Server-side:

```bash
TURNSTILE_SECRET_KEY=your_secret_key_here
```

Worker variables:

```bash
TURNSTILE_SECRET_KEY=your_secret_key_here
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

## Test Keys

Cloudflare provides test credentials that always produce dummy outcomes:

- Site key: `1x00000000000000000000AA`
- Secret key: `1x0000000000000000000000000000000AA`

Use them only for local development and automated tests.

## Best Practices

1. Verify every token on the server. Do not trust browser callbacks alone.
2. Set `action` on the widget and validate `expectedAction` on the server.
3. Validate `expectedHostname` when you know the serving hostname in advance.
4. Reset the widget after expired or failed submissions.
5. Keep Worker `allowedOrigins` explicit in production. Avoid `*`.
