# ADR-006: Use Cloudflare for course email

**Status:** Accepted

**Date:** 2026-10-05

## Context

Roster-provisioned magic-link sign-in requires transactional mail to institutional addresses.
The instructor wants `info@scalableweb.dev` as the course address, Cloudflare infrastructure for sending, and incoming mail forwarded to an existing Gmail inbox.
The account and domain setup needed for this has not been performed as part of the discussion.

## Decision

Send course magic-link messages from `info@scalableweb.dev` through Cloudflare Email Sending integrated with the Worker.
Use Cloudflare Email Routing to forward incoming mail for that address to a verified existing Gmail destination.
Treat outgoing delivery and incoming forwarding as separate configurations.
Gmail is the instructor's inbox, not the SMTP provider for automated sign-in mail.

Complete domain verification and the provider's required DNS/authentication setup before enabling production login delivery.
As checked when recording this decision, Email Sending is in beta and requires a Workers Paid plan; verify current availability and requirements when provisioning.
Use the simulation's mock mail transport in development and teacher rehearsals rather than sending real login messages.
Do not log raw magic-link credentials or expose them through shared course records.

Do not depend on Gmail's third-party **Send mail as** feature for branded replies.
Google's current guidance schedules removal of that third-party sending path in January 2027.
Incoming forwarding remains the selected inbox arrangement; a branded human-reply workflow can be selected separately if needed.

## Trigger

The instructor selected Cloudflare for outgoing course mail and explicitly chose forwarding to an existing Gmail inbox.

## Consequences

**Positive:**

- The Worker and login delivery use the chosen course infrastructure.
- Incoming student questions reach the instructor's existing inbox.
- Automated authentication does not depend on Gmail SMTP credentials.

**Negative:**

- Domain verification, sender authentication, paid-plan eligibility, and beta availability are external prerequisites.
- Forwarding by itself does not provide a durable way to reply as the course address from Gmail.
- Delivery failures and retry limits need an observable, bounded application flow.

**Neutral:**

- The instructor must supply and verify the Gmail forwarding destination during setup.
- This decision does not provision resources, change DNS, upgrade a plan, or send email.

## Alternatives considered

### Send login messages through Gmail SMTP

This introduces a separate mail-provider credential and does not follow the instructor's infrastructure preference.

### Adopt Google Workspace immediately

This could supply a branded mailbox and replies, but the instructor chose an existing Gmail inbox and did not request a mailbox migration.

### Use Email Routing as the outgoing mail provider

Inbound forwarding and transactional sending are distinct Cloudflare services; routing alone is not the login-delivery integration.

## Implementation and verification

The magic-link flow and `worker/course-mail.ts` implement native Cloudflare Email Sending through `COURSE_MAIL`, using the fixed sender and reply-to `info@scalableweb.dev`.
Both the binding and `COURSE_EMAIL_ENABLED: "true"` are required to select this transport.
Production configuration contains a commented sender-restricted binding example; the isolated local Worker configuration validates its shape with delivery disabled.
Local application development uses the staff-only mock inbox and never selects production mail as a fallback.
The teacher simulation's equivalent boundary remains dependent on ADR-007.

Worker tests with a mocked binding verify `waitUntil` delivery, unusable pending links, activation after provider acceptance, discarded links on failure, fixed sender, plain text/escaped HTML and credential-free responses/logs.
The typed build and Worker dry run check the pinned binding/runtime integration; no actual email is sent by these checks.

This ADR remains Accepted because the full recorded decision includes the simulation mail boundary and external setup still outstanding.
The 2026-10-05 read-only domain inventory did not show `scalableweb.dev` enabled for sending; the Gmail destination is not yet supplied or verified.
Before production use, verify account eligibility, domain and sender, configure forwarding to the verified Gmail destination, and exercise delivery to an instructor-controlled address under explicit send authorization.
The [course-system operating guide](../../course-system.md#course-mail-setup) records the binding/enablement, DNS prerequisites, controlled-delivery procedure and support workflow.

## Open questions

- Confirm account eligibility and onboard/verify `scalableweb.dev` before enabling production delivery; a test to a verified address alone does not establish arbitrary-recipient eligibility.
- Supply and verify the Gmail destination, then perform the authorized outbound and incoming-forwarding checks.
- Select a human-reply arrangement only if replies need to use `info@scalableweb.dev`; forwarding alone does not settle it.

## References

- [Cloudflare Email Service](https://developers.cloudflare.com/email-service/).
- [Email Sending setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) and [domain configuration](https://developers.cloudflare.com/email-service/configuration/domains/).
- [Email Routing setup](https://developers.cloudflare.com/email-service/get-started/route-emails/).
- [Cloudflare magic-link example](https://developers.cloudflare.com/email-service/examples/email-sending/magic-link/).
- [Google's third-party sending change](https://support.google.com/mail/answer/17101213?hl=en).
- [ADR-003: magic-link authentication](../implemented/ADR-003-import-students-and-use-email-magic-links.md).
