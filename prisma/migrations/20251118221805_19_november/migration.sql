/*
  Warnings:

  - You are about to drop the `master_audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenant_invitations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenants` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "master_audit_logs";

-- DropTable
DROP TABLE "tenant_invitations";

-- DropTable
DROP TABLE "tenants";

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "org_id" TEXT,
    "rule_id" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "actor_id" TEXT,
    "payload_hash" CHAR(64) NOT NULL,
    "prev_hash" CHAR(64) NOT NULL,
    "merkle_leaf" CHAR(64),
    "redacted_payload" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_pools" (
    "pool_id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "targets" JSONB NOT NULL,
    "health" JSONB NOT NULL,

    CONSTRAINT "model_pools_pkey" PRIMARY KEY ("pool_id")
);

-- CreateTable
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

-- CreateTable
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
    "org_id" TEXT,
    "request_payload" JSONB NOT NULL,
    "response_payload" JSONB,
    "error_message" TEXT,

    CONSTRAINT "model_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_model_invocation_created_at" ON "model_invocations"("created_at");

-- CreateIndex
CREATE INDEX "idx_model_invocation_policy" ON "model_invocations"("policy_id");

-- AddForeignKey
ALTER TABLE "route_targets" ADD CONSTRAINT "route_targets_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "model_pools"("pool_id") ON DELETE CASCADE ON UPDATE CASCADE;
