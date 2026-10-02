## Scenario

Use this extension when the fleet trace suggests that waiting or competing review requests limit the workflow.
Keep its findings in the existing fleet evidence.

## Investigate

1. Choose three small changes that can each be accepted separately.
   Freeze their briefs, contracts, acceptance checks, and starting revision; use fresh copies for both trials with the same model, tools, reviewer, and aggregate resource budget.
2. Compare admitting one unfinished change at a time with admitting up to three.
   Both conditions permit at most two executing agents, with the same delegation and integration rules.
   Before running either, predict when overlapping work could reduce waiting and when competing requests could increase review or correction effort.
3. Record change start and acceptance or abandonment times, actual agent concurrency, unfinished changes, review waiting, interruptions, active human review and correction time, and total cost.
   Count accepted changes over the full trial window and preserve failed or abandoned attempts in the effort and cost records.
4. Explain whether the traces support your prediction.
   A shared worker limit does not guarantee equal observed concurrency; use the trace to show which workers were active or waiting.
   Would the evidence support changing admission, worker capacity, or the feedback interface?
   Keep a faster model or a different interface as a separate intervention.

One pair is a workflow diagnostic: task order, practice, and execution variation can explain a difference.
Report unfinished work at the cutoff and avoid treating a quieter workflow or a larger completion count as proof of better overall performance.
