# Data Processing Agreement (DPA) — Template

> **Template — replace every `{{PLACEHOLDER}}` before signing.**
> Use this when a customer (especially B2B / enterprise) asks us to act
> as a data processor under GDPR Art. 28. Have counsel review any
> deviation from this baseline.

---

**This Data Processing Agreement** ("**DPA**") is entered into between:

- **Controller:** {{CONTROLLER_LEGAL_NAME}}, registered at
  {{CONTROLLER_ADDRESS}} ("**Customer**"), and
- **Processor:** {{PROCESSOR_LEGAL_NAME}} (operating JobAssist),
  registered at {{PROCESSOR_ADDRESS}} ("**JobAssist**").

It is effective from {{DPA_EFFECTIVE_DATE}} and forms part of the
agreement under which JobAssist provides the JobAssist service
("**Agreement**"). Where this DPA and the Agreement conflict on data
protection, this DPA prevails.

## 1. Definitions

Terms in **bold** have the meaning given in the EU General Data
Protection Regulation (Regulation (EU) 2016/679, "**GDPR**"). In
particular: "controller", "processor", "personal data", "processing",
"data subject", "supervisory authority".

## 2. Subject matter and duration

JobAssist processes Customer's **personal data** for the sole purpose of
delivering the JobAssist service as described in the Agreement, for the
duration of the Agreement plus the retention periods set out in § 8.

## 3. Nature, purpose, and categories of data

- **Nature & purpose:** hosting, storage, and AI-assisted processing of
  job-search and CV data to provide match scoring, cover-letter and
  interview-preparation features.
