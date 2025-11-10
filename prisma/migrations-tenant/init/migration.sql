-- Tenant database initialization
-- This schema is applied to each tenant database

-- Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_group_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- User Groups
CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "default_pool_id" TEXT,
    "allowed_pools" JSONB,
    "default_policy_id" TEXT,
    "allowed_policies" JSONB,
    "route_profile_id" TEXT,
    "product_access_group_id" TEXT,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- Product Access Groups
CREATE TABLE "product_access_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "products" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_access_groups_pkey" PRIMARY KEY ("id")
);

-- Route Profiles
CREATE TABLE "route_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pool_id" TEXT,
    "basic" JSONB,
    "preferences" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_profiles_pkey" PRIMARY KEY ("id")
);

-- Policies
CREATE TABLE "policies" (
    "policy_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "evaluation_strategy" JSONB NOT NULL,
    "rules" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_by" TEXT,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("policy_id")
);

-- Audit Log
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rule_id" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "actor_id" TEXT,
    "payload_hash" CHAR(64) NOT NULL,
    "prev_hash" CHAR(64) NOT NULL,
    "merkle_leaf" CHAR(64),
    "redacted_payload" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- Model Pools
CREATE TABLE "model_pools" (
    "pool_id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "targets" JSONB NOT NULL,
    "health" JSONB NOT NULL,

    CONSTRAINT "model_pools_pkey" PRIMARY KEY ("pool_id")
);

-- Route Targets
CREATE TABLE "route_targets" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profile" JSONB,

    CONSTRAINT "route_targets_pkey" PRIMARY KEY ("id")
);

-- Model Invocations
CREATE TABLE "model_invocations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policy_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "decision" TEXT NOT NULL,
    "model_pool" TEXT,
    "provider" TEXT NOT NULL,
    "model_identifier" TEXT NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "estimated_cost_aud" DOUBLE PRECISION,
    "audit_log_id" TEXT,
    "request_payload" JSONB NOT NULL,
    "response_payload" JSONB,
    "error_message" TEXT,

    CONSTRAINT "model_invocations_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "user_groups_name_key" ON "user_groups"("name");
CREATE UNIQUE INDEX "product_access_groups_name_key" ON "product_access_groups"("name");
CREATE UNIQUE INDEX "route_profiles_name_key" ON "route_profiles"("name");

-- Create indexes for performance
CREATE INDEX "idx_model_invocation_created_at" ON "model_invocations"("created_at");
CREATE INDEX "idx_model_invocation_policy" ON "model_invocations"("policy_id");

-- Add foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_user_group_id_fkey" FOREIGN KEY ("user_group_id") REFERENCES "user_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_route_profile_id_fkey" FOREIGN KEY ("route_profile_id") REFERENCES "route_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_product_access_group_id_fkey" FOREIGN KEY ("product_access_group_id") REFERENCES "product_access_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "route_targets" ADD CONSTRAINT "route_targets_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "model_pools"("pool_id") ON DELETE CASCADE ON UPDATE CASCADE;

