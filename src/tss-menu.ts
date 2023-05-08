import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tss-menu')
export class TSSMenu extends LitElement {

    @property()
    random = 0;

    render() {
        return html`
            <div class="menu">
                <div>TSS Menu</div>
                <ul>
                    <li>To do.</li>
                </ul>
            </div>
        `;
    }

    static styles = css`
        .menu {
            border: 1px solid black;
            margin: 5px;
        }
    `;
}
