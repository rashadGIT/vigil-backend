export interface ESignatureRequest {
  caseId: string;
  tenantId: string;
  contactId: string;
  documentType: string;
  signerName: string;
  signerEmail?: string;
}

export interface ESignatureResult {
  signatureId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Swap implementations by changing ESIGNATURE_PROVIDER env var.
 * Built-in (default): proprietary canvas-based signing.
 * Third-party: implement this interface and register as ESIGNATURE_PROVIDER_TOKEN.
 */
export interface ESignatureProvider {
  requestSignature(req: ESignatureRequest): Promise<ESignatureResult>;
  voidSignature(signatureId: string, tenantId: string): Promise<void>;
}

export const ESIGNATURE_PROVIDER_TOKEN = 'ESIGNATURE_PROVIDER';
