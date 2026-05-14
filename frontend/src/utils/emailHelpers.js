function getResearchData(job) {
  if (!job?.research_data) return null;
  if (typeof job.research_data === "object") return job.research_data;
  try {
    return JSON.parse(job.research_data);
  } catch {
    return null;
  }
}

export function getJobContactDetails(job, explicitContactEmail = "") {
  const research = getResearchData(job);
  const contact = research?.contact_info || {};

  return {
    email: explicitContactEmail || job?.contact_email || contact.email || "",
    phone: contact.phone || "",
    location: contact.location || research?.known_data?.hq || job?.location || "",
    website: contact.website || "",
  };
}

export function generateMailtoLink(job, body, userName, contactEmail = "") {
  const subject = `Bewerbung als ${job.title || job.role || "diese Stelle"} - ${userName}`;
  const normalisedBody = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
  const to = encodeURIComponent(getJobContactDetails(job, contactEmail).email || "");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(normalisedBody)}`;
}
