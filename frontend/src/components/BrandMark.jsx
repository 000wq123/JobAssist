import clsx from "clsx";

const SIZE_CLASSES = {
  xs: "h-6 w-6 rounded-md",
  sm: "h-7 w-7 rounded-lg",
  md: "h-8 w-8 rounded-lg",
  lg: "h-10 w-10 rounded-xl",
  xl: "h-14 w-14 rounded-2xl",
};

/**
 * Canonical JobAssist mark, sourced from branding/logo.png at the repository
 * root. The header sizes rendered here are 24–28px, so the 4KB 64px PNG
 * (frontend/public/branding/jobassist-logo-64.png) is the default source;
 * the 2.9KB 96px WebP (jobassist-logo-96.webp) is preferred whenever the
 * browser supports WebP, and the small PNG doubles as the fallback for
 * browsers without WebP support. The 476KB 1024px master is never loaded
 * by this component — it exists only for Apple/Android touch icons and
 * favicon variants referenced from index.html.
 */
export default function BrandMark({ size = "md", className, label = "" }) {
  return (
    <span
      className={clsx(
        "inline-grid flex-shrink-0 place-items-center overflow-hidden bg-[#111116] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        className,
      )}
    >
      <picture>
        <source
          type="image/webp"
          srcSet="/branding/jobassist-logo-96.webp"
          width="96"
          height="95"
        />
        <img
          src="/branding/jobassist-logo-64.png"
          alt={label}
          width="64"
          height="64"
          decoding="async"
          className="h-full w-full object-contain"
        />
      </picture>
    </span>
  );
}
