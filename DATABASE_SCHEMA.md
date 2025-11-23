# AuzGuard Database Schema Documentation

This document describes the complete database schema for AuzGuard, including both the master database and tenant-specific databases.

## Database Architecture

AuzGuard uses a **multi-tenant architecture** with database-per-tenant isolation:

- **Master Database** (`auzguard_master`) - Stores tenant registry and global configuration
- **Tenant Databases** (`auzguard_tenant_<slug>`) - One database per registered company

## Master Database Schema

### Tables Overview

The master database contains:
- Tenant registry
- Global branding settings
- API keys
- Chat history
- User management

---

### `tenants` Table

Stores information about registered companies/organizations.

**Managed by:** Prisma migrations in `prisma/migrations/`

**Key Fields:**
- `id` (UUID) - Primary key
- `slug` (String, unique) - URL-friendly identifier
- `company_name` (String) - Company display name
- `database_name` (String) - Tenant database name
- `status` (String) - 'active', 'inactive', 'suspended'
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Note:** The actual table structure is managed via Prisma. Check `prisma/schema-master.prisma` for the authoritative definition.

---

### `users` Table

User accounts with authentication and roles.

```sql
CREATE TABLE users (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                       VARCHAR(255) UNIQUE NOT NULL,
    password_hash               TEXT NOT NULL,
    role                        VARCHAR(50) DEFAULT 'viewer',
    name                        VARCHAR(255),
    email_verified              BOOLEAN DEFAULT FALSE,
    verification_token          VARCHAR(255) UNIQUE,
    verification_token_expires  TIMESTAMP,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW(),
    last_login                  TIMESTAMP,
    is_active                   BOOLEAN DEFAULT TRUE,
    user_group_id               UUID,
    FOREIGN KEY (user_group_id) REFERENCES user_groups(id)
);
```

**Roles:**
- `viewer` - Read-only access
- `editor` - Read and write access
- `admin` - Full access including user management

---

### `user_groups` Table

Groups for organizing users with shared permissions.

```sql
CREATE TABLE user_groups (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) UNIQUE NOT NULL,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    default_pool_id         VARCHAR(255),
    allowed_pools           JSONB,
    default_policy_id       VARCHAR(255),
    allowed_policies        JSONB,
    route_profile_id        UUID,
    product_access_group_id UUID,
    FOREIGN KEY (route_profile_id) REFERENCES route_profiles(id),
    FOREIGN KEY (product_access_group_id) REFERENCES product_access_groups(id)
);
```

---

### `product_access_groups` Table

Defines which products/features users can access.

```sql
CREATE TABLE product_access_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    products    JSONB NOT NULL,  -- Array of product identifiers
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

**Product Identifiers:**
- `dashboard` - Dashboard access
- `policies` - Policy management
- `rules` - Rule configuration
- `simulator` - Policy simulator
- `chat` - Chat interface
- `users` - User management
- `settings` - Settings pages

---

### `policies` Table

Authorization policies containing rules and evaluation strategies.

```sql
CREATE TABLE policies (
    policy_id                     VARCHAR(255) PRIMARY KEY,
    version                       VARCHAR(50) NOT NULL,
    title                         TEXT NOT NULL,
    jurisdiction                  VARCHAR(100) NOT NULL,
    evaluation_strategy           JSONB NOT NULL,
    rules                         JSONB NOT NULL,
    residency_requirement_default VARCHAR(100),
    residency_override            VARCHAR(100),
    created_at                    TIMESTAMP DEFAULT NOW(),
    updated_at                    TIMESTAMP DEFAULT NOW(),
    published_by                  VARCHAR(255)
);
```

---

### `audit_log` Table

Immutable audit trail with cryptographic verification.

```sql
CREATE TABLE audit_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp        TIMESTAMP DEFAULT NOW(),
    rule_id          VARCHAR(255) NOT NULL,
    effect           VARCHAR(50) NOT NULL,
    actor_id         VARCHAR(255),
    payload_hash     CHAR(64) NOT NULL,  -- SHA-256 hash
    prev_hash        CHAR(64) NOT NULL,  -- Previous entry hash (blockchain-style)
    merkle_leaf      CHAR(64),           -- Merkle tree leaf hash
    redacted_payload JSONB
);
```

**Features:**
- Write-once-read-many (WORM) design
- Cryptographic chain (each entry hashes previous)
- Merkle tree for batch verification
- PII redaction support

---

### `model_pools` Table

AI model pools for load balancing and failover.

```sql
CREATE TABLE model_pools (
    pool_id     VARCHAR(255) PRIMARY KEY,
    region      VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    tags        JSONB NOT NULL,
    targets     JSONB NOT NULL,  -- Array of target configurations
    health      JSONB NOT NULL   -- Health check status
);
```

---

### `route_targets` Table

Individual AI model endpoints within pools.

```sql
CREATE TABLE route_targets (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id   VARCHAR(255) NOT NULL,
    provider  VARCHAR(100) NOT NULL,  -- 'openai', 'gemini', 'ollama'
    endpoint  TEXT NOT NULL,
    weight    INTEGER NOT NULL,       -- Load balancing weight
    region    VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    profile   JSONB,
    FOREIGN KEY (pool_id) REFERENCES model_pools(pool_id) ON DELETE CASCADE
);
```

---

### `model_invocations` Table

Tracks all AI model API calls for analytics and billing.

```sql
CREATE TABLE model_invocations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at           TIMESTAMP DEFAULT NOW(),
    policy_id            VARCHAR(255) NOT NULL,
    rule_id              VARCHAR(255),
    decision             VARCHAR(50) NOT NULL,
    model_pool           VARCHAR(255),
    provider             VARCHAR(100) NOT NULL,
    model_identifier     VARCHAR(255) NOT NULL,
    latency_ms           INTEGER NOT NULL,
    prompt_tokens        INTEGER,
    completion_tokens    INTEGER,
    total_tokens         INTEGER,
    estimated_cost_aud   DECIMAL(10,6),
    audit_log_id         VARCHAR(255),
    org_id               VARCHAR(255),
    request_payload      JSONB NOT NULL,
    response_payload     JSONB,
    error_message        TEXT
);

