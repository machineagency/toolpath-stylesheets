import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('toolpath-menu')
export class ToolpathMenu extends LitElement {

    @property()
    random = 0;

    myFn(x: number) {
        return x + 1;
    }

    render() {
        return html`
            <div>I am the toolpath menu.</div>
        `;
    }

    static styles = css`
    `;
}
