import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { VisualizationSpace } from './visualization-space.ts';

@customElement('visualization-pane')
export class VisualizationPane extends LitElement {

    visualizationSpace: VisualizationSpace | null = null;

    render() {
        return html`
            <div id="canvas-container">
            </div>
        `;
    }

    firstUpdated() {
        let canvasContainer = this.renderRoot.querySelector('#canvas-container') as HTMLDivElement;
        if (canvasContainer) {
            this.visualizationSpace = new VisualizationSpace(canvasContainer);
        }
        else {
            console.error('Could not load the visualization space.');
        }
    }

    static styles = css`
        #canvas-container canvas {
            border: 1px solid black;
        }
    `;
}
