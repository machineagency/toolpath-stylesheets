import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tss-menu')
export class TSSMenu extends LitElement {

    @property()
    random = 0;

    myFn(x: number) {
        return x + 1;
    }

    render() {
        return html`
            <div>I am the tss menu.</div>
        `;
    }

    static styles = css`
    `;
}
