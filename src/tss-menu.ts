import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Toolpath } from './example-toolpaths.ts';

type TSSName = string;
type TSS = (tp: Toolpath) => void;

@customElement('tss-menu')
export class TSSMenu extends LitElement {
    static tssNames: TSSName[] = ['test1', 'test2'];

    @property()
    currentTSSName: TSSName = 'temporary';

    @property()
    currentTSS: TSS = (tp: Toolpath) => { tp; };

    onTSSClick(newName: TSSName) {
        return newName;
    }

    maybeHighlight(name: TSSName) {
        return name === this.currentTSSName ? 'highlight' : '';
    }

    render() {
        return html`
            <div class="menu">
                <div class="menu-head">TSS Menu</div>
                <ul class="tss-list">
                    ${TSSMenu.tssNames.map(name => {
                        return html`
                            <li @click=${() => this.onTSSClick(name)}
                                class=${this.maybeHighlight(name)}>
                                ${name}</li>
                        `;
                    })}
                </ul>
            </div>
        `;
    }

    static styles = css`
        .menu {
            border: 1px solid black;
            margin: 5px;
            width: 275px;
        }
        .toolpath-list {
            height: 250px;
            border: 1px solid black;
            overflow-y: scroll;
            padding-left: 5px;
            margin: 5px;
        }
        .toolpath-list li {
            cursor: pointer;
            list-style-type: none;
        }
        .toolpath-list li:hover {
            background-color: gray;
        }
        .highlight {
            background-color: black;
            color: white;
        }
        .menu-head {
            margin-left: 10px;
            margin-top: 10px;
        }
    `;
}
