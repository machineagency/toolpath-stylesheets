import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ToolpathMenu } from './toolpath-menu.ts';
import { TSSMenu } from './tss-menu.ts';
import { VisualizationPane } from './visualization-pane.ts';
import { DebuggingPane } from './debugging-pane.ts';

import './toolpath-menu.ts';
import './tss-menu.ts';
import './visualization-pane.ts';
import './debugging-pane.ts';

@customElement('root-element')
export class RootElement extends LitElement {

    @property()
    random = 0;

    myFn(x: number) {
        return x + 1;
    }

    render() {
        return html`
            <div class="container">
                <div class="menu-col">
                    <toolpath-menu></toolpath-menu>
                    <tss-menu></tss-menu>
                </div>
                <visualization-pane></visualization-pane>
                <debugging-pane></debugging-pane>
            </div>
        `;
    }

    static styles = css`
        .container {
            margin-left: 10px;
            display: flex;
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
