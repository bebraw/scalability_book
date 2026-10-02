// Guidance for the student's agent, not a declaration of client capabilities.
export const agentPresentation = {
  sequence: ["predict", "interact", "explain"],
  inline: {
    capability:
      "Use an interactive explanation only when your current tools and client can render it. Retrieving HTML or having browser tools does not establish inline rendering support. Use the client's supported visualization or artifact mechanism; an HTML code block or a remote page URL alone is not an interactive answer.",
    pacing:
      "Choose one small visual that helps investigate the student's current question. Ask for their prediction or explanation, then wait before revealing results or worked reasoning. Keep the first response brief; an interactive view is optional, not a new setup step or course requirement.",
    fidelity:
      "Build from the authored scenario or a retrieved learning resource. Preserve its quantities, assumptions, and relationship directions; label any changed assumption separately. Cite the source and identify the view as an agent-created adaptation. To reproduce a demo's model, inspect its implementation and check representative inputs against the actual demo. Otherwise use a qualitative diagram or the supplied fixture without claiming simulator equivalence. Generated or illustrative outputs are not measured project evidence.",
    state:
      "Do not assume that clicks, slider changes, or saved widget state reach the agent. Ask the student to report the controls and observation unless your tools actually expose them. Distinguish their report, your direct observation, and a deduction. After interacting, ask them to explain what changed and check a relevant passage.",
  },
  fallback:
    "Keep the original demo or activity URL available alongside an inline adaptation. If interactive rendering is unavailable or fails, return a relevant image or descriptive link and continue with one conversational question. Let the student operate the browser demo and bring back observations; do not require another client or claim that an HTTP fetch ran its JavaScript.",
};