CREATE INDEX idx_model_invocation_created_at ON model_invocations(created_at);
CREATE INDEX idx_model_invocation_policy ON model_invocations(policy_id);
```

---

### `route_profiles` Table

Routing configuration profiles for different user groups.

```sql
CREATE TABLE route_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) UNIQUE NOT NULL,
    pool_id     VARCHAR(255),
    basic       JSONB,              -- Basic routing config
    preferences JSONB NOT NULL,     -- Routing preferences
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

---

### `tenant_branding` Table

Company-specific branding configuration.

```sql
CREATE TABLE tenant_branding (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    logo_url     TEXT,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);
```

---

### `chat_sessions` Table

Chat conversation sessions.

```sql
CREATE TABLE chat_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    title      VARCHAR(500),
    policy_id  VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### `chat_messages` Table

Individual messages within chat sessions.

```sql
CREATE TABLE chat_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    role       VARCHAR(50) NOT NULL,  -- 'user' or 'assistant'
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_message_session ON chat_messages(session_id);
```

---

### `api_keys` Table

Encrypted API keys for AI providers.

```sql
CREATE TABLE api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider      VARCHAR(100) NOT NULL,  -- 'openai', 'gemini', 'ollama'
    name          VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL,         -- AES-256-GCM encrypted
    models        JSONB,                  -- Array of model identifiers
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    last_used_at  TIMESTAMP,
    UNIQUE(provider, name)
);
```

---

## Tenant Database Schema

Each tenant gets their own isolated database with the same schema structure as the master database (minus tenant-specific tables).

### Tenant Database Name Format

```
auzguard_tenant_<slug>
```

Example: Company with slug `acme-corp` gets database `auzguard_tenant_acme-corp`

### Schema

Tenant databases contain the same tables as the master database:
- `users` - Tenant-specific users
- `user_groups` - Tenant user groups
- `product_access_groups` - Tenant product access
- `policies` - Tenant policies
- `audit_log` - Tenant audit trail
- `model_pools` - Tenant model pools
- `route_targets` - Tenant route targets
- `model_invocations` - Tenant model invocations
- `route_profiles` - Tenant route profiles
- `tenant_branding` - Tenant branding
- `chat_sessions` - Tenant chat sessions
- `chat_messages` - Tenant chat messages
- `api_keys` - Tenant API keys

**Note:** The tenant schema is defined in `prisma/tenant/schema.prisma`

---

## Migrations

### Master Database Migrations

Located in: `prisma/migrations/`

**Latest migrations:**
- `20251110005726_init` - Initial schema
- `20251110083627_add_users_groups_product_access` - User management
- `20251113105128_add_unique_admin_email` - Email constraints
- `20251118221805_19_november` - November updates
- `20251119000000_add_policy_residency_fields` - Residency fields
- `20251121091806_add_api_keys_to_main_db` - API keys
- `20251121094639_add_branding_and_chat` - Branding and chat
- `20251121100039_add_user_verification_fields` - Email verification

**Run migrations:**
```bash
npx prisma migrate deploy
npx prisma generate
```

### Tenant Database Migrations

Located in: `prisma/tenant/migrations/`

**Latest migrations:**
- `20251113112917_add_chat_sessions` - Chat functionality
- `20251113113555_add_api_keys` - API key management
- `20251119000000_add_policy_residency_fields` - Residency fields
- `20251119000001_add_models_to_api_keys` - Model assignment

**Run tenant migrations:**
```powershell
# Windows
.\run-tenant-migrations.ps1

