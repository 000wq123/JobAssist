from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "max"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionOut(BaseModel):
    plan: str
    status: str
    current_period_end: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UsageOut(BaseModel):
    feature: str
    used: int
    limit: int  # -1 = unlimited
    remaining: int  # -1 = unlimited


class BillingOverview(BaseModel):
    subscription: SubscriptionOut
    usage: list[UsageOut]
