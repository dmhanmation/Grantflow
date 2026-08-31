# GrantFlow — Internal Reviewer Dashboard Update

This build keeps the prior Admin, Officer, Proposal Lead, and Department Head dashboard simplifications and adds a lean Internal Reviewer dashboard.

Internal Reviewer dashboard now focuses on:
- Assigned Reviews
- Awaiting My Review
- Due Soon
- Reviewed / Returned status
- A single My Review Queue with proposal lead, donor, deadline, stage, readiness, and Open Review action

Organisation-wide executive, admin, compliance, hierarchy, pipeline, and staff-workload panels are not shown on the Internal Reviewer landing page. Wider GrantFlow navigation remains unchanged.

No .env file or API key is included.

## Staff email notifications
GrantFlow can send action-based staff email notifications through Resend. Configure these values in the local/deployed `.env` (never commit the real key):

- `RESEND_API_KEY`
- `EMAIL_FROM` (a verified sender, e.g. `GrantFlow <notifications@yourdomain.org>`)
- `APP_URL` (the deployed GrantFlow URL used in email links)
- optional `NOTIFICATION_CRON_SECRET` (otherwise the existing `SCOUT_CRON_SECRET` is reused)

Transactional emails are triggered for invitations, new assignments, review requests, returned work, blocked work, internal review and final approval changes. The scheduled notification scan adds due-date, overdue, proposal-deadline and institutional-document-expiry alerts while suppressing duplicates.
