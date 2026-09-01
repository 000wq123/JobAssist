import clsx from "clsx";

const SIZE_CLASSES = {
  xs: "h-6 w-6 rounded-md",
  sm: "h-7 w-7 rounded-lg",
  md: "h-8 w-8 rounded-lg",
  lg: "h-10 w-10 rounded-xl",
  xl: "h-14 w-14 rounded-2xl",
};

/** Canonical JobAssist mark, sourced from branding/logo.png at the repository root. */
export default function BrandMark({ size = "md", className, label = "" }) {
  return (
    <span
      className={clsx(
        "inline-grid flex-shrink-0 place-items-center overflow-hidden bg-[#111116] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        className,
      )}
    >
      <img
        src="/branding/jobassist-logo.png"
        alt={label}
        width="1024"
        height="1017"
        decoding="async"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
