"""Plan definitions and usage limits for each subscription tier."""

PLAN_LIMITS = {
    "basic": {
        "cv_analysis": 5,
        "cover_letter": 5,
        "job_alerts": 2,
        "ai_chat": 15,
        "job_search": 5,
        "daily_manual_runs": 3,   # manual "Run Now" clicks per day
        "daily_alert_edits": 3,   # alert creates + edits per day
    },
    "pro": {
        "cv_analysis": 15,
        "cover_letter": 25,
        "job_alerts": 10,
        "ai_chat": 200,
        "job_search": 20,
        "daily_manual_runs": 10,
        "daily_alert_edits": 10,
    },
    "max": {
        "cv_analysis": -1,  # unlimited
        "cover_letter": -1,
        "job_alerts": -1,
        "ai_chat": -1,
        "job_search": -1,
        "daily_manual_runs": -1,
        "daily_alert_edits": -1,
    },
    "enterprise": {
        "cv_analysis": -1,
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
    "pro": 4.99,
    "max": 7.99,
    "enterprise": None,  # contact us
}

PLAN_NAMES = {
    "basic": "Basic (Free)",
    "pro": "Pro",
    "max": "Max",
    "enterprise": "Enterprise",
}


def get_limit(plan: str, feature: str) -> int:
    """Return the limit for a feature on a plan. -1 means unlimited."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["basic"]).get(feature, 0)
