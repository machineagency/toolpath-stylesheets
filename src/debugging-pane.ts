import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('debugging-pane')
export class DebuggingPane extends LitElement {

    @property()
    random = 0;

    myFn(x: number) {
        return x + 1;
    }

    render() {
        return html`
            <div>debugging pane</div>
        `;
    }

    static styles = css`
    `;
}
