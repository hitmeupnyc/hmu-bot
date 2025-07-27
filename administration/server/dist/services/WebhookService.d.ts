export declare class WebhookService {
    private db;
    handleEventbriteWebhook(payload: any, headers: Record<string, any>): Promise<void>;
    handlePatreonWebhook(payload: any, headers: Record<string, any>): Promise<void>;
    handleKlaviyoWebhook(payload: any, headers: Record<string, any>): Promise<void>;
    private verifyEventbriteSignature;
    private verifyPatreonSignature;
    private verifyKlaviyoSignature;
    private queueWebhookProcessing;
}
//# sourceMappingURL=WebhookService.d.ts.map