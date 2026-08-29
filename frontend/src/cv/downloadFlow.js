import { profileApi } from "../services/api";

/** Render locally, then authorize and trigger exactly one real CV download. */
export async function downloadAuthorizedCV(profile) {
  const { createCVPdfBlob, downloadCVPdfBlob } = await import("./exportPdf.jsx");
  const blob = await createCVPdfBlob(profile);
  await profileApi.generateCv();
  downloadCVPdfBlob(blob, profile);
}
