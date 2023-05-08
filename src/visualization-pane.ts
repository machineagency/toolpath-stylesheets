import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('visualization-pane')
export class VisualizationPane extends LitElement {

    @property()
    random = 0;

    myFn(x: number) {
        return x + 1;
    }

    render() {
        return html`
            <div>Look at me pretty visualization wow.</div>
        `;
    }

    static styles = css`
    `;
}
