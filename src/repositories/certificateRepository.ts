import { apiClient } from '../services/apiClient';

export interface CertificatePayload {
  sessionId: string;
  recipientType?: 'TEAM' | 'STUDENT' | 'CLASS';
  recipientId?: string;
  recipientName: string;
  awardTitle?: string;
  score?: number;
  rank?: number;
  schoolName?: string;
}

export class CertificateRepository {
  public static async issueCertificate(payload: CertificatePayload): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('certificates.create', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to issue certificate to cloud', err);
      }
    }
    return null;
  }

  public static async listBySession(sessionId: string): Promise<any[]> {
    if (apiClient.getMode() === 'cloud' && sessionId) {
      try {
        const res = await apiClient.apiRequest<any[]>('certificates.getBySession', { sessionId });
        if (res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to load certificates from cloud', err);
      }
    }
    return [];
  }
}
