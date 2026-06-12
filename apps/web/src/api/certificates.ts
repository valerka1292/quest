import { api } from './client.js';
import type { Certificate, CertificateInput } from '@veilworlds/shared';

export function createCertificate(data: CertificateInput): Promise<Certificate> {
  return api.post<Certificate>('/certificates', data);
}
