import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
// import { Toolpath } from './type-utils.ts';
import { tssCollection, TSSCollection, TSSName, TSS } from './tss.ts';

@customElement('tss-menu')
export class TSSMenu extends LitElement {
    tssNames: TSSName[] = Object.keys(tssCollection) as TSSName[];
    tssCollection: TSSCollection = tssCollection;

    @property()
    currentTSSName: TSSName = this.tssNames[0];

    @property()
    currentTSS: TSS = this.tssCollection[this.currentTSSName];

    onTSSClick(newName: TSSName) {
        this.currentTSSName = newName;
        this.currentTSS = this.tssCollection[newName];
    }

    maybeHighlight(name: TSSName) {
        return name === this.currentTSSName ? 'highlight' : '';
    }

    render() {
        return html`
            <div class="menu">
                <div class="menu-head">TSS Menu</div>
                <ul class="tss-list">
                    ${this.tssNames.map(name => {
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
        .tss-list {
            height: 150px;
            border: 1px solid black;
            overflow-y: scroll;
            padding-left: 5px;
            margin: 5px;
        }
        .tss-list li {
            cursor: pointer;
            list-style-type: none;
        }
        .tss-list li:hover {
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
