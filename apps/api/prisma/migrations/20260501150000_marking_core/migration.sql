-- CreateEnum
CREATE TYPE "MarkingTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'LOCKED');

-- CreateTable
CREATE TABLE "marking_tasks" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "exam_subject_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "status" "MarkingTaskStatus" NOT NULL DEFAULT 'TODO',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marking_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marking_task_entries" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "scores" JSONB,
    "total_score" DECIMAL(8,2),
    "final_submitted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marking_task_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marking_tasks_exam_subject_id_teacher_id_key" ON "marking_tasks"("exam_subject_id", "teacher_id");

-- CreateIndex
CREATE INDEX "marking_tasks_school_id_idx" ON "marking_tasks"("school_id");

-- CreateIndex
CREATE INDEX "marking_tasks_exam_id_idx" ON "marking_tasks"("exam_id");

-- CreateIndex
CREATE INDEX "marking_tasks_status_idx" ON "marking_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "marking_task_entries_task_id_student_id_key" ON "marking_task_entries"("task_id", "student_id");

-- CreateIndex
CREATE INDEX "marking_task_entries_student_id_idx" ON "marking_task_entries"("student_id");

-- CreateIndex
CREATE INDEX "marking_task_entries_final_submitted_idx" ON "marking_task_entries"("final_submitted");

-- AddForeignKey
ALTER TABLE "marking_tasks" ADD CONSTRAINT "marking_tasks_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_tasks" ADD CONSTRAINT "marking_tasks_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_tasks" ADD CONSTRAINT "marking_tasks_exam_subject_id_fkey" FOREIGN KEY ("exam_subject_id") REFERENCES "exam_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_tasks" ADD CONSTRAINT "marking_tasks_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_task_entries" ADD CONSTRAINT "marking_task_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "marking_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
