-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id      VARCHAR(255),
    stripe_subscription_id  VARCHAR(255),
    stripe_price_id         VARCHAR(255),
    plan                    VARCHAR(20) NOT NULL DEFAULT 'basic',
    status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions(user_id);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    feature         VARCHAR(50) NOT NULL,
    period_start    DATE NOT NULL,
    count           INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_user_feature_period UNIQUE (user_id, feature, period_start)
);

CREATE INDEX IF NOT EXISTS ix_usage_tracking_user_id ON usage_tracking(user_id);
