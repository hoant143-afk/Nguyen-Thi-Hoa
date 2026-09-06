import { apiClient } from '../services/apiClient';
import { Question } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

export class QuestionsRepository {
  public static async listQuestions(bankId: string = 'bank_tinhoc5_demo'): Promise<Question[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('questions.listByBank', { bankId });
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          return res.data.map((q, idx) => ({
            id: Number(q.order) || (idx + 1),
            question: q.question,
            options: [
              q.options?.A || q.optionsList?.[0] || '',
              q.options?.B || q.optionsList?.[1] || '',
              q.options?.C || q.optionsList?.[2] || '',
              q.options?.D || q.optionsList?.[3] || '',
            ] as [string, string, string, string],
            correctAnswer: (q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : 0) as 0 | 1 | 2 | 3,
            explanation: q.explanation || '',
            category: q.category || 'Tin học 5',
            isSpecial: Boolean(q.isSpecial),
          }));
        }
      } catch (err) {
        console.warn('Failed to load questions from cloud, falling back to local defaults', err);
      }
    }

    // Local fallback
    try {
      const local = localStorage.getItem('camrace_custom_questions_v3');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return DEFAULT_QUESTIONS;
  }

  public static async createQuestion(bankId: string, question: Omit<Question, 'id'>, order?: number): Promise<Question> {
    const optLetter = question.correctAnswer === 0 ? 'A' : (question.correctAnswer === 1 ? 'B' : (question.correctAnswer === 2 ? 'C' : 'D'));
    const assignedOrder = order || Date.now();

    if (apiClient.getMode() === 'cloud') {
      try {
        await apiClient.apiRequest('questions.create', {
          bankId,
          order: assignedOrder,
          question: question.question,
          optionA: question.options[0],
          optionB: question.options[1],
          optionC: question.options[2],
          optionD: question.options[3],
          correctAnswer: optLetter,
          explanation: question.explanation,
          isSpecial: question.isSpecial || false,
        });
      } catch (err) {
        console.warn('Cloud question create failed', err);
      }
    }

    return {
      ...question,
      id: assignedOrder,
    };
  }
}
