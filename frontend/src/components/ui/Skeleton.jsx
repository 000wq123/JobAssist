import clsx from "clsx";

/**
 * Skeleton — loading placeholder. Subtle pulse, neutral color.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function Skeleton({ className = "" }) {
  return (
    <div
      className={clsx(
        "animate-pulse ja-shimmer rounded-md bg-[var(--color-bg-elev-2)]",
        className,
      )}
    />
  );
}
