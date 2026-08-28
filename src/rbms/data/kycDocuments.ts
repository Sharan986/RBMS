import type { Farmer } from "../types";

export interface KycDocument {
  key: string;
  label: string;
  uploaded: boolean;
  uploadedAt: string | null;
}

/**
 * Required KYC document checklist. Deterministic per farmer so the breakdown is
 * stable across reloads and always consistent with the farmer's KYC task state.
 */
export const KYC_DOCUMENT_DEFINITIONS: { key: string; label: string }[] = [
  { key: "shg_byelaws", label: "SHG Bye-laws" },
  { key: "land_documents", label: "Land Documents" },
  { key: "consent_letter", label: "Consent Letter" },
  { key: "aadhaar", label: "Aadhaar" },
  { key: "pan", label: "PAN" },
  { key: "bank", label: "Bank" },
  { key: "ration_card", label: "Ration Card" },
  { key: "survey_form", label: "Survey Form" },
];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function deriveKycDocuments(farmer: Farmer): KycDocument[] {
  const complete = farmer.tasks.kyc === "COMPLETED";
  const docs = KYC_DOCUMENT_DEFINITIONS.map((d) => {
    const r = hash(`${farmer.id}:${d.key}`);
    const uploaded = complete || r > 0.42;
    const daysAgo = Math.floor(r * 45) + 1;
    return {
      key: d.key,
      label: d.label,
      uploaded,
      uploadedAt: uploaded
        ? new Date(Date.parse(farmer.joinedAt) + daysAgo * 86400000).toISOString()
        : null,
    };
  });

  // A pending KYC task must always show at least one missing document.
  if (!complete && docs.every((d) => d.uploaded)) {
    const idx = Math.floor(hash(farmer.id) * docs.length) % docs.length;
    docs[idx] = { ...docs[idx]!, uploaded: false, uploadedAt: null };
  }
  return docs;
}
