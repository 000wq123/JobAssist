"""Plan definitions.

JobAssist is free and open source: every plan is unlimited (-1) for every
feature. The plan keys/names are kept for schema compatibility so the
subscription tables and /init usage payload keep working unchanged.
"""

PLAN_LIMITS = {
    "basic": {
        "cv_analysis": -1,
        "cv_generate": -1,
        "cover_letter": -1,
        "job_alerts": -1,
        "ai_chat": -1,
        "job_search": -1,
        "daily_manual_runs": -1,
        "daily_alert_edits": -1,
    },
    "pro": {
        "cv_analysis": -1,
        "cv_generate": -1,
        "cover_letter": -1,
        "job_alerts": -1,
        "ai_chat": -1,
        "job_search": -1,
        "daily_manual_runs": -1,
        "daily_alert_edits": -1,
    },
    "max": {
        "cv_analysis": -1,
        "cv_generate": -1,
        "cover_letter": -1,
        "job_alerts": -1,
        "ai_chat": -1,
        "job_search": -1,
        "daily_manual_runs": -1,
        "daily_alert_edits": -1,
    },
    "enterprise": {
        "cv_analysis": -1,
        "cv_generate": -1,
        "cover_letter": -1,
        "job_alerts": -1,
        "ai_chat": -1,
        "job_search": -1,
        "daily_manual_runs": -1,
        "daily_alert_edits": -1,
    },
}

PLAN_PRICES = {
    "basic": 0,
    "pro": 0,
    "max": 0,
    "enterprise": 0,
}

PLAN_NAMES = {
    "basic": "JobAssist (Free)",
    "pro": "JobAssist (Free)",
    "max": "JobAssist (Free)",
    "enterprise": "JobAssist (Free)",
}


def get_limit(plan: str, feature: str) -> int:
    """Return the limit for a feature on a plan. -1 means unlimited."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["basic"]).get(feature, -1)
