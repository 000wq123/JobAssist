/**
 * JobsLayout — Master/detail wrapper around /jobs and /jobs/:jobId.
 *
 * No detail selected → full-width StellenPage.
 * Detail selected    → 5/7 split on lg+, full-screen detail on mobile.
 */
import { Suspense } from "react";
import { Outlet, useParams } from "react-router-dom";
import clsx from "clsx";

import StellenPage from "./StellenPage";

export default function JobsLayout() {
  const { jobId } = useParams();
  const hasDetail = Boolean(jobId);

  return (
    <div className={clsx(hasDetail && "lg:grid lg:grid-cols-12 lg:gap-6 lg:h-[calc(100vh-3rem)]")}>
      {/* List pane */}
      <aside
        className={clsx(
          hasDetail
            ? "lg:col-span-5 xl:col-span-4 lg:min-h-0 lg:overflow-y-auto lg:pr-2"
            : "w-full",
          hasDetail ? "hidden lg:block" : "block",
        )}
      >
        <StellenPage />
      </aside>

      {/* Detail pane */}
      {hasDetail && (
        <section className="block lg:col-span-7 xl:col-span-8 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:pl-6"
          style={{ borderColor: "var(--app-border-subtle, #EFEFEC)" }}>
          <Suspense fallback={<div className="animate-pulse rounded-xl" style={{height:200,background:"var(--app-border, #E7E7E4)",opacity:0.25}} />}>
            <Outlet />
          </Suspense>
        </section>
      )}
    </div>
  );
}