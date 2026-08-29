/**
 * Company logo chip — single request to /proxy/logo/best; falls back to
 * the deterministic letter chip on 404.
 */

import { useEffect, useState } from "react";
import { logoApi } from "../../services/api";
import { logoAbbrev, logoColor } from "./domain";

// Cache promises (not only completed URLs) so list/detail duplicates share a
// single authenticated request. Object URLs remain valid for the app session.
const LOGO_REQUESTS = new Map();

function requestLogo(company, url, priority) {
  const key = JSON.stringify([company || "", url || ""]);
  if (!LOGO_REQUESTS.has(key)) {
    const request = logoApi.best(company, url, priority ? "high" : "auto")
      .then(({ data }) => {
        if (!(data instanceof Blob) || !data.type.startsWith("image/")) {
          throw new Error("Logo response is not an image");
        }
        return URL.createObjectURL(data);
      })
      .catch((error) => {
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
        onError={() => setFailed(true)}
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
