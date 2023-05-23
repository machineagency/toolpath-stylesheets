import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Toolpath, Renderer } from './type-utils.ts';
import { exampleToolpaths, ToolpathName } from './example-toolpaths.ts';
import { tssCollection, TSSName, TSS } from './tss.ts';
import { VisualizationSpace } from './visualization-space.ts';
import { lowerGCode, lowerSBP, lowerEBB } from './ir.ts';

@customElement('root-element')
export class RootElement extends LitElement {

    toolpathNames = Object.keys(exampleToolpaths) as ToolpathName[];
    tssNames: TSSName[] = Object.keys(tssCollection) as TSSName[];
    visualizationSpace: VisualizationSpace | null = null;

    @property()
    currentToolpathName: ToolpathName = this.toolpathNames[0];

    @property()
    currentToolpath: Toolpath = exampleToolpaths[this.currentToolpathName];

    @property()
    currentTSSName: TSSName = this.tssNames[0];

    @property()
    currentTSS: TSS = tssCollection[this.currentTSSName];

    @property()
    cameraRollImages: string[] = [];

    onToolpathClick(newName: ToolpathName) {
        if (this.currentToolpathName !== newName) {
            this.currentToolpathName = newName;
            this.currentToolpath = exampleToolpaths[newName];
        }
        this.renderTSS();
    }

    onTSSClick(newName: TSSName) {
        if (this.currentTSSName !== newName) {
            this.currentTSSName = newName;
            this.currentTSS = tssCollection[newName];
        };
        this.renderTSS();
    }

    // function to change renderers from SVG to WebGL
    onRendererChange(rendererType: Renderer) {
        if (rendererType === 'svg') {
            this.visualizationSpace?.computeOverheadView();
        } else if (rendererType === 'webgl') {
            //this.visualizationSpace?.initCamera(new Vector3(150, 17/2, 109), true);
        }
    }

    // takes picture of the current visualization space
    onSnapshotClick() {
        this.renderTSS();
        let canvas = this.renderRoot.querySelector('#canvas-container canvas') as HTMLCanvasElement;
        // code for downloading the images
        /*
        // set up canvas dimensions
        let context = canvas.getContext('2d');
        let width = canvas.clientWidth;
        let height = canvas.clientHeight;

        context?.drawImage(canvas, 0, 0, width, height);

        let dataURL = canvas.toDataURL('image/png');
        let link = document.createElement('a');
        link.href = dataURL;
        link.download = 'snapshot.png';
        link.click();
        */

        let image = new Image();
        image.src = canvas.toDataURL('image/png');
        image.style.maxWidth = '100%';
        image.style.maxHeight = '100%';
        image.classList.add('image-with-border');
        let cameraRollContainer = this.renderRoot.querySelector('#camera-roll-container');
        cameraRollContainer?.appendChild(image);
    }

    renderTSS() {
        if (this.currentToolpath.isa === 'sbp') {
            let lowered = lowerSBP(this.currentToolpath);
            let myViz = this.currentTSS(lowered);
            if (this.visualizationSpace) {
                this.visualizationSpace.removeAllViz();
                this.visualizationSpace.addVizWithName(myViz, this.currentTSSName);
            }
        } else if (this.currentToolpath.isa === 'gcode') {
            let lowered = lowerGCode(this.currentToolpath);
            let myViz = this.currentTSS(lowered);
            if (this.visualizationSpace) {
                this.visualizationSpace.removeAllViz();
                this.visualizationSpace.addVizWithName(myViz, this.currentTSSName);
            }
        } else {
            let lowered = lowerEBB(this.currentToolpath);
            let myViz = this.currentTSS(lowered);
            if (this.visualizationSpace) {
                this.visualizationSpace.removeAllViz();
                this.visualizationSpace.addVizWithName(myViz, this.currentTSSName);
            }
        }
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
                                        ${name + ' (' + exampleToolpaths[name].isa + ')'}</li>
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

                    <div class="menu">
                        <div class="menu-head">Renderer Toggle</div>
                        <label>
                            <input type="radio" name="renderer" value="svg"
                            @change=${() => this.onRendererChange("svg")}>
                            SVG Renderer
                        </label>
                        <label>
                            <input type="radio" name="renderer" value="webgl"
                            @change=${() => this.onRendererChange("webgl")}>
                            WebGL Renderer
                        </label>
                    </div>

                    <div class="menu">
                        <div class="menu-head">Capture Image</div>
                        <label>
                            <input type="button" name="Capture Image" value="Take snapshot"
                            @click=${() => this.onSnapshotClick()}>
                        </label>
                    </div>
                        
                </div>
                <div class="visualization-pane-col">
                    <div id="canvas-container"></div>
                    <div id="camera-roll-container"></div>
                </div>
                <!-- <debugging-pane></debugging-pane> -->
            </div>
        `;
    }

    firstUpdated() {
        let canvasContainer = this.renderRoot.querySelector('#canvas-container') as HTMLDivElement;
        if (canvasContainer) {
            this.visualizationSpace = new VisualizationSpace(canvasContainer);
            this.renderTSS();
        }
        else {
            console.error('Could not load the visualization space.');
        }
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
            border: 1px solid white;
            margin: 5px;
            width: 275px;
        }
        .list {
            max-height: 250px;
            border: 1px solid white;
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
            color: black;
        }
        .preview {
            border: 1px solid white;
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
            background-color: white;
            color: black;
        }
        .menu-head {
            margin: 10px;
        }
        .visualization-pane-col {
            margin: 5px;
        }
        .image-with-border {
            border: 1px solid white;
            box-sizing: border-box;
        }
        #canvas-container canvas {
            border: 1px solid white;
        }
        #camera-roll-container {
            width: 100%;
            height: 200px;
            border: 1px solid white;
            overflow-x: auto;
            white-space: nowrap;
        }
    `;
}

declare global {
  interface HTMLElementTagNameMap {
    'root-element': RootElement;
  }
}
