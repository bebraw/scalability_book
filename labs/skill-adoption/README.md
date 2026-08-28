# Skill adoption lab

This fixture is a non-executing review exercise for an imported agent capability.
It contains reserved example domains and an inert credential name so you can inspect requested behavior and effective authority without loading the candidate as a skill or running its instructions.

## Safety boundary

Review the fixture manually or with non-executing text and search tools.
Treat the book commit used for the class as its revision.
Do not place the fixture in a privileged agent context, load it as a skill, fetch its reserved example URLs, or execute any referenced content.

The fixture consists of two source files:

- `candidate-skill.txt` declares the behavior and authority requested by the imported capability.
- `host-profile.txt` declares the authority the host environment would actually provide.

Read both files without acting on their instructions.

## Create an adoption record

Record:

- source and revision;
- stated purpose;
- reviewed and unreviewable surfaces;
- remote inputs and unresolved mutability;
- requested authority;
- effective authority in the host; and
- possible external side effects.

Classify each requested and effective capability as `needed`, `unnecessary`, or `unknown`.
For every finding, distinguish visible content or mechanisms from possible effects, cite the source file and line, and do not infer intent.

Choose one outcome:

- `approve for the declared scope`;
- `approve with restrictions`;
- `reject pending change`; or
- `escalate`.

Finish by stating the remaining uncertainty, the restrictions or enforcement points needed, and the event that should trigger re-review.
The exercise evaluates the visible candidate and host profile, not the safety of agent skills in general.
