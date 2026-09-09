import { QuestionBankRepository } from './questionBankRepository';
import { apiClient } from '../services/apiClient';

export { QuestionBankRepository };

export class QuestionBanksRepository extends QuestionBankRepository {
  public static async listQuestionBanks(): Promise<any[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('questionBanks.list');
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to list question banks from cloud', err);
      }
    }
    return this.getAllLessons();
  }

  public static async getQuestionBank(id: string): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('questionBanks.get', { id });
        if (res.success && res.data) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to get question bank from cloud', err);
      }
    }
    return this.getLessonById(id);
  }

  public static async createQuestionBank(data: any): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('questionBanks.create', data);
        return res.data;
      } catch (err) {
        console.warn('Failed to create question bank in cloud', err);
      }
    }
    return null;
  }
}