# Linux/Mac
./run-tenant-migrations.sh
```

---

## Data Flow

### Company Registration

1. User submits registration form
2. Master DB: Insert into `tenants` table
3. PostgreSQL: Create new database `auzguard_tenant_<slug>`
4. Run migrations on new tenant database
5. Tenant DB: Insert admin user into `users` table
6. Generate verification token
7. Send verification email

### User Authentication

1. User submits login credentials
2. Extract tenant from email or subdomain
3. Connect to tenant database
4. Verify password hash
5. Generate JWT token
6. Return token and user info

### Policy Evaluation

1. API request with context
2. Connect to tenant database
3. Fetch policy from `policies` table
4. Evaluate rules
5. Log to `audit_log` table
6. Record invocation in `model_invocations` table
7. Return decision

---

## Indexes

### Performance Indexes

```sql
-- Model invocations
CREATE INDEX idx_model_invocation_created_at ON model_invocations(created_at);
CREATE INDEX idx_model_invocation_policy ON model_invocations(policy_id);

-- Chat messages
CREATE INDEX idx_chat_message_session ON chat_messages(session_id);
```

### Unique Constraints

```sql
-- Users
UNIQUE (email)
UNIQUE (verification_token)

-- User groups
UNIQUE (name)

-- Product access groups
UNIQUE (name)

-- Route profiles
UNIQUE (name)

-- API keys
UNIQUE (provider, name)
```

---

## JSON Schema Examples

### `products` Field (product_access_groups)

```json
["dashboard", "policies", "rules", "simulator", "chat"]
```

### `evaluation_strategy` Field (policies)

```json
{
  "type": "sequential",
  "shortCircuit": true,
  "fallbackEffect": "deny"
}
```

### `rules` Field (policies)

```json
[
  {
    "id": "rule_001",
    "condition": "resource.type == 'document'",
    "effect": "allow"
  }
]
```

### `targets` Field (model_pools)

```json
[
  {
    "provider": "openai",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "weight": 70,
    "models": ["gpt-4", "gpt-3.5-turbo"]
  }
]
```

---

## Security Considerations

### Password Storage
- Passwords are hashed using bcrypt with salt rounds
- Never store plaintext passwords

### API Key Storage
- API keys are encrypted using AES-256-GCM
- Encryption key stored in environment variable `API_KEY_ENCRYPTION_KEY`
- Keys are decrypted on-demand, never stored in memory

### Audit Log Integrity
- Each audit log entry includes hash of previous entry
- Forms a cryptographic chain (blockchain-style)
- Merkle tree for batch verification
- PII is redacted before storage

### Tenant Isolation
- Each tenant has separate database
- No cross-tenant queries possible
- Connection pooling per tenant
- Automatic tenant resolution from JWT

---

## Backup and Restore

### Export All Databases

**Windows:**
```powershell
.\scripts\export-database.ps1
```

**Linux/Mac:**
```bash
./scripts/export-database.sh
```

### Import Databases

**Windows:**
```powershell
.\scripts\import-database.ps1 -BackupDir "database-backups\backup_YYYYMMDD_HHMMSS"
```

**Linux/Mac:**
```bash
./scripts/import-database.sh database-backups/backup_YYYYMMDD_HHMMSS
```

---

## Environment Variables

Required database-related environment variables:

```bash
# Master database
MASTER_DATABASE_URL="postgresql://user:password@localhost:5432/auzguard_master"

# Legacy/default database URL
DATABASE_URL="postgresql://user:password@localhost:5432/auzguard_master"

# API key encryption
API_KEY_ENCRYPTION_KEY="your-32-character-encryption-key"

# Audit log hashing
HASH_SALT="your-hash-salt"
```

---

## Schema Versioning

- **Master Schema Version**: Managed by Prisma migrations
- **Tenant Schema Version**: Managed by Prisma tenant migrations
- **Migration History**: Stored in `_prisma_migrations` table

To check current schema version:

```sql
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;
```

---

## Future Enhancements

Planned schema additions:

1. **Multi-region support** - Regional data residency
2. **Tenant metrics** - Usage analytics per tenant
3. **Webhook logs** - Event notification history
4. **SSO integration** - SAML/OAuth provider configs
5. **Custom fields** - Tenant-specific field definitions

---

## Support

For schema-related questions:
- Check Prisma schema files: `prisma/schema.prisma`, `prisma/tenant/schema.prisma`
- Review migration files: `prisma/migrations/`, `prisma/tenant/migrations/`
- See documentation: `DATABASE_UPGRADE_GUIDE.md`, `TENANT_SETUP_GUIDE.md`

---

**Last Updated:** November 23, 2025
**Schema Version:** See `_prisma_migrations` table

