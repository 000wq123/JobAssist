/**
 * JobsLayout — Master/detail wrapper around /jobs and /jobs/:jobId.
 *
 * No detail selected → full-width list (no empty pane).
 * Detail selected    → 5/7 split on lg+, full-screen detail on mobile.
 */
import { Suspense, lazy } from "react";
import { Outlet, useParams } from "react-router-dom";
import clsx from "clsx";

const JobsPage = lazy(() => import("./JobsPage"));

export default function JobsLayout() {
  const { jobId } = useParams();
  const hasDetail = Boolean(jobId);

  return (
    <div className={clsx(hasDetail && "lg:grid lg:grid-cols-12 lg:gap-6 lg:h-[calc(100vh-3rem)]")}>
      {/* List pane — full-width when no detail, col-5 when detail open */}
      <aside
        className={clsx(
          hasDetail
            ? "lg:col-span-5 xl:col-span-4 lg:min-h-0 lg:overflow-y-auto lg:pr-2"
            : "w-full",
          hasDetail ? "hidden lg:block" : "block",
        )}
      >
        <Suspense fallback={null}>
          <JobsPage />
        </Suspense>
      </aside>

      {/* Detail pane — only rendered when a job is selected */}
      {hasDetail && (
        <section className="block lg:col-span-7 xl:col-span-8 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-[var(--color-border-subtle)] lg:pl-6">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </section>
      )}
    </div>
  );
}
