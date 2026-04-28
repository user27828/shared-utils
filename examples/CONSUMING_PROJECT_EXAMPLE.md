# Example: Deploying Turnstile in a Consuming Project

This example shows the current shared-utils Turnstile shape:

- client widget rendering from `@user27828/shared-utils/utils`
- strict verification from `@user27828/shared-utils/server`
- optional Cloudflare Worker deployment for edge verification

## Reference Worker

```typescript
// workers/turnstile-worker.ts
import { createTurnstileWorker } from "@user27828/shared-utils/server";

export default createTurnstileWorker({
  allowedOrigins: ["https://myapp.com"],
  expectedAction: "contact-form",
  expectedHostname: "myapp.com",
});
```

```toml
# workers/turnstile/wrangler.toml
name = "myapp-turnstile"
main = "../turnstile-worker.ts"
compatibility_date = "2026-04-27"

[vars]
ALLOWED_ORIGINS = "https://myapp.com"
```

```bash
cd workers/turnstile
wrangler secret put TURNSTILE_SECRET_KEY
wrangler deploy
```

## Direct Server Verification

```typescript
import { verifyTurnstileToken } from "@user27828/shared-utils/server";

app.post("/api/contact", async (req, res) => {
  const { turnstileToken, ...formData } = req.body;

  const verification = await verifyTurnstileToken(turnstileToken, {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    remoteip: req.ip,
    expectedAction: "contact-form",
    expectedHostname: "myapp.com",
  });

  if (!verification.success) {
    return res.status(400).json({
      error: "Turnstile verification failed",
      codes: verification["error-codes"],
    });
  }

  res.json({ success: true, formData });
});
```

## Browser Widget

```html
<script type="module">
  import { turnstile } from "@user27828/shared-utils/utils";

  turnstile.setOptions({
    siteKey: "YOUR_SITE_KEY",
    widget: {
      size: "flexible",
      theme: "auto",
    },
  });

  let widgetId = null;
  let turnstileToken = "";

  async function mountWidget() {
    widgetId = await turnstile.render("#turnstile-container", {
      action: "contact-form",
      callback: (token) => {
        turnstileToken = token;
      },
      "expired-callback": () => {
        turnstileToken = "";
      },
    });
  }

  await mountWidget();

  document
    .getElementById("contact-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!turnstileToken) {
        alert("Complete the Turnstile check first.");
        return;
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: event.target.name.value,
          email: event.target.email.value,
          message: event.target.message.value,
          turnstileToken,
        }),
      });

      if (!response.ok) {
        turnstile.reset(widgetId);
        turnstileToken = "";
      }
    });
</script>
```

## Environment Variables

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here
```
