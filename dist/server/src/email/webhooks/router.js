import { Router, raw } from "express";
import { log } from "../../../../utils/index.js";
import { formatCompactLogLine, formatCompactLogList, formatHierarchicalLog, formatCompactLogText, formatCompactLogValue, } from "../logFormat.js";
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
    log.debug?.(formatHierarchicalLog("EmailWebhooks: Handlers initialized", [
        formatCompactLogLine([
            ["providers", formatCompactLogList(Array.from(webhookHandlers.keys()))],
        ]),
    ]));
};
export const registerWebhookHandlers = (handlers) => {
    eventHandlers = { ...eventHandlers, ...handlers };
    log.debug?.(formatHierarchicalLog("EmailWebhooks: Event handlers registered", [
        formatCompactLogLine([
            ["events", formatCompactLogList(Object.keys(handlers))],
        ]),
    ]));
};
const processEvent = async (event) => {
    log.info?.(formatHierarchicalLog("EmailWebhooks: Processing event", [
        formatCompactLogLine([
            ["type", formatCompactLogText(event.type)],
            ["provider", formatCompactLogValue(event.provider)],
            ["email", formatCompactLogText(event.email)],
            ["messageId", formatCompactLogValue(event.messageId)],
        ]),
    ]));
    const handler = eventHandlers[event.type];
    if (handler) {
        try {
            await handler(event);
            log.debug?.(formatHierarchicalLog("EmailWebhooks: Event handled", [
                formatCompactLogLine([
                    ["type", formatCompactLogText(event.type)],
                    ["email", formatCompactLogText(event.email)],
                ]),
            ]));
        }
        catch (error) {
            const err = error;
            log.error?.(formatHierarchicalLog("EmailWebhooks: Event handler failed", [
                formatCompactLogLine([
                    ["type", formatCompactLogText(event.type)],
                    ["email", formatCompactLogText(event.email)],
                ]),
                formatCompactLogLine([["error", formatCompactLogText(err.message)]]),
            ]));
            throw err;
        }
        return;
    }
    log.debug?.(formatHierarchicalLog("EmailWebhooks: No handler for event type", [
        formatCompactLogLine([["type", formatCompactLogText(event.type)]]),
    ]));
};
export const createWebhookRouter = () => {
    initializeHandlers();
    const router = Router();
    router.post("/:provider", raw({ type: "*/*" }), async (req, res) => {
        const provider = Array.isArray(req.params.provider)
            ? req.params.provider[0] || ""
            : req.params.provider || "";
        log.debug?.(formatHierarchicalLog("EmailWebhooks: Received webhook", [
            formatCompactLogLine([
                ["provider", formatCompactLogValue(provider)],
                [
                    "contentType",
                    formatCompactLogText(Array.isArray(req.headers["content-type"])
                        ? req.headers["content-type"].join(",")
                        : req.headers["content-type"]),
                ],
            ]),
        ]));
        const handler = webhookHandlers.get(provider.toLowerCase());
        if (!handler) {
            log.warn?.(formatHierarchicalLog("EmailWebhooks: Unknown provider", [
                formatCompactLogLine([
                    ["provider", formatCompactLogValue(provider)],
                ]),
            ]));
            return res.status(404).json({ error: "Unknown provider" });
        }
        if (!Buffer.isBuffer(req.body)) {
            const error = "Webhook raw body unavailable. Mount createWebhookRouter() before JSON/body parsers.";
            log.error?.(formatHierarchicalLog("EmailWebhooks: Raw body unavailable for verification", [
                formatCompactLogLine([
                    ["provider", formatCompactLogValue(provider)],
                    ["bodyType", formatCompactLogText(typeof req.body)],
                ]),
            ]));
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
            log.error?.(formatHierarchicalLog("EmailWebhooks: Verification threw an error", [
                formatCompactLogLine([
                    ["provider", formatCompactLogValue(provider)],
                    ["error", formatCompactLogText(err.message)],
                ]),
            ]));
            return res.status(500).json({ received: false, error: err.message });
        }
        if (!verified) {
            log.warn?.(formatHierarchicalLog("EmailWebhooks: Verification failed", [
                formatCompactLogLine([
                    ["provider", formatCompactLogValue(provider)],
                ]),
            ]));
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
            log.debug?.(formatHierarchicalLog("EmailWebhooks: Parsed events", [
                formatCompactLogLine([
                    ["provider", formatCompactLogValue(provider)],
                    ["count", String(events.length)],
                ]),
            ]));
            for (const event of events) {
                await processEvent(event);
            }
            return res.status(200).json({ received: true, count: events.length });
        }
        catch (error) {
            const err = error;
            log.error?.(formatHierarchicalLog("EmailWebhooks: Processing failed", [
                formatCompactLogLine([
                    ["provider", formatCompactLogValue(provider)],
                    ["error", formatCompactLogText(err.message)],
                ]),
            ]));
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