/**
 * Company logo chip — single request to /proxy/logo/best; falls back to
 * the deterministic letter chip on 404.
 */

import { useState } from "react";
import { defaultBaseURL } from "../../services/api";
import { logoAbbrev, logoColor } from "./domain";

const _API = defaultBaseURL;

export default function CompanyLogo({ company, url }) {
  const [failed, setFailed] = useState(false);
  const src = `${_API}/proxy/logo/best?company=${encodeURIComponent(company || "")}&url=${encodeURIComponent(url || "")}`;

  if (!failed && company) {
    return (
      <img
        key={src}
        src={src}
        alt={company}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-contain flex-shrink-0 bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] p-1.5"
      />
    );
  }
  return (
    <div
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${logoColor(company)} text-white text-[13px] font-bold grid place-items-center flex-shrink-0`}
      aria-hidden="true"
    >
      {logoAbbrev(company)}
    </div>
  );
}
