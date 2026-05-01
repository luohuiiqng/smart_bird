-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('ANSWER_SHEET_TEMPLATE', 'IMPORT_FILE', 'EXPORT_FILE', 'SCAN_IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "file_assets" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "uploader_id" INTEGER NOT NULL,
    "category" "FileCategory" NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "biz_type" TEXT,
    "biz_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_assets_school_id_idx" ON "file_assets"("school_id");

-- CreateIndex
CREATE INDEX "file_assets_uploader_id_idx" ON "file_assets"("uploader_id");

-- CreateIndex
CREATE INDEX "file_assets_category_idx" ON "file_assets"("category");

-- CreateIndex
CREATE INDEX "file_assets_deleted_at_idx" ON "file_assets"("deleted_at");

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
