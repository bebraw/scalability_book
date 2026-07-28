export type DeliveryEvent =
  | { type: "PLAN_APPROVED" }
  | { type: "PATCH_READY" }
  | { type: "TESTS_PASS" }
  | { type: "TESTS_FAIL" }
  | { type: "REVIEW_START" }
  | { type: "APPROVE" }
  | { type: "REQUEST_CHANGES" }
  | { type: "RELEASE" }
  | { type: "CANCEL" };

export type DeliveryEventType = DeliveryEvent["type"];

export const deliveryMachineConfig = {
  id: "delivery",
  initial: "active",
  states: {
    active: {
      initial: "planning",
      on: { CANCEL: "#delivery.cancelled" },
      states: {
        planning: { on: { PLAN_APPROVED: "implementing" } },
        implementing: { on: { PATCH_READY: "verifying" } },
        verifying: {
          type: "parallel",
          states: {
            checks: {
              initial: "running",
              states: {
                running: {
                  on: {
                    TESTS_PASS: "passed",
                    TESTS_FAIL: "#delivery.active.implementing",
                  },
                },
                passed: { type: "final" },
              },
            },
            review: {
              initial: "waiting",
              states: {
                waiting: { on: { REVIEW_START: "reviewing" } },
                reviewing: {
                  on: {
                    APPROVE: "approved",
                    REQUEST_CHANGES: "#delivery.active.implementing",
                  },
                },
                approved: { type: "final" },
              },
            },
          },
          onDone: "ready",
        },
        ready: { on: { RELEASE: "#delivery.released" } },
      },
    },
    released: { type: "final" },
    cancelled: { type: "final" },
  },
} as const;

export const exportableDeliveryMachine = `import { setup } from "xstate";

export const deliveryMachine = setup({
  types: { events: {} as
    | { type: "PLAN_APPROVED" }
    | { type: "PATCH_READY" }
    | { type: "TESTS_PASS" }
    | { type: "TESTS_FAIL" }
    | { type: "REVIEW_START" }
    | { type: "APPROVE" }
    | { type: "REQUEST_CHANGES" }
    | { type: "RELEASE" }
    | { type: "CANCEL" } }
}).createMachine(${JSON.stringify(deliveryMachineConfig, null, 2)});`;
