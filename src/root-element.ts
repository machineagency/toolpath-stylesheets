import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ToolpathMenu } from './toolpath-menu.ts';
import { TSSMenu } from './tss-menu.ts';
import { VisualizationPane } from './visualization-pane.ts';
import { DebuggingPane } from './debugging-pane.ts';
import { TSS } from './tss.ts';
import { Toolpath, IR } from './type-utils.ts';
import * as THREE from 'three';

import './toolpath-menu.ts';
import './tss-menu.ts';
import './visualization-pane.ts';
import './debugging-pane.ts';

@customElement('root-element')
export class RootElement extends LitElement {
    
    currentTSS: TSS = (_: IR[]) => new THREE.Group();
    currentToolpath: Toolpath = { isa: 'gcode', instructions: [] };

    tssListener(e: CustomEvent) {
        this.currentTSS = e.detail.tss;
    }

    toolpathListener(e: CustomEvent) {
        this.currentToolpath = e.detail.toolpath;
    }

    render() {
        return html`
            <div class="container">
                <div class="menu-col">
                    <toolpath-menu></toolpath-menu>
                    <tss-menu @tss-changed=${this.tssListener}></tss-menu>
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
