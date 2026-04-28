# Server-Side Turnstile Integration

This package verifies Cloudflare Turnstile tokens on the server or in Cloudflare Workers.

It follows the strict Cloudflare flow directly:

1. The browser renders the widget and submits a token.
2. Your server or Worker calls Siteverify.
3. The request is accepted only when verification succeeds.

There is no development or localhost bypass in the Turnstile helpers.

## Quick Start

```javascript
import express from "express";
import { optionsManager } from "@user27828/shared-utils/utils";
import { createTurnstileMiddleware } from "@user27828/shared-utils/server";

const app = express();
app.use(express.json());

optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    expectedAction: "contact-form",
    expectedHostname: "example.com",
  },
});

app.post("/api/contact", createTurnstileMiddleware(), (req, res) => {
  res.json({ success: true, hostname: req.turnstile.hostname });
});
```

## Direct Verification

Use the verifier directly when middleware is too opinionated for your route.

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

## Middleware

`createTurnstileMiddleware(options?)` reads configuration from `turnstile-server` and checks these request fields in order:

1. `cf-turnstile-response`
2. `turnstileToken`
3. `token`

Override the first field with `tokenFieldName` if needed.

## Worker Factory

Deploy the Worker when you want verification at the edge.

```typescript
import { createTurnstileWorker } from "@user27828/shared-utils/server";

export default createTurnstileWorker({
  allowedOrigins: ["https://example.com"],
  expectedAction: "contact-form",
  expectedHostname: "example.com",
  timeoutMs: 10000,
});
```

Behavior summary:

- `OPTIONS` returns CORS headers only for allowed origins.
- Browser requests from disallowed origins receive `403`.
- Requests without an `Origin` header are treated as server-to-server.
- Verification failures return `400` with Turnstile error codes.
- Transport or runtime failures return `500` with `internal-error`.

## Configuration

```typescript
interface TurnstileServerOptions {
  secretKey?: string;
  expectedAction?: string;
  expectedHostname?: string;
  timeoutMs?: number;
  apiUrl?: string;
  allowedOrigins?: string[];
  tokenFieldName?: string;
}
```

## Error Codes

Cloudflare error codes pass through unchanged.

The shared-utils verifier also adds two local validation codes when you opt into additional checks:

- `action-mismatch`
- `hostname-mismatch`

## Exported APIs

- `verifyTurnstileToken(token, options)`
- `createTurnstileMiddleware(options?)`
- `createTurnstileWorker(config?)`
- `getTurnstileServerOptions()`
- `setGlobalOptions({ "turnstile-server": ... })`
- `getAllowedOrigin(request, env)`

## Best Practices

1. Verify every token on the server. Never trust the browser callback by itself.
2. Set a Turnstile `action` on the client and validate `expectedAction` on the server.
3. Validate `expectedHostname` when the hostname is stable.
4. Keep Worker `allowedOrigins` explicit in production.
5. Reset the widget after failed or expired submissions so users get a fresh token.
