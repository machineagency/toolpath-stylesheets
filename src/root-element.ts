import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ToolpathMenu } from './toolpath-menu.ts';
import { TSSMenu } from './tss-menu.ts';
import { VisualizationPane } from './visualization-pane.ts';
import { DebuggingPane } from './debugging-pane.ts';
import { TSS } from './tss.ts';
import { Toolpath, IR } from './type-utils.ts';
import { ExampleToolpaths, ToolpathName } from './example-toolpaths.ts';

import * as THREE from 'three';

import './toolpath-menu.ts';
import './tss-menu.ts';
import './visualization-pane.ts';
import './debugging-pane.ts';

@customElement('root-element')
export class RootElement extends LitElement {
    
    currentTSS: TSS = (_: IR[]) => new THREE.Group();

    toolpathNames = Object.keys(ExampleToolpaths) as ToolpathName[];

    @property()
    currentToolpathName: ToolpathName = this.toolpathNames[0];

    @property()
    currentToolpath: Toolpath = ExampleToolpaths[this.currentToolpathName];

    onToolpathClick(newName: ToolpathName) {
        this.currentToolpathName = newName;
        this.currentToolpath = ExampleToolpaths[newName];
    }

    maybeHighlight(name: ToolpathName) {
        return name === this.currentToolpathName ? 'highlight' : '';
    }

    render() {
        return html`
            <div class="container">
                <div class="menu-col">
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
                </div>
                <visualization-pane></visualization-pane>
                <!-- <debugging-pane></debugging-pane> -->
            </div>
        `;
    }

    firstUpdated() {
        console.log('called');
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

declare global {
  interface HTMLElementTagNameMap {
    'root-element': RootElement;
    'toolpath-menu': ToolpathMenu;
    'tss-menu': TSSMenu;
    'visualization-pane': VisualizationPane;
    'debugging-pane': DebuggingPane;
  }
}
