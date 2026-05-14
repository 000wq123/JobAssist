from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProcessedWebhookEvent(Base):
    """Idempotency log for Stripe webhook events.

    Before processing any event, insert its ID here.  If the INSERT fails with
    a unique-constraint violation the event was already handled — return 200
    immediately so Stripe stops retrying.
    """

    __tablename__ = "processed_webhook_events"

    event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
