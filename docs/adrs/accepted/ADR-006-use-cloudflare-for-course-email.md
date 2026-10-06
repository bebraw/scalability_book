# ADR-006: Use Cloudflare for course email

**Status:** Accepted

**Date:** 2026-10-05

## Context

Roster-provisioned magic-link sign-in requires transactional mail to institutional addresses.
The instructor wants `info@scalableweb.dev` as the course address, Cloudflare infrastructure for sending, and incoming mail forwarded to the existing `info@survivejs.com` inbox hosted by Fastmail.
The account and domain setup needed for this has not been performed as part of the discussion.

## Decision

Send course magic-link messages from `info@scalableweb.dev` through Cloudflare Email Sending integrated with the Worker.
Use Cloudflare Email Routing to forward incoming mail for that address to the verified destination `info@survivejs.com`, hosted by Fastmail.
Treat outgoing delivery and incoming forwarding as separate configurations.
Fastmail hosts the instructor’s receiving inbox; Cloudflare remains the provider for automated sign-in mail.
The destination provider does not change the Worker’s mail integration.

Complete domain verification and the provider's required DNS/authentication setup before enabling production login delivery.
As checked when recording this decision, Email Sending is in beta and requires a Workers Paid plan; verify current availability and requirements when provisioning.
Use the simulation's mock mail transport in development and teacher rehearsals rather than sending real login messages.
Do not log raw magic-link credentials or expose them through shared course records.

Incoming forwarding does not configure branded human replies.
Use the existing `info@survivejs.com` identity for human replies.
The instructor explicitly accepts that replies use this address as long as mail sent to `info@scalableweb.dev` reaches the inbox.

## Trigger

The instructor selected Cloudflare for outgoing course mail and forwarding to an existing inbox.
On 2026-10-06, they replaced the initial Gmail destination preference with `info@survivejs.com` on Fastmail.

## Consequences

**Positive:**

- The Worker and login delivery use the chosen course infrastructure.
- Incoming student questions reach the instructor's existing inbox.
- Automated authentication does not depend on Fastmail SMTP credentials.

**Negative:**

- Domain verification, sender authentication, paid-plan eligibility, and beta availability are external prerequisites.
- Delivery failures and retry limits need an observable, bounded application flow.

**Neutral:**

- The forwarding destination is supplied; Cloudflare still needs verification of `info@survivejs.com` during setup.
- Human replies use the existing `info@survivejs.com` identity; no additional Fastmail sending identity is required by this decision.
- This decision does not provision resources, change DNS, upgrade a plan, or send email.

## Alternatives considered

### Send login messages through the receiving mailbox provider’s SMTP service

This introduces a separate mail-provider credential and does not follow the instructor's infrastructure preference.

### Adopt Google Workspace immediately

This could supply a branded mailbox and replies, but the instructor chose an existing inbox and did not request a mailbox migration.

### Use Email Routing as the outgoing mail provider

Inbound forwarding and transactional sending are distinct Cloudflare services; routing alone is not the login-delivery integration.

## Implementation and verification

The magic-link flow and `worker/course-mail.ts` implement native Cloudflare Email Sending through `COURSE_MAIL`, using the fixed sender and reply-to `info@scalableweb.dev`.
Both the binding and `COURSE_EMAIL_ENABLED: "true"` are required to select this transport.
Production configuration contains a commented sender-restricted binding example; the isolated local Worker configuration validates its shape with delivery disabled.
Local application development uses the staff-only mock inbox and never selects production mail as a fallback.
Teacher simulation also selects a scoped mock inbox explicitly and never receives the live Cloudflare mail transport.
Its browser/local Worker checks exercise login through the mock inbox; Worker tests verify that simulation sends no mail even when the live binding and delivery flag are enabled.

Worker tests with a mocked binding verify `waitUntil` delivery, unusable pending links, activation after provider acceptance, discarded links on failure, fixed sender, plain text/escaped HTML and credential-free responses/logs.
The typed build and Worker dry run check the pinned binding/runtime integration; no actual email is sent by these checks.

This ADR remains Accepted because external setup and actual delivery verification are still outstanding.
The 2026-10-05 read-only domain inventory did not show `scalableweb.dev` enabled for sending.
The instructor supplied `info@survivejs.com` on 2026-10-06; its Cloudflare destination verification has not been performed by this work.
Before production use, verify account eligibility, domain and sender, configure forwarding to the verified Fastmail-hosted destination, and exercise delivery to an instructor-controlled address under explicit send authorization.
The [course-system operating guide](../../course-system.md#course-mail-setup) records the binding/enablement, DNS prerequisites, controlled-delivery procedure and support workflow.

## Open questions

- Confirm account eligibility and onboard/verify `scalableweb.dev` before enabling production delivery; a test to a verified address alone does not establish arbitrary-recipient eligibility.
- Verify `info@survivejs.com` as the Cloudflare destination, then perform the authorized outbound and incoming-forwarding checks.

## References

- [Cloudflare Email Service](https://developers.cloudflare.com/email-service/).
- [Email Sending setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) and [domain configuration](https://developers.cloudflare.com/email-service/configuration/domains/).
- [Email Routing setup](https://developers.cloudflare.com/email-service/get-started/route-emails/).
- [Cloudflare magic-link example](https://developers.cloudflare.com/email-service/examples/email-sending/magic-link/).
- [Cloudflare forwarding and reply-address behavior](https://developers.cloudflare.com/email-service/reference/postmaster/#sending-or-replying-to-an-email-from-your-cloudflare-domain).
- [ADR-003: magic-link authentication](../implemented/ADR-003-import-students-and-use-email-magic-links.md).
