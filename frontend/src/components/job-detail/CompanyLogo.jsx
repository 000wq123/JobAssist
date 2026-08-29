/**
 * Company logo chip — single request to /proxy/logo/best; falls back to
 * the deterministic letter chip on 404.
 */

import { useEffect, useState } from "react";
import { defaultBaseURL } from "../../services/api";
import { logoAbbrev, logoColor } from "./domain";

const _API = defaultBaseURL;

const SIZE_CLASSES = {
  sm: "w-10 h-10 rounded-xl text-[12px]",
  md: "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-[13px]",
};

export default function CompanyLogo({ company, url, size = "md" }) {
  const [failed, setFailed] = useState(false);
  const src = `${_API}/proxy/logo/best?company=${encodeURIComponent(company || "")}&url=${encodeURIComponent(url || "")}`;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  useEffect(() => setFailed(false), [src]);

  if (!failed && company) {
    return (
      <img
        key={src}
        src={src}
        alt={`${company} Logo`}
        data-company-logo
        loading="lazy"
        referrerPolicy="no-referrer"
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
