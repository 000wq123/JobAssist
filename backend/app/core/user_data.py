"""Single inventory of user-owned records for export and erasure."""
from dataclasses import dataclass

from app.models.cv_library_entry import CvLibraryEntry
from app.models.deadline import Deadline
from app.models.inbox_item import InboxItem
from app.models.job import Job
from app.models.job_alert import JobAlert
from app.models.profile_v2 import ProfileV2
from app.models.refresh_token import RefreshToken
from app.models.resume import Resume
from app.models.subscription import Subscription
from app.models.usage import UsageRecord
from app.models.user_profile import UserProfile
from app.models.web_push_subscription import WebPushSubscription


@dataclass(frozen=True)
class UserDataSpec:
    key: str
    model: type
    many: bool = True


# This is the reviewed portability contract. Adding a new user-owned model
# requires adding it here and extending the completeness integration test.
EXPORT_DATA_SPECS = (
    UserDataSpec("profile", UserProfile, many=False),
    UserDataSpec("profile_v2", ProfileV2, many=False),
    UserDataSpec("cv_library_entries", CvLibraryEntry),
    UserDataSpec("resumes", Resume),
    UserDataSpec("jobs", Job),
    UserDataSpec("job_alerts", JobAlert),
    UserDataSpec("subscription", Subscription, many=False),
    UserDataSpec("usage_records", UsageRecord),
    UserDataSpec("web_push_subscriptions", WebPushSubscription),
    UserDataSpec("inbox_items", InboxItem),
    UserDataSpec("deadlines", Deadline),
)


# Child-first order also works on databases where cascade enforcement is
# temporarily disabled during maintenance.
DELETE_USER_DATA_MODELS = (
    Deadline,
    InboxItem,
    WebPushSubscription,
    CvLibraryEntry,
    JobAlert,
    Job,
    Resume,
    ProfileV2,
    UserProfile,
    Subscription,
    UsageRecord,
    RefreshToken,
)
