/**
 * Empfohlene Kurse — shows AI-suggested courses from job.suggested_courses
 * (JSON array). Falls back to a placeholder prompting CV linkage.
 * Each course: { title, platform, duration?, url? }
 */

import { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { defaultBaseURL } from "../../services/api";
import { ANNOT } from "./ui";

const PLATFORM_ICONS = {
  youtube:            { color: "#ff0000", domain: "youtube.com" },
  coursera:           { color: "#0056d3", domain: "coursera.org" },
  udemy:              { color: "#a435f0", domain: "udemy.com" },
  linkedin:           { color: "#0077b5", domain: "linkedin.com" },
  "linkedin learning":{ color: "#0077b5", domain: "linkedin.com" },
  "khan academy":     { color: "#14bf96", domain: "khanacademy.org" },
  skillshare:         { color: "#00cc76", domain: "skillshare.com" },
  edx:                { color: "#02262b", domain: "edx.org" },
  pluralsight:        { color: "#f15a2c", domain: "pluralsight.com" },
  duolingo:           { color: "#58cc02", domain: "duolingo.com" },
  futurelearn:        { color: "#de00a5", domain: "futurelearn.com" },
  openhpi:            { color: "#e2001a", domain: "open.hpi.de" },
};

/** Single course row — cascade: apple-touch-icon → favicon.ico → badge. */
function CourseRow({ course }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const pk   = (course.platform || "").toLowerCase();
  const meta = Object.entries(PLATFORM_ICONS).find(([k]) => pk.includes(k))?.[1];
  const bg   = meta?.color ?? "#52525b";
  const abbr = (course.platform || "?").replace(/\s+learning|\s+academy/i, "").slice(0, 2).toUpperCase();

  const proxy = (u) => `${defaultBaseURL}/proxy/logo?url=${encodeURIComponent(u)}`;
  const sources = meta?.domain ? [
    proxy(`https://www.${meta.domain}/apple-touch-icon.png`),
    proxy(`https://www.${meta.domain}/favicon.ico`),
  ] : [];

  const showImg = srcIdx < sources.length;

  const getCourseHref = () => {
    if (course.url && /^https?:\/\//i.test(course.url)) return course.url;
    const q = encodeURIComponent(course.title || "Kurs");
    if (pk.includes("youtube"))  return `https://www.youtube.com/results?search_query=${q}`;
    if (pk.includes("coursera")) return `https://www.coursera.org/search?query=${q}`;
    if (pk.includes("udemy"))    return `https://www.udemy.com/courses/search/?q=${q}`;
    if (pk.includes("linkedin")) return `https://www.linkedin.com/learning/search?keywords=${q}`;
    if (pk.includes("edx"))      return `https://www.edx.org/search?q=${q}`;
    return `https://www.google.com/search?q=${q}+Kurs+online`;
  };

  return (
    <a
      href={getCourseHref()}
      target="_blank"
      rel="noopener noreferrer"
      className="px-5 py-4 flex items-center gap-3.5 hover:bg-[var(--color-bg-elev-2)] transition-colors group"
      style={{ textDecoration: "none", display: "flex" }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-lg grid place-items-center"
        style={{ background: bg }}
      >
        {showImg ? (
          <img
            key={sources[srcIdx]}
            src={sources[srcIdx]}
            alt={course.platform || ""}
            referrerPolicy="no-referrer"
            className="w-7 h-7 object-contain rounded-md"
            onError={() => setSrcIdx((i) => i + 1)}
          />
        ) : (
          <span className="text-[11px] font-bold text-white tracking-wide">{abbr}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-[var(--color-fg)] leading-snug line-clamp-2">{course.title}</p>
        <p className="mt-0.5 text-[12px] text-[var(--color-fg-dim)]">
          {course.platform}
          {course.duration ? <span className="text-[var(--color-fg-faint)]"> · {course.duration}</span> : null}
        </p>
      </div>
      <ExternalLink className="shrink-0 w-3.5 h-3.5 text-[var(--color-fg-faint)] group-hover:text-[var(--color-fg-dim)] transition-colors" />
    </a>
  );
}

export default function CoursesCard({ job, resumeId, onOpenEdit, onGenerate, generating }) {
  const courses = useMemo(() => {
    if (!job.suggested_courses) return null;
    try {
      const p = JSON.parse(job.suggested_courses);
      return Array.isArray(p) && p.length ? p : null;
    } catch { return null; }
  }, [job.suggested_courses]);

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <p className={ANNOT}>Empfohlene Kurse</p>
        {courses ? (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="text-[11px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] disabled:opacity-50 inline-flex items-center gap-1 transition-colors"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {generating ? "Erstellt…" : `${courses.length} Vorschläge · Neu`}
          </button>
        ) : null}
      </div>
      {courses ? (
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {courses.map((c, i) => <CourseRow key={i} course={c} />)}
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-[13px] text-[var(--color-fg-dim)] leading-relaxed">
            {resumeId
              ? "Kurse werden auf Basis deines Lebenslaufs und der Stellenbeschreibung vorgeschlagen."
              : "Verknüpfe deinen Lebenslauf — dann schlägt die App passende Kurse für diese Stelle vor."}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            {!resumeId && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="h-8 px-3 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"
                style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.28)", color: "#60a5fa" }}
              >
                Lebenslauf wählen
              </button>
            )}
            {onGenerate && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="h-8 px-3 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                style={{ background: "rgba(45,212,191,0.10)", border: "1px solid rgba(45,212,191,0.28)", color: "#5eead4" }}
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {generating ? "Wird erstellt…" : "Kurse vorschlagen"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
