import { createMachine, type AnyStateNode } from "xstate";
import { deliveryMachineConfig } from "./delivery-statechart.ts";
import { escapeAttribute, escapeHtml } from "./text.ts";

type Route = { event: string; source: AnyStateNode; target: AnyStateNode };

// XState resolves sibling and absolute targets for both the diagram and the actor.
// The visual layout folds the delivery protocol at entry to and exit from verification.
export function renderStatechartDiagram(): string {
  const machine = createMachine(deliveryMachineConfig);
  const active = machine.root.initial.target[0]!;
  const plan = onlyRoute(active.initial.target[0]!);
  const submit = onlyRoute(plan.target);
  const verifying = submit.target;
  const complete = onlyRoute(verifying);
  const release = onlyRoute(complete.target);
  const cancel = onlyRoute(active);

  return `<div class="statechart-map" role="group" aria-label="Patch delivery states and transitions">
  <div class="statechart-map-row">${state(plan.source)}${edge(plan)}${state(plan.target)}</div>
  <div class="statechart-map-link">${edge(submit, "↓")}</div>
  <div class="statechart-verification" ${statePath(verifying)} role="group" aria-label="Parallel verification">
    <strong class="statechart-verification-heading">Parallel verification</strong>
    ${Object.values(verifying.states).map(lane).join("\n")}
  </div>
  <div class="statechart-map-link">${edge(complete, "↓")}</div>
  <div class="statechart-map-row">${state(release.source)}${edge(release)}${state(release.target)}</div>
  <div class="statechart-map-cancel"><span ${statePath(active)}>While active</span>${edge(cancel)}${state(cancel.target)}</div>
</div>`;
}

function routes(node: AnyStateNode): Route[] {
  return [...node.transitions.values()].flat().map((transition) => {
    const target = transition.target?.[0];
    if (!target || transition.target?.length !== 1)
      throw new Error(
        `Expected one destination for ${node.id} on ${transition.eventType}`,
      );
    return {
      source: node,
      target,
      event:
        transition.eventType === `xstate.done.state.${node.id}`
          ? "both regions final"
          : transition.eventType,
    };
  });
}

function onlyRoute(node: AnyStateNode): Route {
  const outgoing = routes(node);
  if (outgoing.length !== 1)
    throw new Error(
      `Expected one outgoing transition at ${node.id} in the stage map`,
    );
  return outgoing[0]!;
}

function lane(region: AnyStateNode): string {
  const flow: string[] = [];
  const returns: string[] = [];
  const visited = new Set<AnyStateNode>();
  let node: AnyStateNode = region.initial.target[0]!;
  for (;;) {
    if (visited.has(node))
      throw new Error(`Cycle in verification lane ${region.id}`);
    visited.add(node);
    flow.push(state(node));
    if (node.type === "final") break;
    const outgoing = routes(node);
    const forward = outgoing.filter((route) => route.target.parent === region);
    if (forward.length !== 1)
      throw new Error(
        `Expected one forward transition at ${node.id} in the verification lane`,
      );
    for (const route of outgoing) {
      if (route.target.parent !== region) {
        returns.push(
          `<span class="statechart-lane-return" ${routeAttributes(route)}>${escapeHtml(label(route.source))} · <code>${escapeHtml(route.event)}</code> → ${escapeHtml(label(route.target))}</span>`,
        );
      }
    }
    flow.push(edge(forward[0]!));
    node = forward[0]!.target;
  }

  return `<div class="statechart-lane" ${statePath(region)} role="group" aria-label="${escapeAttribute(label(region))}">
    <span class="statechart-lane-name">${escapeHtml(label(region))}</span>
    <div class="statechart-lane-flow">${flow.join("")}</div>
    ${returns.join("")}
  </div>`;
}

function label(node: AnyStateNode): string {
  return node.key.charAt(0).toUpperCase() + node.key.slice(1);
}

function statePath(node: AnyStateNode): string {
  return `data-state-path="${escapeAttribute(node.path.join("."))}"`;
}

function state(node: AnyStateNode): string {
  return `<span class="statechart-map-state${node.type === "final" ? " is-final" : ""}" ${statePath(node)}>${escapeHtml(label(node))}</span>`;
}

function routeAttributes(route: Route): string {
  const { event, source, target } = route;
  const description = `${label(source)} to ${label(target)} on ${event}`;
  return `data-transition-event="${escapeAttribute(event)}" data-transition-source="${escapeAttribute(source.path.join("."))}" data-transition-target="${escapeAttribute(target.path.join("."))}" role="img" aria-label="${escapeAttribute(description)}" title="${escapeAttribute(description)}"`;
}

function edge(route: Route, arrow = "→"): string {
  const eventLabel = escapeHtml(route.event).replaceAll("_", "_<wbr>");
  return `<span class="statechart-map-edge" ${routeAttributes(route)}><span class="statechart-edge-label">${eventLabel}</span><span class="statechart-edge-arrow" aria-hidden="true">${arrow}</span></span>`;
}
