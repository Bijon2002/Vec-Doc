-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'CNG');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORBIKE', 'SCOOTER', 'CAR', 'AUTO_RICKSHAW', 'OTHER');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('SOLD', 'TRANSFERRED', 'GIFTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INSURANCE', 'SMOKE_TEST', 'LICENSE', 'REGISTRATION', 'SERVICE_RECORD', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('TRIP', 'DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "profile_image_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "notification_preferences" JSONB NOT NULL DEFAULT '{"push": true, "sms": false, "email": true}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bikes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nickname" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "engine_capacity_cc" INTEGER,
    "fuel_type" "FuelType" NOT NULL DEFAULT 'PETROL',
    "vehicle_type" "VehicleType" NOT NULL DEFAULT 'MOTORBIKE',
    "registration_number" TEXT,
    "vin_number" TEXT,
    "oil_change_interval_km" INTEGER NOT NULL DEFAULT 2500,
    "last_oil_change_km" INTEGER NOT NULL DEFAULT 0,
    "last_oil_change_date" TIMESTAMP(3),
    "current_odometer_km" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "purchase_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_ownership_history" (
    "id" TEXT NOT NULL,
    "bike_id" TEXT NOT NULL,
    "from_user_id" TEXT,
    "to_user_id" TEXT,
    "transfer_type" "TransferType" NOT NULL,
    "transfer_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "bike_ownership_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "bike_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "file_url" TEXT,
    "file_type" TEXT,
    "file_size_bytes" INTEGER,
    "thumbnail_url" TEXT,
    "ocr_extracted_data" JSONB,
    "ocr_confidence" DOUBLE PRECISION,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_alerts" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "bike_id" TEXT NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "odometer_at_maintenance" INTEGER NOT NULL,
    "cost_amount" DECIMAL(10,2),
    "cost_currency" TEXT NOT NULL DEFAULT 'INR',
    "service_center_name" TEXT,
    "service_center_location" TEXT,
    "technician_notes" TEXT,
    "parts_used" JSONB,
    "receipt_url" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_due_km" INTEGER,
    "next_due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "bike_id" TEXT NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "interval_km" INTEGER,
    "interval_days" INTEGER,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distance_records" (
    "id" TEXT NOT NULL,
    "bike_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "distance_km" DECIMAL(10,2) NOT NULL,
    "record_type" "RecordType" NOT NULL DEFAULT 'DAILY',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "category" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "delivery_channel" TEXT,
    "fcm_message_id" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "user_id" TEXT NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "document_alerts" BOOLEAN NOT NULL DEFAULT true,
    "maintenance_alerts" BOOLEAN NOT NULL DEFAULT true,
    "promotional" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "part_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "image_url" TEXT,
    "synonyms" TEXT[],
    "search_boost" DECIMAL(3,2) NOT NULL DEFAULT 1.0,

    CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_part_compatibility" (
    "id" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "part_category_id" TEXT NOT NULL,
    "oem_part_number" TEXT,
    "compatible_part_numbers" TEXT[],
    "notes" TEXT,

    CONSTRAINT "bike_part_compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "bike_brand" TEXT,
    "bike_model" TEXT,
    "topic" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "source_url" TEXT,
    "source_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "bikes_user_id_idx" ON "bikes"("user_id");

-- CreateIndex
CREATE INDEX "bikes_user_id_is_active_idx" ON "bikes"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "documents_bike_id_idx" ON "documents"("bike_id");

-- CreateIndex
CREATE INDEX "documents_expiry_date_idx" ON "documents"("expiry_date");

-- CreateIndex
CREATE INDEX "documents_document_type_expiry_date_idx" ON "documents"("document_type", "expiry_date");

-- CreateIndex
CREATE INDEX "document_alerts_scheduled_at_status_idx" ON "document_alerts"("scheduled_at", "status");

-- CreateIndex
CREATE INDEX "document_alerts_document_id_idx" ON "document_alerts"("document_id");

-- CreateIndex
CREATE INDEX "maintenance_records_bike_id_performed_at_idx" ON "maintenance_records"("bike_id", "performed_at" DESC);

-- CreateIndex
CREATE INDEX "maintenance_records_bike_id_maintenance_type_idx" ON "maintenance_records"("bike_id", "maintenance_type");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_schedules_bike_id_maintenance_type_key" ON "maintenance_schedules"("bike_id", "maintenance_type");

-- CreateIndex
CREATE INDEX "distance_records_bike_id_date_idx" ON "distance_records"("bike_id", "date");

-- CreateIndex
CREATE INDEX "notification_queue_scheduled_at_status_idx" ON "notification_queue"("scheduled_at", "status");

-- CreateIndex
CREATE INDEX "notification_queue_user_id_created_at_idx" ON "notification_queue"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "part_categories_slug_key" ON "part_categories"("slug");

-- CreateIndex
CREATE INDEX "bike_part_compatibility_brand_model_idx" ON "bike_part_compatibility"("brand", "model");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bikes" ADD CONSTRAINT "bikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_alerts" ADD CONSTRAINT "document_alerts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distance_records" ADD CONSTRAINT "distance_records_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_categories" ADD CONSTRAINT "part_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_part_compatibility" ADD CONSTRAINT "bike_part_compatibility_part_category_id_fkey" FOREIGN KEY ("part_category_id") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
