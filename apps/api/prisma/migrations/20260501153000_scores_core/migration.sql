-- CreateEnum
CREATE TYPE "ScorePublishStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "exams" ADD COLUMN "publish_status" "ScorePublishStatus" NOT NULL DEFAULT 'UNPUBLISHED',
ADD COLUMN "published_at" TIMESTAMP(3),
ADD COLUMN "publish_note" TEXT;

-- CreateTable
CREATE TABLE "exam_student_scores" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "total_score" DECIMAL(8,2) NOT NULL,
    "rank_in_class" INTEGER,
    "rank_in_grade" INTEGER,
    "recalculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_student_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_student_subject_scores" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "exam_subject_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "total_score_id" INTEGER NOT NULL,
    "score" DECIMAL(8,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_student_subject_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_publish_status_idx" ON "exams"("publish_status");

-- CreateIndex
CREATE UNIQUE INDEX "exam_student_scores_exam_id_student_id_key" ON "exam_student_scores"("exam_id", "student_id");

-- CreateIndex
CREATE INDEX "exam_student_scores_school_id_idx" ON "exam_student_scores"("school_id");

-- CreateIndex
CREATE INDEX "exam_student_scores_exam_id_idx" ON "exam_student_scores"("exam_id");

-- CreateIndex
CREATE INDEX "exam_student_scores_student_id_idx" ON "exam_student_scores"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_student_subject_scores_exam_subject_id_student_id_key" ON "exam_student_subject_scores"("exam_subject_id", "student_id");

-- CreateIndex
CREATE INDEX "exam_student_subject_scores_exam_id_idx" ON "exam_student_subject_scores"("exam_id");

-- CreateIndex
CREATE INDEX "exam_student_subject_scores_student_id_idx" ON "exam_student_subject_scores"("student_id");

-- CreateIndex
CREATE INDEX "exam_student_subject_scores_total_score_id_idx" ON "exam_student_subject_scores"("total_score_id");

-- AddForeignKey
ALTER TABLE "exam_student_scores" ADD CONSTRAINT "exam_student_scores_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_scores" ADD CONSTRAINT "exam_student_scores_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_scores" ADD CONSTRAINT "exam_student_scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_subject_scores" ADD CONSTRAINT "exam_student_subject_scores_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_subject_scores" ADD CONSTRAINT "exam_student_subject_scores_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_subject_scores" ADD CONSTRAINT "exam_student_subject_scores_exam_subject_id_fkey" FOREIGN KEY ("exam_subject_id") REFERENCES "exam_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_subject_scores" ADD CONSTRAINT "exam_student_subject_scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_subject_scores" ADD CONSTRAINT "exam_student_subject_scores_total_score_id_fkey" FOREIGN KEY ("total_score_id") REFERENCES "exam_student_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
