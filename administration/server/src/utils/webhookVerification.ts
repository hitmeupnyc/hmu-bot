import crypto from 'crypto';
import { logWebhook } from './logger';

/**
 * Webhook signature verification utilities
 * Each platform has its own signature scheme
 */

export interface VerificationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Verify Klaviyo webhook signature (HMAC SHA-256)
 */
export function verifyKlaviyoSignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  if (!secret) {
    logWebhook.verificationFailed('klaviyo', 'No webhook secret configured');
    return { isValid: false, reason: 'No webhook secret configured' };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Klaviyo sends signature as sha256=<hash>
    const receivedSignature = signature.replace('sha256=', '');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature)
    );

    if (isValid) {
      logWebhook.verified('klaviyo', 'signature_check');
    } else {
      logWebhook.verificationFailed('klaviyo', 'Signature mismatch');
    }

    return { isValid };
  } catch (error) {
    logWebhook.verificationFailed('klaviyo', `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, reason: 'Verification error' };
  }
}

/**
 * Verify Eventbrite webhook signature (HMAC SHA-256)
 */
export function verifyEventbriteSignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  if (!secret) {
    logWebhook.verificationFailed('eventbrite', 'No webhook secret configured');
    return { isValid: false, reason: 'No webhook secret configured' };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (isValid) {
      logWebhook.verified('eventbrite', 'signature_check');
    } else {
      logWebhook.verificationFailed('eventbrite', 'Signature mismatch');
    }

    return { isValid };
  } catch (error) {
    logWebhook.verificationFailed('eventbrite', `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, reason: 'Verification error' };
  }
}

/**
 * Verify Patreon webhook signature (HMAC MD5)
 */
export function verifyPatreonSignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  if (!secret) {
    logWebhook.verificationFailed('patreon', 'No webhook secret configured');
    return { isValid: false, reason: 'No webhook secret configured' };
  }

  try {
    const expectedSignature = crypto
      .createHmac('md5', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (isValid) {
      logWebhook.verified('patreon', 'signature_check');
    } else {
      logWebhook.verificationFailed('patreon', 'Signature mismatch');
    }

    return { isValid };
  } catch (error) {
    logWebhook.verificationFailed('patreon', `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, reason: 'Verification error' };
  }
}

/**
 * Verify Discord webhook signature (Ed25519)
 * Discord uses a more complex verification process
 */
export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): VerificationResult {
  if (!publicKey) {
    logWebhook.verificationFailed('discord', 'No public key configured');
    return { isValid: false, reason: 'No public key configured' };
  }

  try {
    // Discord sends timestamp + body for verification
    const message = timestamp + body;
    
    // For now, we'll implement a basic check
    // In production, you'd want to use the discord-interactions library
    // which properly implements Ed25519 verification
    
    // Basic timestamp check (Discord requires requests to be recent)
    const timestampNum = parseInt(timestamp);
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    if (timestampNum < fiveMinutesAgo) {
      logWebhook.verificationFailed('discord', 'Timestamp too old');
      return { isValid: false, reason: 'Timestamp too old' };
    }

    // TODO: Implement proper Ed25519 verification
    // For now, just verify timestamp is present and recent
    const isValid = signature.length > 0 && timestamp.length > 0;

    if (isValid) {
      logWebhook.verified('discord', 'basic_check');
    } else {
      logWebhook.verificationFailed('discord', 'Missing signature or timestamp');
    }

    return { isValid };
  } catch (error) {
    logWebhook.verificationFailed('discord', `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, reason: 'Verification error' };
  }
}

/**
 * Generic webhook verification dispatcher
 */
export function verifyWebhookSignature(
  platform: string,
  payload: string,
  signature: string,
  secret: string,
  additionalParams?: { timestamp?: string; publicKey?: string }
): VerificationResult {
  // Allow bypassing verification in development
  if (process.env.DISABLE_WEBHOOK_VERIFICATION === 'true' && process.env.NODE_ENV === 'development') {
    logWebhook.verified(platform, 'verification_disabled');
    return { isValid: true, reason: 'Verification disabled for development' };
  }

  switch (platform.toLowerCase()) {
    case 'klaviyo':
      return verifyKlaviyoSignature(payload, signature, secret);
    
    case 'eventbrite':
      return verifyEventbriteSignature(payload, signature, secret);
    
    case 'patreon':
      return verifyPatreonSignature(payload, signature, secret);
    
    case 'discord':
      return verifyDiscordSignature(
        payload, 
        signature, 
        additionalParams?.timestamp || '', 
        additionalParams?.publicKey || secret
      );
    
    default:
      logWebhook.verificationFailed(platform, 'Unknown platform');
      return { isValid: false, reason: 'Unknown platform' };
  }
}

/**
 * Express middleware factory for webhook verification
 */
export function createWebhookVerificationMiddleware(platform: string, getSecret: () => string) {
  return (req: any, res: any, next: any) => {
    // Get raw body for signature verification
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-signature'] || 
                     req.headers['x-signature-ed25519'] || 
                     req.headers['x-patreon-signature'] ||
                     req.headers['x-eventbrite-signature'];
    
    const timestamp = req.headers['x-signature-timestamp'] || 
                     req.headers['x-timestamp'];

    if (!signature) {
      logWebhook.verificationFailed(platform, 'No signature header present');
      return res.status(401).json({ 
        error: 'Missing signature header',
        platform 
      });
    }

    const secret = getSecret();
    const result = verifyWebhookSignature(platform, payload, signature, secret, { 
      timestamp: timestamp as string 
    });

    if (!result.isValid) {
      return res.status(401).json({ 
        error: 'Invalid webhook signature',
        reason: result.reason,
        platform 
      });
    }

    // Add verification info to request for debugging
    req.webhookVerified = true;
    req.webhookPlatform = platform;
    
    next();
  };
}

/**
 * Utility function to safely handle webhook timing attacks
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}