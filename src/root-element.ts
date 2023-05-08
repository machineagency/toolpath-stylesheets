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
            <div>hi ${this.random} ${this.myFn(2)}</div>
            <toolpath-menu></toolpath-menu>
            <tss-menu></tss-menu>
            <visualization-pane></visualization-pane>
            <debugging-pane></debugging-pane>
        `;
    }

    static styles = css`
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
