"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const DatabaseService_1 = require("./DatabaseService");
const errorHandler_1 = require("../middleware/errorHandler");
const crypto_1 = __importDefault(require("crypto"));
class WebhookService {
    db = DatabaseService_1.DatabaseService.getInstance().getDatabase();
    async handleEventbriteWebhook(payload, headers) {
        this.verifyEventbriteSignature(payload, headers);
        await this.queueWebhookProcessing('eventbrite', payload);
        console.log('Eventbrite webhook queued for processing:', payload.action);
    }
    async handlePatreonWebhook(payload, headers) {
        this.verifyPatreonSignature(payload, headers);
        await this.queueWebhookProcessing('patreon', payload);
        console.log('Patreon webhook queued for processing:', payload.data?.type);
    }
    async handleKlaviyoWebhook(payload, headers) {
        this.verifyKlaviyoSignature(payload, headers);
        await this.queueWebhookProcessing('klaviyo', payload);
        console.log('Klaviyo webhook queued for processing');
    }
    verifyEventbriteSignature(payload, headers) {
        const signature = headers['x-eventbrite-signature'];
        const secret = process.env.EVENTBRITE_WEBHOOK_SECRET;
        if (!secret) {
            console.warn('Eventbrite webhook secret not configured, skipping verification');
            return;
        }
        if (!signature) {
            throw new errorHandler_1.AppError('Missing webhook signature', 401);
        }
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
        if (signature !== expectedSignature) {
            throw new errorHandler_1.AppError('Invalid webhook signature', 401);
        }
    }
    verifyPatreonSignature(payload, headers) {
        const signature = headers['x-patreon-signature'];
        const secret = process.env.PATREON_WEBHOOK_SECRET;
        if (!secret) {
            console.warn('Patreon webhook secret not configured, skipping verification');
            return;
        }
        if (!signature) {
            throw new errorHandler_1.AppError('Missing webhook signature', 401);
        }
        const expectedSignature = crypto_1.default
            .createHmac('md5', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
        if (signature !== expectedSignature) {
            throw new errorHandler_1.AppError('Invalid webhook signature', 401);
        }
    }
    verifyKlaviyoSignature(payload, headers) {
        const signature = headers['x-klaviyo-signature'];
        const secret = process.env.KLAVIYO_WEBHOOK_SECRET;
        if (!secret) {
            console.warn('Klaviyo webhook secret not configured, skipping verification');
            return;
        }
        if (!signature) {
            throw new errorHandler_1.AppError('Missing webhook signature', 401);
        }
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('base64');
        if (signature !== expectedSignature) {
            throw new errorHandler_1.AppError('Invalid webhook signature', 401);
        }
    }
    async queueWebhookProcessing(platform, payload) {
        const stmt = this.db.prepare(`
      INSERT INTO sync_operations (platform, operation_type, payload_json, status)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(platform, 'webhook', JSON.stringify(payload), 'pending');
    }
}
exports.WebhookService = WebhookService;
//# sourceMappingURL=WebhookService.js.map