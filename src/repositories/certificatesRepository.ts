import { CertificateRepository, CertificatePayload } from './certificateRepository';
import { apiClient } from '../services/apiClient';

export { CertificateRepository };
export type { CertificatePayload };

export class CertificatesRepository extends CertificateRepository {
  public static async createCertificate(payload: {
    sessionId: string;
    teamId: string;
    awardTitle?: string;
  }): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('certificates.create', payload);
        return res.data;
      } catch (err) {
        console.warn('Failed to create certificate in cloud', err);
      }
    }
    return null;
  }

  public static async getCertificate(id: string): Promise<any> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest('certificates.get', { id });
        return res.data;
      } catch (err) {
        console.warn('Failed to get certificate from cloud', err);
      }
    }
    return null;
  }
}
