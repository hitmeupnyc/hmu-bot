"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRoutes = void 0;
const express_1 = require("express");
const WebhookService_1 = require("../services/WebhookService");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.webhookRoutes = router;
const webhookService = new WebhookService_1.WebhookService();
router.post('/eventbrite', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await webhookService.handleEventbriteWebhook(req.body, req.headers);
    res.status(200).json({ success: true });
}));
router.post('/patreon', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await webhookService.handlePatreonWebhook(req.body, req.headers);
    res.status(200).json({ success: true });
}));
router.post('/klaviyo', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await webhookService.handleKlaviyoWebhook(req.body, req.headers);
    res.status(200).json({ success: true });
}));
//# sourceMappingURL=webhookRoutes.js.map