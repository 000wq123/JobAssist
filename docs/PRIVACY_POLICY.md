# Privacy Policy — JobAssist

> **Template — replace every `{{PLACEHOLDER}}` before publishing.**
> This file is the customer-facing privacy notice we surface from the
> `/privacy` route of the SPA. It is calibrated to GDPR (EU) and is
> deliberately concise. Run any substantive change past counsel.

**Effective date:** {{EFFECTIVE_DATE}}  
**Last updated:** {{LAST_UPDATED}}

JobAssist ("we", "us") is operated by {{LEGAL_ENTITY_NAME}}, registered at
{{LEGAL_ENTITY_ADDRESS}}, contact {{PRIVACY_EMAIL}}.

This policy explains what personal data we collect, why we collect it,
who we share it with, and what rights you have. It applies to the
JobAssist web application at {{PRODUCT_URL}} and the API at
{{API_URL}}.

## 1. Data we collect

### 1.1 Provided by you

| Category | Examples | Source |
|---|---|---|
| Account identifiers | email, hashed password, full name | registration form |
| Profile data        | preferred locations, salary range, job types, industries, experience level, avatar image | settings page |
| Curriculum vitae    | uploaded PDF/DOCX text, structured parse | resume upload |
| Job applications    | company, role, URL, notes, deadline, status, AI-generated cover letters and interview Q&A | job tracker |
| Job alerts          | search keywords, location filters, frequency | alerts page |
| Communication       | feedback, support requests | contact form |

### 1.2 Generated about you

| Category | Examples | Why |
|---|---|---|
| Authentication state   | refresh tokens (httpOnly cookie), session timestamps | keep you logged in |
| Browser fingerprint    | per-account device hash | account-security signals |
| Usage counters         | per-feature daily / monthly counts | enforce plan quotas |
| Diagnostic logs        | structured logs with `request_id`, status, latency | operational debugging |
| Error reports          | stack traces (with redacted PII) via Sentry | bug triage |

### 1.3 Payment data

We **do not store payment card information**. Stripe Checkout collects
card data directly. We retain only the Stripe customer ID, subscription
ID, plan tier, and the current billing-period end date in the
`subscriptions` table.

## 2. Why we use your data (legal basis under GDPR Art. 6)

| Purpose | Legal basis |
|---|---|
| Run the service you signed up for (auth, storage, AI actions) | Performance of contract — Art. 6(1)(b) |
| Send transactional email (verification, password reset, receipts) | Performance of contract — Art. 6(1)(b) |
| Process payments via Stripe | Performance of contract — Art. 6(1)(b) |
| Enforce quotas, prevent abuse, audit admin actions | Legitimate interest — Art. 6(1)(f) |
| Aggregate, anonymised product analytics | Legitimate interest — Art. 6(1)(f) |
| Marketing email (if you opt in) | Consent — Art. 6(1)(a) |
| Comply with tax / accounting law | Legal obligation — Art. 6(1)(c) |

We do **not** sell personal data and we do **not** use it to train any
LLM. The LLM provider we use (see § 4) is contractually bound to the
same restriction.

## 3. Retention

| Data | Retention |
|---|---|
| Account + profile + CV + jobs + alerts | Until you delete your account, then erased within {{DELETE_GRACE_DAYS}} days from primary storage and within {{BACKUP_DAYS}} days from rolling backups |
| Authentication refresh tokens | `REFRESH_TOKEN_EXPIRE_DAYS` (default 30 days) from issue, or until you log out |
| Diagnostic logs | {{LOG_RETENTION_DAYS}} days |
| Sentry error reports | {{SENTRY_RETENTION_DAYS}} days |
| Stripe billing records | Retained by Stripe per their policy; we keep customer / subscription IDs while the account exists |
| Marketing-email opt-in record | Until you unsubscribe, plus {{MARKETING_PROOF_DAYS}} days for opt-in proof |

Inactive unverified accounts are purged automatically by the
`delete_stale_unverified_users` scheduler after {{STALE_VERIFY_DAYS}} days.

## 4. Subprocessors

We rely on the following third parties to operate the service. Each is
contractually bound by a Data Processing Agreement (DPA — see
`docs/DPA_TEMPLATE.md`) and EU Standard Contractual Clauses where data
leaves the EEA.

| Subprocessor | Purpose | Data shared | Region |
|---|---|---|---|
| {{HOSTING_PROVIDER}} (e.g. Render) | Application + database hosting | All operational data | {{HOSTING_REGION}} |
| Stripe, Inc. | Payment processing | Email, name, billing country, payment method (collected by Stripe directly) | US (SCCs) |
| Groq, Inc. | LLM inference for match / cover letter / interview prep | CV text + job description, sent per request, not retained for training | US (SCCs) |
| Adzuna Ltd. | Job-search source | Search keywords + location filters | UK |
| {{EMAIL_PROVIDER}} (e.g. Resend / Postmark / SES) | Transactional email | Email address + email body | {{EMAIL_REGION}} |
| Sentry GmbH | Error monitoring | Stack traces, redacted request metadata | EU |

An up-to-date subprocessor list lives at {{SUBPROCESSOR_PAGE}}. We will
give at least {{SUBPROCESSOR_NOTICE_DAYS}} days' notice before adding a
new subprocessor; you may object by contacting {{PRIVACY_EMAIL}}.

## 5. Where your data lives

Primary storage is in {{PRIMARY_REGION}}. Backups are stored in
{{BACKUP_REGION}}. Some subprocessors (notably Stripe and Groq) process
data in the United States under EU Standard Contractual Clauses; we have
performed a transfer impact assessment, available on request.

## 6. Your rights

Under GDPR you may:

- **Access** the personal data we hold about you.
- **Correct** any inaccurate data — most fields can be edited directly
  in the app's settings page.
- **Erase** your data — clicking "Konto endgültig löschen" in settings
  triggers a hard delete of your account, CVs, jobs, alerts, profile,
  and refresh tokens. Subscription history is anonymised but retained
  for tax purposes per § 3.
- **Export** your data — request a JSON export by emailing
  {{PRIVACY_EMAIL}}. We respond within 30 days.
- **Restrict** or **object** to specific processing.
- **Withdraw consent** for marketing email at any time via the
  unsubscribe link.
- **Lodge a complaint** with your local supervisory authority. In
  Austria this is the Datenschutzbehörde (https://www.dsb.gv.at).

## 7. Security

We follow the controls described in `docs/SECURITY_THREAT_MODEL.md`,
including TLS in transit, bcrypt-hashed passwords, httpOnly refresh-token
cookies, Postgres at-rest encryption, audit-logged admin actions, and
rate-limiting on authentication endpoints. We will notify affected users
of any personal-data breach within 72 hours of discovery, as required by
GDPR Art. 33–34.

## 8. Cookies

We set a small number of cookies; see `docs/COOKIE_NOTICE.md` (to be
written when cookie banner is added) or the in-app banner. The
authentication refresh-token cookie is **strictly necessary** and is not
subject to consent under the ePrivacy directive.

## 9. Children

JobAssist is not directed at children under 16 and we do not knowingly
collect data from them. If you believe we have, contact
{{PRIVACY_EMAIL}} and we will delete the account.

## 10. Changes to this policy

We will post material changes with a new "Last updated" date and, where
required, notify you by email. Continued use of JobAssist after the
effective date constitutes acceptance.

## 11. Contact

Questions about this policy or your data:
- email: {{PRIVACY_EMAIL}}
- post:  {{PRIVACY_POSTAL_ADDRESS}}

If you live in the EEA, our EU representative is {{EU_REPRESENTATIVE}}
(Art. 27 GDPR).
