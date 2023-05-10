import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ToolpathMenu } from './toolpath-menu.ts';
import { TSSMenu } from './tss-menu.ts';
import { VisualizationPane } from './visualization-pane.ts';
import { DebuggingPane } from './debugging-pane.ts';
import { Toolpath } from './type-utils.ts';
import { exampleToolpaths, ToolpathName } from './example-toolpaths.ts';
import { tssCollection, TSSName, TSS } from './tss.ts';

import './toolpath-menu.ts';
import './tss-menu.ts';
import './visualization-pane.ts';
import './debugging-pane.ts';

@customElement('root-element')
export class RootElement extends LitElement {
    
    toolpathNames = Object.keys(exampleToolpaths) as ToolpathName[];
    tssNames: TSSName[] = Object.keys(tssCollection) as TSSName[];

    @property()
    currentToolpathName: ToolpathName = this.toolpathNames[0];

    @property()
    currentToolpath: Toolpath = exampleToolpaths[this.currentToolpathName];

    @property()
    currentTSSName: TSSName = this.tssNames[0];

    @property()
    currentTSS: TSS = tssCollection[this.currentTSSName];

    onToolpathClick(newName: ToolpathName) {
        this.currentToolpathName = newName;
        this.currentToolpath = exampleToolpaths[newName];
    }

    onTSSClick(newName: TSSName) {
        if (this.currentTSSName !== newName) {
            this.currentTSSName = newName;
            this.currentTSS = tssCollection[newName];
        };
    }

    maybeHighlightToolpath(name: ToolpathName) {
        return name === this.currentToolpathName ? 'highlight' : '';
    }

    maybeHighlightTSS(name: TSSName) {
        return name === this.currentTSSName ? 'highlight' : '';
    }

    render() {
        return html`
            <div class="container">
                <div class="menu-col">
                    <div class="menu">
                        <div class="menu-head">Toolpath Menu</div>
                        <ul class="list">
                            ${this.toolpathNames.map(name => {
                                return html`
                                    <li @click=${() => this.onToolpathClick(name)}
                                        class=${this.maybeHighlightToolpath(name)}>
                                        ${name}</li>
                                `;
                            })}
                        </ul>
                        <ul class="preview">
                            ${this.currentToolpath.instructions.map((i: string) => {
                                return html`<li><code>${i}</code></li>`;
                            })}
                        </ul>
                    </div>
                    <div class="menu">
                        <div class="menu-head">TSS Menu</div>
                        <ul class="list">
                            ${this.tssNames.map(name => {
                                return html`
                                    <li @click=${() => this.onTSSClick(name)}
                                        class=${this.maybeHighlightTSS(name)}>
                                        ${name}</li>
                                `;
                            })}
                        </ul>
                    </div>
                </div>
                <div class="visualization-pane-col">
                    <visualization-pane></visualization-pane>
                </div>
                <!-- <debugging-pane></debugging-pane> -->
            </div>
        `;
    }

    firstUpdated() {
        console.log('first update - todo');
    }

    static styles = css`
        .container {
            margin-left: 10px;
            display: flex;
        }
        visualization-pane {
            width: 750px;
        }
        .menu {
            border: 1px solid black;
            margin: 5px;
            width: 275px;
        }
        .list {
            max-height: 250px;
            border: 1px solid black;
            overflow-y: scroll;
            padding-left: 5px;
            margin: 5px;
        }
        .list li {
            cursor: pointer;
            list-style-type: none;
        }
        .list li:hover {
            background-color: gray;
        }
        .preview {
            border: 1px solid black;
            margin: 5px;
            height: 200px;
            overflow-y: scroll;
            padding-left: 5px;
        }
        .preview li {
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
        .visualization-pane-col {
            margin: 5px;
        }
    `;
}

declare global {
  interface HTMLElementTagNameMap {
    'root-element': RootElement;
    'toolpath-menu': ToolpathMenu;
    'tss-menu': TSSMenu;
    'visualization-pane': VisualizationPane;
    'debugging-pane': DebuggingPane;
  }
}
