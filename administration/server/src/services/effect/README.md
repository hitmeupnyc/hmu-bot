```
server/src/services/effect/
├── layers/
│   └── DatabaseLayer.ts           # Database layer with resource management
├── context/
│   └── DatabaseService.ts         # Database service interface & factory
├── schemas/
│   ├── MemberSchemas.ts           # Member validation schemas
│   ├── EventSchemas.ts            # Event validation schemas  
│   ├── PatreonSchemas.ts          # Patreon API schemas
│   ├── SyncSchemas.ts             # Sync operation schemas
│   └── CommonSchemas.ts           # Shared schemas (audit, Discord, etc.)
├── errors/
│   ├── DatabaseErrors.ts          # Database-specific errors
│   ├── MemberErrors.ts            # Member-specific errors
│   ├── EventErrors.ts             # Event-specific errors
│   ├── PatreonErrors.ts           # Patreon-specific errors
│   └── SyncErrors.ts              # Sync-specific errors
├── examples/
│   └── IntegrationExamples.ts     # Usage examples and Express adapters
├── MemberEffects.ts               # Member business logic
├── EventEffects.ts                # Event business logic  
├── BaseSyncEffects.ts             # Core sync functionality
├── PatreonSyncEffects.ts          # Patreon integration
├── DiscordSyncEffects.ts          # Discord integration
├── KlaviyoSyncEffects.ts          # Klaviyo integration
└── AuditEffects.ts                # Audit logging
```
