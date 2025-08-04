# Data Sync Service Architecture

## Overview
The sync service will act as the central hub for integrating member data from multiple third-party platforms (Eventbrite, Patreon, Klaviyo) into our club management system's single source of truth.

## Integration Requirements Summary

### Eventbrite API
- **Authentication**: OAuth 2.0
- **Webhooks**: Real-time events for registrations, check-ins, cancellations
- **Key Events**: `order.placed`, `attendee.updated`, `event.published`
- **Rate Limits**: Standard OAuth rate limiting
- **Data**: Event attendees, registration details, event metadata

### Patreon API
- **Authentication**: OAuth 2.0 with refresh tokens (monthly expiry)
- **Webhooks**: `members:create`, `members:delete`, `members:update`
- **Scopes**: `w:campaigns.webhook`, `identity`, `campaigns`
- **Rate Limits**: Per-token rate limiting
- **Data**: Patron membership levels, payment status, campaign data

### Klaviyo API
- **Authentication**: OAuth 2.0 or API Key (OAuth preferred for integrations)
- **Webhooks**: Email events, subscription changes, profile updates
- **Requirements**: Advanced KDP customer access for webhook management
- **Rate Limits**: Per-token rate limiting
- **Data**: Email engagement, subscription status, profile data

## Service Architecture

### Core Components

#### 1. Sync Service Manager
```
┌─────────────────────────────────────┐
│           Sync Manager              │
├─────────────────────────────────────┤
│ - Orchestrates all sync operations  │
│ - Manages webhook endpoints         │
│ - Handles auth token refresh        │
│ - Conflict resolution               │
│ - Retry logic & error handling      │
└─────────────────────────────────────┘
```

#### 2. Platform-Specific Adapters
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Eventbrite │  │   Patreon   │  │   Klaviyo   │
│   Adapter   │  │   Adapter   │  │   Adapter   │
├─────────────┤  ├─────────────┤  ├─────────────┤
│ - OAuth mgmt│  │ - OAuth mgmt│  │ - OAuth mgmt│
│ - Webhook rx│  │ - Webhook rx│  │ - Webhook rx│
│ - Data norm │  │ - Data norm │  │ - Data norm │
│ - API calls │  │ - API calls │  │ - API calls │
└─────────────┘  └─────────────┘  └─────────────┘
```

#### 3. Data Normalization Layer
```
┌─────────────────────────────────────┐
│        Data Normalizer              │
├─────────────────────────────────────┤
│ - Converts platform data to         │
│   standard member schema            │
│ - Handles field mapping             │
│ - Data validation & sanitization    │
│ - Duplicate detection logic         │
└─────────────────────────────────────┘
```

#### 4. Conflict Resolution Engine
```
┌─────────────────────────────────────┐
│       Conflict Resolver             │
├─────────────────────────────────────┤
│ - Timestamp-based priority          │
│ - Platform precedence rules         │
│ - Manual review queue               │
│ - Audit trail for changes           │
└─────────────────────────────────────┘
```

### Database Schema Updates

Add to existing schema:
```sql
-- Sync operation tracking
CREATE TABLE sync_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL, -- 'eventbrite', 'patreon', 'klaviyo'
    operation_type TEXT NOT NULL, -- 'webhook', 'bulk_sync', 'manual'
    external_id TEXT,
    member_id INTEGER,
    status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'conflict'
    payload_json TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (member_id) REFERENCES members (id)
);

-- Conflict resolution queue
CREATE TABLE sync_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    field_name TEXT NOT NULL,
    current_value TEXT,
    incoming_value TEXT,
    resolution TEXT, -- 'pending', 'keep_current', 'accept_incoming', 'manual'
    resolved_by_member_id INTEGER,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id),
    FOREIGN KEY (resolved_by_member_id) REFERENCES members (id)
);

-- OAuth token storage
CREATE TABLE oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at DATETIME,
    scope TEXT,
    flags INTEGER DEFAULT 1, -- Bitfield: 1=active
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Webhook Endpoints

### Unified Webhook Handler
```
POST /api/webhooks/{platform}
```

Each platform adapter will:
1. Verify webhook signature
2. Parse platform-specific payload
3. Queue for async processing
4. Return 200 OK immediately

