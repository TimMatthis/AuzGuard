-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_group_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_access_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "products" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_access_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_access_groups_name_key" ON "product_access_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "route_profiles_name_key" ON "route_profiles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_name_key" ON "user_groups"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_user_group_id_fkey" FOREIGN KEY ("user_group_id") REFERENCES "user_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_route_profile_id_fkey" FOREIGN KEY ("route_profile_id") REFERENCES "route_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_product_access_group_id_fkey" FOREIGN KEY ("product_access_group_id") REFERENCES "product_access_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

