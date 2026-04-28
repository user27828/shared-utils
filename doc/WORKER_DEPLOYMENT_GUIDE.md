# Deploying Turnstile Worker from Consuming Projects

This guide covers the supported ways to use the shared-utils Turnstile Worker from another project.

## Strategy 1: Reference Worker

Create a small Worker file that imports the factory from the package.

```typescript
// workers/turnstile-worker.ts
import { createTurnstileWorker } from "@user27828/shared-utils/server";

export default createTurnstileWorker({
  allowedOrigins: ["https://myapp.com", "https://www.myapp.com"],
  expectedAction: "contact-form",
  expectedHostname: "myapp.com",
});
```

Wrangler example:

```toml
name = "my-app-turnstile"
main = "../turnstile-worker.ts"
compatibility_date = "2026-04-27"

[vars]
ALLOWED_ORIGINS = "https://myapp.com,https://www.myapp.com"
```

Set the secret separately:

```bash
cd workers/turnstile
wrangler secret put TURNSTILE_SECRET_KEY
wrangler deploy
```

## Strategy 2: Vendor the Worker

If you need to own the Worker source, start from these repository files:

- [server/turnstile-worker.ts](../server/turnstile-worker.ts)
- [server/wrangler.toml](../server/wrangler.toml)

Copy them into your app and customize as needed.

Do not copy from the installed root package expecting workspace source paths. The published package ships compiled output under `dist/`, not the repository's `server/` workspace tree.

## Strategy 3: Server-Side Integration Only

If you already have an application server, you may not need a Worker at all.

```typescript
import { verifyTurnstileToken } from "@user27828/shared-utils/server";

app.post("/api/contact", async (req, res) => {
  const token = req.body.turnstileToken || req.body["cf-turnstile-response"];

  const result = await verifyTurnstileToken(token, {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    remoteip: req.ip,
    expectedAction: "contact-form",
    expectedHostname: "myapp.com",
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result["error-codes"],
    });
  }

  res.json({ success: true });
});
```

## Browser and CORS Notes

- If the Worker receives a browser `Origin` header, it only allows origins configured in `allowedOrigins` or `ALLOWED_ORIGINS`.
- If the request has no `Origin` header, the Worker treats it as server-to-server and skips CORS checks.
- Avoid `*` in production. Keep the allowed-origin list explicit.

## Recommended Scripts

```json
{
  "scripts": {
    "cf:setup-turnstile": "mkdir -p workers/turnstile",
    "cf:deploy-turnstile": "cd workers/turnstile && wrangler deploy",
    "cf:deploy-turnstile:production": "cd workers/turnstile && wrangler deploy --env production"
  }
}
```

## Environment Variables

```bash
TURNSTILE_SECRET_KEY=your_secret_key_here
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com
```

## Operational Guidance

1. Keep the site key in the browser and the secret key on the server or Worker only.
2. Validate `expectedAction` and `expectedHostname` whenever you can.
3. Use the Worker only when you want an edge verification endpoint. A normal application server is simpler when you already have one.
