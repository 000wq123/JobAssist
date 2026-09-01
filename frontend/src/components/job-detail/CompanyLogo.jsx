/**
 * Company logo chip — single request to /proxy/logo/best; falls back to
 * the deterministic letter chip on 404.
 */

import { useEffect, useState } from "react";
import { logoApi } from "../../services/api";
import { logoAbbrev, logoColor } from "./domain";

// Cache promises (not only completed URLs) so every row for the same company
// shares one authenticated request. Job-board URLs identify the listing, not
// the company; including them here made identical HOFER rows disagree about
// whether a logo existed. Object URLs remain valid for the app session.
const LOGO_REQUESTS = new Map();

// A miss is only remembered briefly. Logo providers occasionally time out, so
// a single failure must not poison a real company for the entire app session.
const FAILED_LOGOS = new Map();
const FAILED_LOGO_TTL_MS = 30_000;

export function companyLogoKey(company) {
  return String(company || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(?:gmbh|m\.?b\.?h\.?|ag|kg|ohg|se|austria|osterreich|oesterreich)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when a previous request for this logo 404'd — skip re-requesting. */
export function isLogoFailed(company) {
  const key = companyLogoKey(company);
  const failedAt = FAILED_LOGOS.get(key);
  if (!failedAt) return false;
  if (Date.now() - failedAt < FAILED_LOGO_TTL_MS) return true;
  FAILED_LOGOS.delete(key);
  return false;
}

/** Record a logo 404 (also used by plain-<img> callers like JobRow). */
export function markLogoFailed(company) {
  FAILED_LOGOS.set(companyLogoKey(company), Date.now());
}

function requestLogo(company, url, priority) {
  const key = companyLogoKey(company);
  if (!LOGO_REQUESTS.has(key)) {
    const request = logoApi.best(company, url, priority ? "high" : "auto")
      .then(({ data }) => {
        if (!(data instanceof Blob) || !data.type.startsWith("image/")) {
          throw new Error("Logo response is not an image");
        }
        FAILED_LOGOS.delete(key);
        return URL.createObjectURL(data);
      })
      .catch((error) => {
        if (error?.response?.status === 404) {
          FAILED_LOGOS.set(key, Date.now());
        }
        // Never retain a rejected promise. After the short miss TTL (or
        // immediately for transient errors), a later mount may recover.
        LOGO_REQUESTS.delete(key);
        throw error;
      });
    LOGO_REQUESTS.set(key, request);
  }
  return LOGO_REQUESTS.get(key);
}

const SIZE_CLASSES = {
  xs: "w-9 h-9 rounded-lg text-[11px]",
  sm: "w-10 h-10 rounded-xl text-[12px]",
  md: "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-[13px]",
};

export default function CompanyLogo({ company, url, size = "md", priority = false }) {
  const [logoSrc, setLogoSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  useEffect(() => {
    let cancelled = false;
    setLogoSrc(null);
    setFailed(false);
    if (!company) return () => { cancelled = true; };

    // Cached 404 — skip the request entirely.
    if (isLogoFailed(company)) {
      setFailed(true);
      return () => { cancelled = true; };
    }

    requestLogo(company, url, priority)
      .then((src) => { if (!cancelled) setLogoSrc(src); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [company, url, priority]);

  if (company && !failed && !logoSrc) {
    return (
      <div
        className={`${sizeClass} flex-shrink-0 animate-pulse bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)]`}
        data-company-logo
        role="img"
        aria-label={`${company} Logo wird geladen`}
      />
    );
  }

  if (!failed && logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={`${company} Logo`}
        data-company-logo
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onError={() => {
          markLogoFailed(company);
          setFailed(true);
        }}
        className={`${sizeClass} object-contain flex-shrink-0 bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] p-1.5`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} ${logoColor(company)} text-white font-bold grid place-items-center flex-shrink-0`}
      data-company-logo
      role="img"
      aria-label={company ? `${company} Logo-Ersatz` : "Unternehmenslogo"}
    >
      {logoAbbrev(company)}
    </div>
  );
}
