"""Tiny in-process metrics registry that emits Prometheus text format.

Why hand-rolled: we only need a handful of counters (HTTP requests,
scheduler runs, cache hits, circuit-breaker state). Pulling in
`prometheus-client` for that triples our cold-start dependency surface
and forces a multiprocess-mode dance under gunicorn that we don't need.

If we ever grow beyond a single instance per env, swap this for the real
client — the public surface (`inc`, `gauge`, `render`) stays compatible.

Thread-safety: every mutation takes `_lock`, so concurrent gunicorn
workers (which each have their own process and therefore own registry)
cannot corrupt the counter table within a single process.
"""
from __future__ import annotations

import threading
from typing import Iterable


_lock = threading.Lock()
_counters: dict[tuple[str, tuple[tuple[str, str], ...]], float] = {}
_gauges: dict[tuple[str, tuple[tuple[str, str], ...]], float] = {}
_help: dict[str, str] = {}


def _key(name: str, labels: dict[str, str] | None) -> tuple[str, tuple[tuple[str, str], ...]]:
    items = tuple(sorted((labels or {}).items()))
    return (name, items)


def register(name: str, help_text: str) -> None:
    """Pre-register a metric so `# HELP` is emitted even when count is zero."""
    _help[name] = help_text


def inc(name: str, value: float = 1.0, labels: dict[str, str] | None = None) -> None:
    """Increment a monotonic counter."""
    k = _key(name, labels)
    with _lock:
        _counters[k] = _counters.get(k, 0.0) + value


def gauge(name: str, value: float, labels: dict[str, str] | None = None) -> None:
    """Set a gauge (current value, can go up or down)."""
    k = _key(name, labels)
    with _lock:
        _gauges[k] = value


def _format_labels(labels: Iterable[tuple[str, str]]) -> str:
    if not labels:
        return ""
    pairs = ",".join(f'{k}="{_escape(v)}"' for k, v in labels)
    return "{" + pairs + "}"


def _escape(value: str) -> str:
    """Prometheus label value escape rules: \\, \", \\n."""
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace('"', '\\"')
    )


def render() -> str:
    """Emit Prometheus text exposition format."""
    lines: list[str] = []
    seen_names: set[str] = set()

    with _lock:
        snapshot_counters = list(_counters.items())
        snapshot_gauges = list(_gauges.items())

    for (name, labels), value in snapshot_counters:
        if name not in seen_names:
            if name in _help:
                lines.append(f"# HELP {name} {_help[name]}")
            lines.append(f"# TYPE {name} counter")
            seen_names.add(name)
        lines.append(f"{name}{_format_labels(labels)} {value}")

    for (name, labels), value in snapshot_gauges:
        if name not in seen_names:
            if name in _help:
                lines.append(f"# HELP {name} {_help[name]}")
            lines.append(f"# TYPE {name} gauge")
            seen_names.add(name)
        lines.append(f"{name}{_format_labels(labels)} {value}")

    # Always include any pre-registered metrics that haven't been touched yet,
    # so dashboards don't show "no data" the first time they're queried.
    for name, help_text in _help.items():
        if name in seen_names:
            continue
        lines.append(f"# HELP {name} {help_text}")
        lines.append(f"# TYPE {name} counter")
        lines.append(f"{name} 0")

    return "\n".join(lines) + "\n"


# Pre-register the metrics this codebase emits so they're always present in
# the scrape output.
register("jobassist_http_requests_total", "HTTP requests received, partitioned by method/status.")
register("jobassist_scheduler_runs_total", "Scheduler ticks, partitioned by task/outcome.")
register("jobassist_adzuna_cache_total", "Adzuna search-cache events, partitioned by outcome (hit/miss/skip).")
register("jobassist_adzuna_circuit_breaker_open", "1 if the Adzuna circuit breaker is currently open, else 0.")
register("jobassist_db_errors_total", "Database errors caught by the retry helper.")
register("jobassist_admin_actions_total", "Admin endpoint invocations, partitioned by action/outcome.")


__all__ = ["inc", "gauge", "register", "render"]