### Webhook Event Processing
```
┌─────────────────┐
│ Webhook Received│
├─────────────────┤
│ 1. Verify sig   │
│ 2. Queue event  │ 
│ 3. Return 200   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Async Processor │
├─────────────────┤
│ 1. Dequeue      │
│ 2. Normalize    │
│ 3. Conflict     │
│    resolution   │
│ 4. Update DB    │
│ 5. Log result   │
└─────────────────┘
```

## Data Flow Examples

### Eventbrite Registration Webhook
```
Eventbrite Event → Webhook → Normalize → Check Member Exists
                                              │
                               ┌──────────────┴──────────────┐
                               ▼                             ▼
                        Create New Member            Update Existing Member
                               │                             │
                               ▼                             ▼
                        Add to external_integrations    Update attendance
```

### Patreon Membership Change
```
Patreon Update → Webhook → Normalize → Find Member by Email
                                              │
                               ┌──────────────┴──────────────┐
                               ▼                             ▼
                        Create Conflict Entry        Update Membership
                        (if data differs)            Update professional_affiliate
```

## Error Handling & Retry Logic

### Retry Strategy
- **Webhook failures**: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- **API rate limits**: Respect Retry-After headers
- **Auth failures**: Auto-refresh tokens, then retry
- **Network errors**: Circuit breaker pattern

### Dead Letter Queue
Failed operations after max retries go to:
- Manual review queue
- Admin notification system
- Periodic retry attempts (daily)

## Security Considerations

### Webhook Security
- HMAC signature verification for all platforms
- IP allowlisting where supported
- Rate limiting on webhook endpoints
- Request payload size limits

### Token Management
- Encrypted storage of OAuth tokens
- Automatic refresh 24h before expiry
- Secure credential rotation
- Audit logging of all auth events

## Monitoring & Observability

### Key Metrics
- Sync operation success/failure rates per platform
- Webhook processing latency
- Conflict resolution queue depth
- API rate limit utilization
- Token refresh success rates

### Alerting
- Failed webhook processing >10 in 5 minutes
- Auth token refresh failures
- Conflict queue >50 items
- Platform API downtime detection

## Deployment Configuration

### Environment Variables
```
# Eventbrite
EVENTBRITE_CLIENT_ID=
EVENTBRITE_CLIENT_SECRET=
EVENTBRITE_WEBHOOK_SECRET=

# Patreon
PATREON_CLIENT_ID=
PATREON_CLIENT_SECRET=
PATREON_WEBHOOK_SECRET=

# Klaviyo
KLAVIYO_CLIENT_ID=
KLAVIYO_CLIENT_SECRET=
KLAVIYO_API_KEY=

# Service config
SYNC_WORKER_CONCURRENCY=5
WEBHOOK_TIMEOUT_MS=5000
MAX_RETRY_ATTEMPTS=5
```

## Implementation Phases

### Phase 1: Core Infrastructure
- Basic webhook handling
- OAuth token management
- Database schema setup
- Simple member creation/updates

### Phase 2: Advanced Features
- Conflict resolution system
- Bulk sync capabilities
- Admin dashboard for monitoring
- Manual override interfaces

### Phase 3: Optimization
- Performance tuning
- Advanced monitoring
- Predictive conflict resolution
- Machine learning for duplicate detection

## API Integration Examples

### Eventbrite Member Sync
```javascript
// Webhook handler
app.post('/api/webhooks/eventbrite', async (req, res) => {
  const { action, api_url } = req.body;
  
  if (action === 'order.placed') {
    await queueSyncOperation({
      platform: 'eventbrite',
      type: 'order_placed',
      external_id: extractOrderId(api_url),
      payload: req.body
    });
  }
  
  res.status(200).send('OK');
});

// Sync processor
async function processEventbriteOrder(operation) {
  const orderData = await eventbriteClient.getOrder(operation.external_id);
  const attendees = orderData.attendees;
  
  for (const attendee of attendees) {
    const normalizedMember = normalizeMemberData('eventbrite', attendee);
    await upsertMember(normalizedMember, 'eventbrite');
  }
}
```

This architecture provides a robust foundation for synchronizing member data across all platforms while maintaining data integrity and providing visibility into the sync process.