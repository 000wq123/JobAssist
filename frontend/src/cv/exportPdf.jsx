/**
 * Lazy-load @react-pdf/renderer + the template, then trigger a browser
 * download. Keeps the heavy PDF lib out of the main bundle until the user
 * actually clicks "PDF herunterladen".
 *
 * @param {import("./profileSchema").CVProfile} profile
 * @returns {Promise<void>}
 */
export async function downloadCVPdf(profile) {
  const [{ pdf }, { default: CVTemplate }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./CVTemplate.jsx"),
  ]);

  const blob = await pdf(<CVTemplate profile={profile} />).toBlob();

  const fileBase =
    [profile.vorname, profile.nachname]
      .filter((s) => s && s.trim())
      .join("_")
      .replace(/[^\p{L}\p{N}_-]/gu, "") || "Lebenslauf";

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}_Lebenslauf.pdf`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke on next tick so Safari has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
