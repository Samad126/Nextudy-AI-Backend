import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { Difficulty, QuestionType } from '../../../generated/prisma/client.js';
import { QuestionRaw } from './questions.prompts.js';
import { anyMemberFilter } from '../../common/utils/workspace-filters.js';

@Injectable()
export class QuestionsRepository {
  constructor(private readonly db: DatabaseService) {}

  async persistQuestions(questions: QuestionRaw[], workbenchId: number) {
    return await this.db.$transaction(async (tx) => {
      // 1. Bulk-create all question rows (1 DB call)
      const questionRows = await tx.question.createManyAndReturn({
        data: questions.map((q) => ({
          workbenchId,
          title: q.title,
          question_type:
            q.question_type === 'mcq'
              ? QuestionType.mcq
              : QuestionType.open_ended,
          answer_source: q.answer_source === 'file' ? 'file' : 'ai',
          difficulty: q.difficulty,
          explanation: q.explanation ?? null,
        })),
      });

      // 2. Collect MCQ choices and open-ended entries across all questions
      const mcqChoicesData: {
        question_id: number;
        choice_text: string;
        choice_order: number;
        is_correct: boolean;
      }[] = [];

      const openEndedData: { questionId: number; raw: QuestionRaw }[] = [];

      questions.forEach((q, i) => {
        const questionId = questionRows[i].id;

        if (q.question_type === 'mcq' && q.choices?.length) {
          for (const c of q.choices) {
            mcqChoicesData.push({
              question_id: questionId,
              choice_text: c.choice_text,
              choice_order: c.choice_order,
              is_correct: c.is_correct,
            });
          }
        }

        if (q.question_type === 'open_ended' && q.sample_answer) {
          openEndedData.push({ questionId, raw: q });
        }
      });

      // 3. Bulk-insert all MCQ choices (1 DB call)
      if (mcqChoicesData.length > 0) {
        await tx.mCQChoice.createMany({ data: mcqChoicesData });
      }

      // 4. Bulk-insert all open-ended answers + grading keywords (2 DB calls)
      if (openEndedData.length > 0) {
        const openEndedRows = await tx.openEndedAnswer.createManyAndReturn({
          data: openEndedData.map((oe) => ({
            question_id: oe.questionId,
            sample_answer: oe.raw.sample_answer!,
          })),
        });

        const keywordsData: {
          open_ended_answer_id: number;
          keyword: string;
          weight: number;
          is_required: boolean;
        }[] = [];

        openEndedData.forEach((oe, i) => {
          if (oe.raw.grading_keywords?.length) {
            for (const k of oe.raw.grading_keywords) {
              keywordsData.push({
                open_ended_answer_id: openEndedRows[i].id,
                keyword: k.keyword,
                weight: k.weight,
                is_required: k.is_required,
              });
            }
          }
        });

        if (keywordsData.length > 0) {
          await tx.gradingKeyword.createMany({ data: keywordsData });
        }
      }

      // 5. Return all created questions with full relations (1 DB call)
      return await tx.question.findMany({
        where: { id: { in: questionRows.map((r) => r.id) } },
        include: {
          mcqChoices: true,
          openEndedAnswer: { include: { gradingKeywords: true } },
        },
      });
    });
  }

  async findOneWithWorkbench(questionId: number, userId: number) {
    const question = await this.db.question.findFirst({
      where: {
        id: questionId,
        workbench: { workspace: anyMemberFilter(userId) },
      },
      include: {
        workbench: true,
        mcqChoices: true,
        openEndedAnswer: { include: { gradingKeywords: true } },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question #${questionId} not found.`);
    }

    return question;
  }

  async replaceQuestion(
    questionId: number,
    q: QuestionRaw,
    difficulty: Difficulty,
  ) {
    return await this.db.$transaction(async (tx) => {
      // 1. Update base question fields
      await tx.question.update({
        where: { id: questionId },
        data: {
          title: q.title,
          question_type:
            q.question_type === 'mcq'
              ? QuestionType.mcq
              : QuestionType.open_ended,
          answer_source: q.answer_source === 'file' ? 'file' : 'ai',
          difficulty,
          explanation: q.explanation ?? null,
        },
      });

      // 2. Delete existing type-specific data (cascade handles nested rows)
      await tx.mCQChoice.deleteMany({ where: { question_id: questionId } });
      await tx.openEndedAnswer.deleteMany({
        where: { question_id: questionId },
      });

      // 3. Re-insert type-specific data
      if (q.question_type === 'mcq' && q.choices?.length) {
        await tx.mCQChoice.createMany({
          data: q.choices.map((c) => ({
            question_id: questionId,
            choice_text: c.choice_text,
            choice_order: c.choice_order,
            is_correct: c.is_correct,
          })),
        });
      }

      if (q.question_type === 'open_ended' && q.sample_answer) {
        const answer = await tx.openEndedAnswer.create({
          data: { question_id: questionId, sample_answer: q.sample_answer },
        });

        if (q.grading_keywords?.length) {
          await tx.gradingKeyword.createMany({
            data: q.grading_keywords.map((k) => ({
              open_ended_answer_id: answer.id,
              keyword: k.keyword,
              weight: k.weight,
              is_required: k.is_required,
            })),
          });
        }
      }

      // 4. Return updated question with relations
      return tx.question.findUniqueOrThrow({
        where: { id: questionId },
        include: {
          mcqChoices: true,
          openEndedAnswer: { include: { gradingKeywords: true } },
        },
      });
    });
  }
}
