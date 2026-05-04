-- AlterTable: backfill updated_at from created_at for existing rows
ALTER TABLE "file_assets" ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "file_assets" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

ALTER TABLE "file_assets" ALTER COLUMN "updated_at" SET NOT NULL;
