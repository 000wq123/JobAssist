const APPLY_SELECTOR = "[data-jobassist-apply]";

document.addEventListener("click", (event) => {
  const trigger = event.target instanceof Element ? event.target.closest(APPLY_SELECTOR) : null;
  if (!trigger) return;

  const application = {
    jobId: trigger.dataset.jobId || "",
    title: trigger.dataset.jobTitle || "Stelle",
    company: trigger.dataset.jobCompany || "",
    location: trigger.dataset.jobLocation || "",
    source: trigger.dataset.jobSource || "",
    jobAssistUrl: trigger.dataset.jobAssistUrl
      ? new URL(trigger.dataset.jobAssistUrl, location.origin).href
      : `${location.origin}/jobs/${trigger.dataset.jobId || ""}`,
    coverLetter: trigger.dataset.coverLetter || "",
    startedAt: Date.now(),
  };

  // Do not prevent navigation. Without the extension the link behaves exactly
  // like a normal external application link; with it, the destination page
  // receives this local application context.
  chrome.storage.local.set({ activeApplication: application });
  chrome.runtime.sendMessage({ type: "APPLICATION_STARTED" });
}, true);
