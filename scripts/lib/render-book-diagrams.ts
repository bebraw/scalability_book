import {
  dependencyFailureDiagram,
  pressureEvidenceDiagram,
  renderLinearFlowDiagram,
} from "./render-linear-flow-diagram.ts";
import { renderKnowledgeBoundaryDiagram } from "./render-knowledge-boundary-diagram.ts";
import {
  courseProgressionDiagram,
  renderProgressionDiagram,
} from "./render-progression-diagram.ts";
import { renderThreeLoopsDiagram } from "./render-three-loops-diagram.ts";

export function renderBookDiagrams(): ReadonlyMap<string, string> {
  return new Map([
    [
      courseProgressionDiagram.id,
      renderProgressionDiagram(courseProgressionDiagram),
    ],
    [
      pressureEvidenceDiagram.id,
      renderLinearFlowDiagram(pressureEvidenceDiagram),
    ],
    [
      dependencyFailureDiagram.id,
      renderLinearFlowDiagram(dependencyFailureDiagram),
    ],
    ["shared-knowledge-boundary", renderKnowledgeBoundaryDiagram()],
    ["three-connected-loops", renderThreeLoopsDiagram()],
  ]);
}

export function injectBookDiagrams(
  source: string,
  diagrams: ReadonlyMap<string, string>,
): string {
  return source.replace(
    /<div\s+data-book-diagram-placeholder="([^"]+)"\s*><\/div>/g,
    (_placeholder, id: string) => {
      const diagram = diagrams.get(id);
      if (!diagram) {
        throw new Error(`Unknown book diagram: ${id}`);
      }
      return diagram;
    },
  );
}
