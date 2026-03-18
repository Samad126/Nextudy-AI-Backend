import { Injectable } from '@nestjs/common';
import { QuestionType } from '../../../generated/prisma/client.js';

@Injectable()
export class QuizGradingService {
  gradeAnswer(
    question: {
      question_type: string;
      mcqChoices: { id: number; is_correct: boolean }[];
      openEndedAnswer: {
        gradingKeywords: { keyword: string; is_required: boolean }[];
      } | null;
    },
    userAnswer: string | number,
  ): boolean {
    if (question.question_type === QuestionType.mcq) {
      const choiceId =
        typeof userAnswer === 'number' ? userAnswer : parseInt(userAnswer, 10);
      if (isNaN(choiceId)) return false;
      const choice = question.mcqChoices.find((c) => c.id === choiceId);
      return choice?.is_correct ?? false;
    }

    // open_ended: check required keywords
    if (question.openEndedAnswer?.gradingKeywords.length) {
      const lower = String(userAnswer).toLowerCase();
      const requiredKeywords = question.openEndedAnswer.gradingKeywords.filter(
        (k) => k.is_required,
      );
      if (requiredKeywords.length) {
        return requiredKeywords.every((k) =>
          lower.includes(k.keyword.toLowerCase()),
        );
      }
      // No required keywords — check if any keyword matches
      return question.openEndedAnswer.gradingKeywords.some((k) =>
        lower.includes(k.keyword.toLowerCase()),
      );
    }

    return false;
  }
}
