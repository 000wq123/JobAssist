/**
 * Lazy-load @react-pdf/renderer + the template, then trigger a browser
 * download. Keeps the heavy PDF lib out of the main bundle until the user
 * actually clicks "PDF herunterladen".
 *
 * @param {import("./profileSchema").CVProfile} profile
 * @returns {Promise<void>}
 */
export function cvPdfFileName(profile = {}) {
  const fileBase =
    [profile.vorname, profile.nachname]
      .filter((s) => s && s.trim())
      .join("_")
      .replace(/[^\p{L}\p{N}_-]/gu, "") || "Lebenslauf";
  return `${fileBase}_Lebenslauf.pdf`;
}

export async function createCVPdfBlob(profile) {
  const [{ pdf }, { default: CVTemplate }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./CVTemplate.jsx"),
  ]);
  return pdf(<CVTemplate profile={profile} />).toBlob();
}

export function downloadCVPdfBlob(blob, profile) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = cvPdfFileName(profile);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke on next tick so Safari has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function downloadCVPdf(profile) {
  const blob = await createCVPdfBlob(profile);
  downloadCVPdfBlob(blob, profile);
}
