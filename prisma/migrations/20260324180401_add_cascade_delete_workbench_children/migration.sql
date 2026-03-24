-- DropForeignKey
ALTER TABLE "ChatHistory" DROP CONSTRAINT "ChatHistory_workbenchId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chat_history_id_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_workbenchId_fkey";

-- DropForeignKey
ALTER TABLE "QuizQuestion" DROP CONSTRAINT "QuizQuestion_questionId_fkey";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_workbenchId_fkey" FOREIGN KEY ("workbenchId") REFERENCES "Workbench"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatHistory" ADD CONSTRAINT "ChatHistory_workbenchId_fkey" FOREIGN KEY ("workbenchId") REFERENCES "Workbench"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chat_history_id_fkey" FOREIGN KEY ("chat_history_id") REFERENCES "ChatHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
