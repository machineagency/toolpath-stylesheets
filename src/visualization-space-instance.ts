import { VisualizationSpace } from './visualization-space';

let visualizationSpaceInstance: VisualizationSpace | null = null;

export function setVisualizationSpaceInstance(instance: VisualizationSpace) {
  visualizationSpaceInstance = instance;
}

export function getVisualizationSpaceInstance(): VisualizationSpace | null {
  return visualizationSpaceInstance;
}