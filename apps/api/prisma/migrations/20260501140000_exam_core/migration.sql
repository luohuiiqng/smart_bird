-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('CREATED', 'MARKING', 'PENDING_PUBLISH', 'PUBLISHED');

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "exam_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'CREATED',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_classes" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_subjects" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "full_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_school_id_idx" ON "exams"("school_id");

-- CreateIndex
CREATE INDEX "exams_status_idx" ON "exams"("status");

-- CreateIndex
CREATE INDEX "exams_date_idx" ON "exams"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "exam_classes_exam_id_class_id_key" ON "exam_classes"("exam_id", "class_id");

-- CreateIndex
CREATE INDEX "exam_classes_class_id_idx" ON "exam_classes"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_subjects_exam_id_subject_id_key" ON "exam_subjects"("exam_id", "subject_id");

-- CreateIndex
CREATE INDEX "exam_subjects_subject_id_idx" ON "exam_subjects"("subject_id");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
