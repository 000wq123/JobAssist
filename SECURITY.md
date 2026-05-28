# Security Policy

Thank you for taking the time to investigate the security of JobAssist
responsibly. This document explains what's in scope, how to report a
vulnerability, and what to expect from us in return.

## Reporting a vulnerability

**Please do not open a public GitHub issue or discuss the vulnerability
on social media before we have had a chance to investigate.**

- **Email:** `{{SECURITY_EMAIL}}` (replace before publishing — typically
  `security@jobassist.tech`).
- **PGP key:** *(optional — paste a public key block here once one is
  generated, otherwise omit this line.)*
- **Encryption:** if you don't have our PGP key, send an unencrypted
  high-level description and we'll respond from a secure channel.

When reporting, please include:

1. A clear description of the issue, the affected endpoint or component,
   and the impact you observed.
2. Step-by-step reproduction (curl/HTTP requests, screenshots, screen
   recording if behaviour is timing-sensitive).
3. Any proof-of-concept code or payload (please **do not** exfiltrate
   real user data — see "Safe-harbour testing" below).
4. The commit hash or production URL you tested against.
5. Your name / handle for credit, if you would like to be acknowledged.

## What to expect

| Stage | Target |
|---|---|
| Acknowledgement of receipt | within **48 hours** (business days) |
| First triage + severity assignment | within **5 business days** |
| Fix or mitigation deployed | depends on severity (see table below) |
| Public disclosure | coordinated with the reporter, typically after the fix is deployed and customers have been notified where required |

| Severity | Indicative time-to-fix |
|---|---|
| Critical (auth bypass, RCE, data exfiltration affecting many users) | within **7 days** |
| High (single-user data exposure, privilege escalation) | within **30 days** |
| Medium (CSRF, low-impact info-disclosure, weak crypto config) | within **90 days** |
| Low (best-practice deviations, hardening suggestions) | scheduled into the security backlog (`docs/SECURITY_THREAT_MODEL.md` § 3) |

## Scope

In scope for our coordinated-disclosure programme:

- Production frontend at `https://jobassist.tech` and any other domain we
  publicly advertise as ours.
- Production API at `https://api.jobassist.tech` (or its current
  Railway-hosted equivalent — see `docs/DEPLOYMENT_CHECKLIST.md`).
- Source code in this repository (security-relevant defects in any
  released version).

Out of scope:

- Third-party services we depend on but do not control. Report findings
  there to the respective vendors:
  - Stripe → <https://www.stripe.com/security>
  - Groq → <https://groq.com>
  - Adzuna → <https://www.adzuna.com>
  - Render / Vercel / Sentry / our email provider — their own programmes.
- DDoS, volumetric attacks, or anything that requires saturating
  upstream capacity to reproduce.
- Findings that require physical access to a user's device, social
  engineering of our team, or compromise of a user's email account.
- Self-XSS, missing best-practice headers on non-production domains,
  output of automated scanners without a working PoC, or "informational"
  TLS configuration nits already documented as accepted in
  `docs/SECURITY_THREAT_MODEL.md` § 3.

## Safe-harbour testing

If you act in good faith — no privacy violations, no destruction of
data, no degradation of service, no exfiltration beyond the minimum
needed to demonstrate the issue, and no testing of accounts you don't
own — we will **not** pursue legal action against you for security
research that complies with this policy.

Concretely:

- Use a test account you registered yourself. If you must test against a
  real customer's data, **stop and tell us first.**
- Do not run automated scanners against production at high concurrency.
- Do not access, modify, or delete data that is not your own.
- Give us reasonable time to fix the issue before any public disclosure.

## Bounty

We do not currently run a paid bug-bounty programme. If a finding is
materially valuable we will offer credit in our release notes, a thank
you in this file, and (where appropriate) coordinated disclosure
support. Replace this section if a bounty programme is added.

## Hall of fame

*(empty — first reporter, this is your spot.)*
