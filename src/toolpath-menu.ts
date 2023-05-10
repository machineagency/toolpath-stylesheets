import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Toolpath } from './type-utils.ts';
import { exampleToolpaths, ToolpathName } from './example-toolpaths.ts';

@customElement('toolpath-menu')
export class ToolpathMenu extends LitElement {
    toolpathNames = Object.keys(exampleToolpaths) as ToolpathName[];

    @property()
    currentToolpathName: ToolpathName = this.toolpathNames[0];

    @property()
    currentToolpath: Toolpath = exampleToolpaths[this.currentToolpathName];

    onToolpathClick(newName: ToolpathName) {
        this.currentToolpathName = newName;
        this.currentToolpath = exampleToolpaths[newName];
    }

    maybeHighlight(name: ToolpathName) {
        return name === this.currentToolpathName ? 'highlight' : '';
    }

    render() {
        return html`
            <div class="menu">
                <div class="menu-head">Toolpath Menu</div>
                <ul class="toolpath-list">
                    ${this.toolpathNames.map(name => {
                        return html`
                            <li @click=${() => this.onToolpathClick(name)}
                                class=${this.maybeHighlight(name)}>
                                ${name}</li>
                        `;
                    })}
                </ul>
                <ul class="toolpath-preview">
                    ${this.currentToolpath.instructions.map((i: string) => {
                        return html`<li><code>${i}</code></li>`;
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
        .toolpath-preview {
            border: 1px solid black;
            margin: 5px;
            height: 200px;
            overflow-y: scroll;
            padding-left: 5px;
        }
        .toolpath-preview li {
            margin-top: -5px;
            margin-bottom: -5px;
            list-style-type: none;
        }
        .highlight {
            background-color: black;
            color: white;
        }
        .menu-head {
            margin: 10px;
        }
    `;
}
