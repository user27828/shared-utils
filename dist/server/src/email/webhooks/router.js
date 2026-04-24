import { Router, raw } from "express";
import { log } from "../../../../utils/index.js";
import { createMailerliteWebhookHandler } from "./mailerlite.js";
import { createResendWebhookHandler } from "./resend.js";
import { createSesWebhookHandler } from "./ses.js";
const webhookHandlers = new Map();
let eventHandlers = {};
const normalizeHeaders = (headers) => {
    return Object.fromEntries(Object.entries(headers).map(([key, value]) => {
        if (Array.isArray(value)) {
            return [key, value.join(",")];
        }
        return [key, value ?? ""];
    }));
};
const initializeHandlers = () => {
    if (webhookHandlers.size > 0) {
        return;
    }
    const mailerliteHandler = createMailerliteWebhookHandler();
    webhookHandlers.set("mailerlite", mailerliteHandler);
    const resendHandler = createResendWebhookHandler();
    webhookHandlers.set("resend", resendHandler);
    const sesHandler = createSesWebhookHandler();
    webhookHandlers.set("ses", sesHandler);
    log.debug?.("EmailWebhooks: Handlers initialized", {
        providers: Array.from(webhookHandlers.keys()),
    });
};
export const registerWebhookHandlers = (handlers) => {
    eventHandlers = { ...eventHandlers, ...handlers };
    log.debug?.("EmailWebhooks: Event handlers registered", {
        events: Object.keys(handlers),
    });
};
const processEvent = async (event) => {
    log.info?.("EmailWebhooks: Processing event", {
        type: event.type,
        provider: event.provider,
        email: event.email,
        messageId: event.messageId,
    });
    const handler = eventHandlers[event.type];
    if (handler) {
        try {
            await handler(event);
            log.debug?.("EmailWebhooks: Event handled", {
                type: event.type,
                email: event.email,
            });
        }
        catch (error) {
            const err = error;
            log.error?.("EmailWebhooks: Event handler failed", {
                type: event.type,
                email: event.email,
                error: err.message,
            });
            throw err;
        }
        return;
    }
    log.debug?.("EmailWebhooks: No handler for event type", {
        type: event.type,
    });
};
export const createWebhookRouter = () => {
    initializeHandlers();
    const router = Router();
    router.post("/:provider", raw({ type: "*/*" }), async (req, res) => {
        const provider = Array.isArray(req.params.provider)
            ? req.params.provider[0] || ""
            : req.params.provider || "";
        log.debug?.("EmailWebhooks: Received webhook", {
            provider,
            contentType: req.headers["content-type"],
        });
        const handler = webhookHandlers.get(provider.toLowerCase());
        if (!handler) {
            log.warn?.("EmailWebhooks: Unknown provider", { provider });
            return res.status(404).json({ error: "Unknown provider" });
        }
        if (!Buffer.isBuffer(req.body)) {
            const error = "Webhook raw body unavailable. Mount createWebhookRouter() before JSON/body parsers.";
            log.error?.("EmailWebhooks: Raw body unavailable for verification", {
                provider,
                bodyType: typeof req.body,
            });
            return res.status(500).json({ received: false, error });
        }
        const rawBody = req.body;
        const headers = normalizeHeaders(req.headers);
        let verified = false;
        try {
            verified = await handler.verify(rawBody, headers);
        }
        catch (error) {
            const err = error;
            log.error?.("EmailWebhooks: Verification threw an error", {
                provider,
                error: err.message,
            });
            return res.status(500).json({ received: false, error: err.message });
        }
        if (!verified) {
            log.warn?.("EmailWebhooks: Verification failed", { provider });
            return res.status(401).json({ error: "Invalid signature" });
        }
        try {
            const rawBodyText = rawBody.toString("utf8");
            let parsedBody = rawBodyText;
            if (rawBodyText) {
                try {
                    parsedBody = JSON.parse(rawBodyText);
                }
                catch {
                    parsedBody = rawBodyText;
                }
            }
            else {
                parsedBody = undefined;
            }
            const payload = handler.preprocess
                ? await handler.preprocess(parsedBody, headers)
                : parsedBody;
            if (payload == null) {
                return res.status(200).json({ received: true, count: 0 });
            }
            const events = handler.parse(payload);
            log.debug?.("EmailWebhooks: Parsed events", {
                provider,
                count: events.length,
            });
            for (const event of events) {
                await processEvent(event);
            }
            return res.status(200).json({ received: true, count: events.length });
        }
        catch (error) {
            const err = error;
            log.error?.("EmailWebhooks: Processing failed", {
                provider,
                error: err.message,
            });
            return res.status(500).json({ received: false, error: err.message });
        }
    });
    router.get("/:provider", (req, res) => {
        const provider = Array.isArray(req.params.provider)
            ? req.params.provider[0] || ""
            : req.params.provider || "";
        const challenge = req.query.challenge || req.query["hub.challenge"];
        if (challenge) {
            return res.status(200).send(challenge);
        }
        return res.status(200).json({
            provider,
            status: "ready",
            timestamp: new Date().toISOString(),
        });
    });
    return router;
};
//# sourceMappingURL=router.js.map