-- CreateEnum
CREATE TYPE "AnswerSource" AS ENUM ('file', 'ai');

-- DropForeignKey
ALTER TABLE "GradingKeyword" DROP CONSTRAINT "GradingKeyword_open_ended_answer_id_fkey";

-- DropForeignKey
ALTER TABLE "MCQChoice" DROP CONSTRAINT "MCQChoice_question_id_fkey";

-- DropForeignKey
ALTER TABLE "OpenEndedAnswer" DROP CONSTRAINT "OpenEndedAnswer_question_id_fkey";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answer_source" "AnswerSource" NOT NULL DEFAULT 'ai';

-- AddForeignKey
ALTER TABLE "MCQChoice" ADD CONSTRAINT "MCQChoice_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenEndedAnswer" ADD CONSTRAINT "OpenEndedAnswer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingKeyword" ADD CONSTRAINT "GradingKeyword_open_ended_answer_id_fkey" FOREIGN KEY ("open_ended_answer_id") REFERENCES "OpenEndedAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
