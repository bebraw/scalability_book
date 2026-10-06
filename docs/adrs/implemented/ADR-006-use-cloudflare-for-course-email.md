# ADR-006: Use Cloudflare for course email

**Status:** Implemented

**Date:** 2026-10-05

## Context

Roster-provisioned magic-link sign-in requires transactional mail to institutional addresses.
The instructor selected Cloudflare for sending and an existing Fastmail-hosted inbox for receiving questions.
Both the course mailbox and its forwarding destination must stay out of source, documentation and public website assets.

## Decision

Send course magic-link messages through Cloudflare Email Sending integrated with the Worker.
Read the sender and reply-to from the server-only `COURSE_EMAIL_FROM` secret, restricted by the application to the course domain.
Enable this transport only when the sender, `COURSE_MAIL` binding and `COURSE_EMAIL_ENABLED: "true"` are all configured.

Use an exact Cloudflare Email Routing rule to send the configured course mailbox to the book Worker.
Its `email()` handler accepts only that recipient and forwards the existing message stream to the verified destination in the `COURSE_EMAIL_FORWARD_TO` secret.
Reject unknown recipients, absent or invalid configuration, and a destination equal to the course inbox.
Do not parse, store or log incoming message contents or either address.
Discard provider error details before reporting forwarding failures.
Changing the destination requires changing a secret rather than changing source or the routing rule.

Treat outgoing delivery and incoming forwarding as separate configurations.
Fastmail hosts the instructor's receiving inbox; Cloudflare remains the provider for automated sign-in mail.
Human replies use the instructor's existing mailbox identity, as explicitly accepted; no additional Fastmail sending identity is required.

Complete domain verification and the provider's required DNS/authentication setup before enabling production login delivery.
Verify current availability and account eligibility when provisioning; sending to arbitrary institutional recipients requires Workers Paid.
Use the simulation's mock mail transport in development and teacher rehearsals.
Do not log raw magic-link credentials or expose them through shared course records.

## Trigger

The instructor selected Cloudflare for outgoing course mail and forwarding to an existing inbox.
On 2026-10-06, they chose Fastmail instead of the initial Gmail destination and accepted human replies from that existing inbox.
They subsequently requested environment configuration for both addresses so neither mailbox is exposed in source or scraped from the website.

## Consequences

**Positive:**

- Incoming student questions reach the instructor's existing inbox.
- Automated authentication does not depend on Fastmail SMTP credentials.
- Both addresses remain server-side configuration and can change without a source edit.

**Negative:**

- Domain verification, sender authentication and arbitrary-recipient eligibility are external prerequisites.
- Incoming forwarding now depends on the Worker and two correctly configured secrets.
- Delivery failures and retry limits need an observable, bounded application flow.

**Neutral:**

- The forwarding destination must be verified with Cloudflare regardless of its mailbox provider.
- Mail recipients see the sender and reply-to in their messages; hiding them from the website does not make email headers private.
- Local private configuration is ignored by Git; tracked examples contain synthetic addresses only.

## Alternatives considered

### Forward directly to an address stored in a routing rule

This avoids Worker execution, but cannot read the destination from the Worker's environment at delivery time.
The instructor's configuration requirement favors an `email()` handler.

### Embed or obfuscate the course address in public source

Encoding an address in browser code still exposes it to scrapers.
Server-side configuration keeps it out of public content while supporting replies to transactional messages.

### Send login messages through the receiving mailbox provider's SMTP service

This introduces a separate credential and does not follow the instructor's infrastructure preference.

### Adopt a new branded mailbox

The instructor chose an existing inbox and accepted its human reply identity, so a mailbox migration is unnecessary.

### Use Email Routing as the outgoing mail provider

Inbound forwarding and transactional sending are distinct Cloudflare services; routing alone is not the login-delivery integration.

## Implementation and verification

`worker/course-mail.ts` implements native Email Sending through `COURSE_MAIL`, using the environment sender for both sender and reply-to.
Missing or invalid sender configuration leaves production login delivery unavailable.
`worker/course-forwarding.ts` implements the exact-recipient, environment-driven incoming handler exported by `worker/index.ts`.
Unit tests verify forwarding completion, rejection behavior, no message consumption and provider-error redaction using synthetic addresses.

Local application development uses the staff-only mock inbox and never selects production mail as a fallback.
Teacher simulation also selects a scoped mock inbox explicitly and never receives the live Cloudflare mail transport, including when production configuration is present.
Mail tests verify deferred delivery, unusable pending links, activation after provider acceptance, discarded links on failure, configured sender, escaped HTML and credential-free responses/logs.
Typed builds and Worker dry runs check the pinned binding/runtime integration without sending email.

On 2026-10-06, Cloudflare address secrets and the Worker handler were deployed, the receiving destination was verified, and the exact incoming route was enabled with catch-all routing disabled.
Email Routing reports ready; the current sending-domain API enabled the course domain and supplied its authentication records.
The pinned CLI's older sending-enable endpoint returned 404, so setup used the current documented sending-subdomain API without changing project dependencies.
The native sending binding is configured with `COURSE_EMAIL_ENABLED: "false"`; enabling student login remains a separate step after course storage and delivery verification.

Later on 2026-10-06, public DNS resolution confirmed all required sending MX, SPF, DKIM and DMARC records.
The instructor confirmed that an independent incoming message and the Cloudflare sending-to-course-inbox check both arrived in the Fastmail inbox.
Cloudflare accepted delivery to the course inbox, which was not a verified destination address, and the instructor confirmed the account uses Workers Paid.

The normal sign-in form on `scalableweb.dev` was then exercised with a temporary, isolated D1 database and one instructor-controlled enrollment.
During this check, the native sending binding was restricted to the instructor's verified destination.
The instructor confirmed the configured sender and reply-to, inbox delivery, successful explicit sign-in confirmation and rejection of link reuse.
D1 recorded one successful student sign-in and consumption of the login link; no raw credential or full magic-link URL was recorded.

The regular Worker configuration was restored after verification, with login delivery disabled and no verification database binding.
The temporary D1 database and local verification enrollment records were removed.
Incoming forwarding remains active.
Production course storage and enabling institutional delivery remain separate rollout steps; the controlled mail check does not establish a production course or its data-retention arrangements.
This ADR is Implemented because the integration, external setup and controlled live delivery checks are complete.
The [course-system operating guide](../../course-system.md#course-mail-setup) owns secret configuration, DNS prerequisites, controlled delivery and the support workflow.

## References

- [Cloudflare Email Service](https://developers.cloudflare.com/email-service/).
- [Email Sending setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) and [domain configuration](https://developers.cloudflare.com/email-service/configuration/domains/).
- [Email Routing setup](https://developers.cloudflare.com/email-service/get-started/route-emails/) and [Worker email handlers](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/).
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
- [Sending-domain onboarding API](https://developers.cloudflare.com/api/resources/email_sending/subresources/subdomains/methods/create/).
- [Cloudflare magic-link example](https://developers.cloudflare.com/email-service/examples/email-sending/magic-link/).
- [Cloudflare forwarding and reply-address behavior](https://developers.cloudflare.com/email-service/reference/postmaster/#sending-or-replying-to-an-email-from-your-cloudflare-domain).
- [ADR-003: magic-link authentication](../implemented/ADR-003-import-students-and-use-email-magic-links.md).
