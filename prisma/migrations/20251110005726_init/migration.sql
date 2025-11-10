/*
  Warnings:

  - You are about to drop the `audit_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_invocations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_pools` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `policies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_access_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `route_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `route_targets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "route_targets" DROP CONSTRAINT "route_targets_pool_id_fkey";

-- DropForeignKey
ALTER TABLE "user_groups" DROP CONSTRAINT "user_groups_product_access_group_id_fkey";

-- DropForeignKey
ALTER TABLE "user_groups" DROP CONSTRAINT "user_groups_route_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_user_group_id_fkey";

-- DropTable
DROP TABLE "audit_log";

-- DropTable
DROP TABLE "model_invocations";

-- DropTable
DROP TABLE "model_pools";

-- DropTable
DROP TABLE "policies";

-- DropTable
DROP TABLE "product_access_groups";

-- DropTable
DROP TABLE "route_profiles";

-- DropTable
DROP TABLE "route_targets";

-- DropTable
DROP TABLE "user_groups";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "database_name" TEXT NOT NULL,
    "database_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "admin_email" TEXT NOT NULL,
    "admin_name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "max_users" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3),
    "settings" JSONB,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_invitations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "action" TEXT NOT NULL,
    "actor_email" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_database_name_key" ON "tenants"("database_name");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_database_name_idx" ON "tenants"("database_name");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invitations_token_key" ON "tenant_invitations"("token");

-- CreateIndex
CREATE INDEX "tenant_invitations_token_idx" ON "tenant_invitations"("token");

-- CreateIndex
CREATE INDEX "tenant_invitations_tenant_id_idx" ON "tenant_invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "master_audit_logs_tenant_id_idx" ON "master_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "master_audit_logs_created_at_idx" ON "master_audit_logs"("created_at");
