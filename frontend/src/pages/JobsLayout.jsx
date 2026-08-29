/**
 * JobsLayout — Master/detail wrapper around /jobs and /jobs/:jobId.
 *
 * No detail selected → full-width StellenPage.
 * Detail selected    → stable compact list + readable detail on lg+.
 */
import { Suspense } from "react";
import { Outlet, useParams } from "react-router-dom";
import clsx from "clsx";

import StellenPage from "./StellenPage";

export default function JobsLayout() {
  const { jobId } = useParams();
  const hasDetail = Boolean(jobId);

  return (
    <div className={clsx("animate-slide-up", hasDetail && "lg:grid lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] lg:gap-0 lg:h-[calc(100vh-3rem)]")}>
      {/* List pane */}
      <aside
        className={clsx(
          hasDetail
            ? "lg:min-h-0 lg:overflow-y-auto lg:pr-5 lg:border-r"
            : "w-full",
          hasDetail ? "hidden lg:block" : "block",
        )}
        style={{ borderColor: "var(--app-border-subtle, #EFEFEC)" }}
      >
        <StellenPage />
      </aside>

      {/* Detail pane */}
      {hasDetail && (
        <section className="block lg:min-h-0 lg:overflow-y-auto lg:pl-8 lg:pr-4"
          style={{ borderColor: "var(--app-border-subtle, #EFEFEC)" }}>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </section>
      )}
    </div>
  );
}