- **Categories of data subjects:** end-users of Customer (typically the
  Customer's employees or registered users).
- **Categories of personal data:** identifiers (name, email),
  professional CV content, job applications, search preferences,
  authentication metadata, usage telemetry, and Stripe billing
  identifiers. No special-category data (GDPR Art. 9) is intentionally
  collected; if Customer's users upload such data in free-text fields
  Customer remains responsible for the lawful basis.

## 4. Customer instructions

JobAssist will process personal data only on Customer's documented
instructions, including those given through normal use of the service
APIs and configuration. If JobAssist believes an instruction breaches
GDPR or other Union/Member-State data-protection law, it will notify
Customer without undue delay and may suspend execution of that
instruction.

## 5. Confidentiality

JobAssist ensures that personnel authorised to process the personal data
are bound by confidentiality obligations of no less rigour than those in
the Agreement, and are trained on data-protection requirements.

## 6. Security measures (GDPR Art. 32)

JobAssist implements appropriate technical and organisational measures,
including:

| Domain | Control |
|---|---|
| Transport | TLS 1.2+ for all client–server and server–server traffic |
| Storage   | Encryption at rest on the hosting provider; bcrypt-hashed passwords; httpOnly + Secure refresh-token cookies |
| Access    | Least-privilege production access; admin endpoints gated by a separate secret and rate-limited; audit log of admin actions |
| Network   | No public administrative interface; database not reachable from the public internet |
| Resilience | Daily managed Postgres backups retained for {{BACKUP_DAYS}} days; restore tested quarterly |
| Monitoring | Structured request logging with `request_id`; Sentry for error capture with PII redaction |
| Secrets   | Environment-variable-only secrets; rotation procedures documented in `docs/SECURITY_THREAT_MODEL.md` |
| Resilience testing | Threat-model review every release touching auth or payments |

A more granular technical & organisational measures (TOMs) statement is
available on request.

## 7. Sub-processors (GDPR Art. 28(2) and (4))

Customer provides **general written authorisation** for JobAssist to
engage sub-processors. The current list is maintained in
`docs/PRIVACY_POLICY.md` § 4 and at {{SUBPROCESSOR_PAGE}}. JobAssist will:

1. impose data-protection obligations on each sub-processor that are no
   less onerous than those in this DPA;
2. give Customer at least **{{SUBPROCESSOR_NOTICE_DAYS}} days' notice**
   of any new or replacement sub-processor via {{SUBPROCESSOR_NOTICE_CHANNEL}};
3. allow Customer to object on reasonable data-protection grounds; if
   the objection cannot be resolved, Customer may terminate the
   affected service with pro-rata refund.

JobAssist remains liable to Customer for the acts and omissions of its
sub-processors.

## 8. International transfers

Where personal data is transferred outside the EEA, JobAssist relies on
the EU Commission's **Standard Contractual Clauses (2021/914)** as
incorporated into the relevant sub-processor agreement, supplemented by
a transfer-impact assessment available on request. Transfers concerned
today: Stripe, Groq (both United States); Adzuna (United Kingdom — UK
Adequacy Decision applies).

## 9. Assistance to Customer

Taking into account the nature of the processing, JobAssist will assist
Customer, at Customer's expense, in fulfilling its obligations to:

- respond to data-subject rights requests (access, rectification,
  erasure, portability, restriction, objection) within
  {{ASSIST_DAYS}} days of a written request from Customer;
- conduct data-protection impact assessments (Art. 35);
- consult with supervisory authorities (Art. 36);
- notify personal-data breaches (see § 10).

For routine data-subject requests originating from end-users, end-users
can exercise rights directly in the JobAssist UI (settings → "Konto
endgültig löschen", export request to {{PRIVACY_EMAIL}}, etc.).

## 10. Personal-data breach notification

JobAssist will notify Customer **without undue delay and at most within
72 hours** after becoming aware of a personal-data breach affecting
Customer's data, providing:

- the nature of the breach, categories and approximate number of data
  subjects and records concerned;
- the likely consequences;
- the measures taken or proposed to address the breach and mitigate
  adverse effects;
- the contact point for further information.

Notification will not be construed as acknowledgement of fault or
liability.

## 11. Data return and deletion

On termination of the Agreement, JobAssist will, at Customer's choice
made within {{POST_TERM_CHOICE_DAYS}} days of termination:

- (a) return the personal data in a structured machine-readable format
  ({{EXPORT_FORMAT}}), or
- (b) delete the personal data;

and in either case will delete all remaining copies within
{{DELETE_AFTER_TERM_DAYS}} days, except where Union or Member-State law
requires retention. Backup rotations are overwritten within
{{BACKUP_DAYS}} days.

## 12. Audits

JobAssist will make available to Customer all information necessary to
demonstrate compliance with this DPA, and allow for and contribute to
audits, including inspections, conducted by Customer or an auditor
mandated by Customer.

To minimise operational disruption:

- audits will be conducted at most **once per 12-month period**, except
  after a confirmed breach;
- Customer will give at least **{{AUDIT_NOTICE_DAYS}} days' written
  notice**;
- the auditor will sign a customary NDA;
- both parties will use reasonable efforts to rely on JobAssist's most
  recent third-party report (e.g. {{THIRD_PARTY_REPORT_TYPE}}) where
  available before scheduling an on-site audit;
- on-site audits during business hours only, in a manner that does not
  unreasonably interfere with operations.

## 13. Liability

Liability under this DPA is subject to the limitations in the
Agreement, except where GDPR or applicable law prohibits limitation
(notably Art. 82 GDPR liability to data subjects).

## 14. Term and termination

This DPA continues for the term of the Agreement and survives until all
personal data is returned or deleted per § 11.

## 15. Governing law and venue

This DPA is governed by the law of {{GOVERNING_LAW_JURISDICTION}}, and
disputes are subject to the exclusive jurisdiction of the courts of
{{COURT_LOCATION}}, without prejudice to mandatory rules of GDPR or any
data subject's right to bring proceedings before the courts of their
habitual residence (Art. 79 GDPR).

---

## Annex 1 — Description of processing

| Item | Value |
|---|---|
| Subject matter | Provision of JobAssist SaaS to Customer |
| Duration | Term of the Agreement plus retention windows in § 8 / § 11 |
| Nature & purpose | Hosting, storage, AI-assisted match / cover-letter / interview prep |
| Categories of personal data | See § 3 and `PRIVACY_POLICY.md` § 1 |
| Categories of data subjects | Customer's end-users |
| Special-category data | None intentionally collected |
| Retention periods | Per `PRIVACY_POLICY.md` § 3 |
| Frequency | Continuous |

## Annex 2 — Technical & organisational measures (TOMs)

See § 6 of this DPA and `docs/SECURITY_THREAT_MODEL.md`. A standalone
TOMs PDF is available on request.

## Annex 3 — Authorised sub-processors

The list in `PRIVACY_POLICY.md` § 4 / {{SUBPROCESSOR_PAGE}} as of
{{DPA_EFFECTIVE_DATE}}.

---

**Signatures**

For the Controller:
- Name: {{CONTROLLER_SIGNATORY_NAME}}
- Title: {{CONTROLLER_SIGNATORY_TITLE}}
- Date: {{CONTROLLER_SIGN_DATE}}
- Signature: ____________________________

For the Processor:
- Name: {{PROCESSOR_SIGNATORY_NAME}}
- Title: {{PROCESSOR_SIGNATORY_TITLE}}
- Date: {{PROCESSOR_SIGN_DATE}}
- Signature: ____________________________
