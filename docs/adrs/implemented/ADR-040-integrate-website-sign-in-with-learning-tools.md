# ADR-040: Integrate website sign-in with learning tools

**Status:** Implemented

**Date:** 2026-10-09

## Context

GitHub sign-in serves reader feedback, saved exercises and course staff access.
Institutional students already have roster-provisioned, course-scoped email magic links, while the private notebook and assistant connect through a local companion.
The website presents these states separately, and students must move exercise context into the assistant themselves.
Email verification returns to the course overview even when sign-in began during a book investigation.

## Decision

Provide a shared Account & connections entry throughout the website.
Show GitHub identity, course email access, the selected exercise owner, notebook connection and configured assistant provider together.
Keep the existing GitHub and course sessions separately revocable and retain server-side authorization for every course action.
The local companion remains optional and independent of website sign-in; its notebook and provider credentials stay local.
Connection status identifies configured provider access; only a real reply establishes provider availability.

Allow verified course email sessions to save chapter exercise answers.
Namespace these answers by course run and stable student identity.
Retain existing GitHub numeric keys, including historical local-preview ownership, and select GitHub answers while both sessions are present.
Expose the selected owner and require an explicit in-place load before saving after ownership changes.
Reject a save when the browser's expected owner differs from the verified session.
Do not infer account links from names, email equality or optional GitHub profile fields, and do not merge academic records or saved answers automatically.

Let students request course email links from the reading without leaving unfinished work.
Course context comes from an instructor link, an explicitly chosen run or a tab preference; that context is navigation state, never authorization.
Carry a bounded, validated internal return destination in the email link and validate it again before browser navigation after explicit confirmation.
Keep the credential in the fragment and the existing single-use verification POST.
Original-tab drafts remain in that tab when email opens elsewhere; account refresh makes the new session visible there.

Add a deliberate exercise-to-assistant handoff containing the canonical exercise ID/version, prompt, checked attempt and automatic feedback.
Preview the material and prepare an editable message without contacting a model, saving a note, copying the worked answer or including notebook notes.
Existing assistant-to-notebook handoffs continue to require review and Save note.
Peer discussion uses the course session, identifies the sharing account and audience, and retains bounded, identity-scoped unsent contributions in tab storage.
Sharing, initial-work disclosure and editorial consent remain explicit course actions.

## Trigger

The user requested implementing the proposed account/connection view, exercise handoff and course sign-in continuity, including enrolled-student email access, then committing and pushing the change.

## Consequences

**Positive:**

- Enrolled students can save practice and enter peer inquiry without GitHub.
- Account and connection recovery share a visible home.
- Exercise attempts can enter contextual discussion through a reviewed handoff.
- Existing records retain their owners and the local notebook retains its privacy boundary.

**Negative:**

- Two active website sessions require an explicit exercise-owner rule and clear sign-out controls.
- Email course identities have separate saved answers across runs; cross-run continuity would require a further account decision.
- Email opened in another tab cannot transfer the original tab's private drafts; those remain in the original tab.

**Neutral:**

- Existing schemas and provider protocols remain sufficient; no record migration is required.
- Course provisioning and live student mail enablement remain operator rollout work.

## Alternatives considered

### Require GitHub for all saved learning features

This preserves the original answer API, but makes roster-provisioned email students create an unrelated account for practice.

### Merge GitHub and student identities by email or profile name

These fields do not establish an authorized link and can change or recur across institutions and runs.
Preserve verified session ownership and leave explicit account linking to a separate decision.

### Move notebook and provider execution into a hosted account

This changes storage, credential, billing and execution responsibilities beyond integrating the existing tools.
Retain the local companion contract from ADRs 027–038.

## Implementation and verification

- [The account projection](../../../shared/site-account.ts) is shared by the local server and Worker; [the account view](../../../site/scripts/account.ts) integrates independent website sessions and companion status.
- [Exercise discussion](../../../shared/exercise-discussion.ts) and [the lazy workspace actions](../../../site/scripts/learning-actions.ts) implement reviewed, unsent handoffs.
  Exercise saves check the expected owner and retain tab drafts through account changes.
- [Account/identity tests](../../../tests/site-account.test.ts), [answer API tests](../../../tests/learning.test.ts), [course authentication tests](../../../tests/course-auth.test.ts) and [Worker adapter tests](../../../tests/course-mail.test.ts) cover ownership isolation, stale-session rejection, bounded return destinations and email-session revocation.
- [Account browser checks](../../../tests/e2e/account-learning.spec.ts) cover independent logout, feedback refresh, email confirmation in another tab, retained incomplete exercise writing, cross-context restoration, reviewed assistant context, notebook continuity and mobile accessibility.
- [Peer browser checks](../../../tests/e2e/learning-peer-inquiry.spec.ts) cover deliberate sharing, identity/audience previews, retained unsent contributions and private initial-work gates in Chromium and WebKit.
- Verification uses the unit suite, affected browser suites, TypeScript checks, production build/HTML validation and a Wrangler deployment dry run.
  It uses synthetic records, mock mail and a notebook-only companion, without live email or a model request.
- On 2026-10-09, all 170 unit tests and 51 affected browser checks passed; the final inquiry-activity continuity check also passed separately in both browsers.
  The production build, TypeScript/HTML validation, changed-file formatting and Worker deployment dry run passed.

The owning contracts are the learning-workspace, chapter-exercise and course-system guides.
Production provisioning, live course email enablement, account linking and notebook synchronization are outside this decision's implementation boundary.

## References

- [Current architecture](../../../ARCHITECTURE.md).
- [Institutional sign-in](../../course-system.md#institutional-enrollment-and-sign-in).
- [Learning workspace](../../learning-workspace.md).
- [Chapter exercises](../../chapter-exercises.md).
- [ADR-003: stable course identities and email sessions](../implemented/ADR-003-import-students-and-use-email-magic-links.md).
- [ADR-034: deliberate learning handoffs](../implemented/ADR-034-separate-the-private-notebook-from-the-teaching-assistant.md).
