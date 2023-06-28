import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Toolpath } from './type-utils.ts';
import { exampleToolpaths, ToolpathName } from './example-toolpaths.ts';
import { tssCollection, TSSName, TSS } from './tss.ts';
// import overlay
import { overlayCollection, OverlayName, Overlay } from './overlay.ts';
import { VisualizationSpace } from './visualization-space.ts';
import { setVisualizationSpaceInstance } from './visualization-space-instance.ts';
import { lowerGCode, lowerSBP, lowerEBB } from './ir.ts';

@customElement('root-element')
export class RootElement extends LitElement {

    toolpathNames = Object.keys(exampleToolpaths) as ToolpathName[];
    tssNames: TSSName[] = Object.keys(tssCollection) as TSSName[];
    // collection of overlays
    overlayNames: OverlayName[] = Object.keys(overlayCollection) as OverlayName[];
    visualizationSpace: VisualizationSpace | null = null;

    @property()
    currentToolpathName: ToolpathName | null = null;

    @property()
    currentToolpath: Toolpath | null = null;

    @property()
    currentTSSName: TSSName | null = null;

    @property()
    currentTSS: TSS | null = null;

    @property()
    currentOverlayName: OverlayName | null = null;

    @property()
    currentOverlay: Overlay | null = null;

    // keeps track of what step the user is on
    @property()
    currentStepNum: number = 0;

    @property()
    currentStepName: string = "";

    // handles toolpath menu interaction
    onToolpathClick(newName: ToolpathName) {
        if (this.currentToolpathName !== newName) {
            this.currentToolpathName = newName;
            this.currentToolpath = exampleToolpaths[newName];
            // reset the current overlay
            this.currentOverlay = null;
            this.currentOverlayName = null;
            this.currentStepNum = 0;
            this.currentStepName = "";
        }
        this.renderTSS();
    }

    // handles TSS meny interaction
    onTSSClick(newName: TSSName) {
        if (this.currentTSSName !== newName) {
            this.currentTSSName = newName;
            this.currentTSS = tssCollection[newName];
            // reset the current overlay
            this.currentOverlay = null;
            this.currentOverlayName = null;
            this.currentStepNum = 0;
            this.currentStepName = "";
        };
        this.renderTSS();
    }

    // handles overlay menu interaction
    onOverlayClick(newName: OverlayName) {
        if (this.currentOverlayName !== newName) {
            this.currentOverlayName = newName;
            this.currentOverlay = overlayCollection[newName];
            // reset the current toolpath and TSS
            this.currentTSS = null;
            this.currentTSSName = null;
            this.currentToolpath = null;
            this.currentToolpathName = null;
        };
        this.renderOverlay();
    }

    // positions the camera to overhead view
    onPositionImage() {
        this.visualizationSpace?.computeOverheadView();
    }

    // handles iterating through the different steps of the overlays
    onNextStep() {
        if (this.currentOverlay) {
            let numSteps = this.currentOverlay().length;
            if (this.currentStepNum < numSteps) {
                this.currentStepNum++;
                this.renderOverlay();
            }
        }
    }

    // takes picture of the current visualization space
    onSnapshotClickSvg() {
        let svgElement = this.renderRoot.querySelector('#canvas-container svg') as SVGElement;
        let svgCopy = svgElement.cloneNode(true) as SVGElement;
        svgCopy.addEventListener('click', () => {
            this.handleImageInteraction(svgCopy.outerHTML);
        })
        let cameraRollContainer = this.renderRoot.querySelector('#camera-roll-container');
        cameraRollContainer?.appendChild(svgCopy);
        console.log(svgElement);
    }

    // downloads images upon user clicking on them
    handleImageInteraction(imageSrc: string) {
        let link = document.createElement('a');
        let url = 'data:image/svg+xml;utf8,' + encodeURI(imageSrc);
        link.href = url;
        link.target = '_blank';
        link.download = 'snapshot.svg';
        link.click();
    }

    // renders the toolpaths based on selected TSS function
    renderTSS() {
        if (this.currentToolpathName && this.currentToolpath && this.currentTSSName && this.currentTSS) {
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
    }

    // renders the different overlays
    renderOverlay() {
        if (this.currentOverlay && this.currentOverlayName) {
            let myViz = this.currentOverlay()[this.currentStepNum].group;
            this.currentStepName = this.currentOverlay()[this.currentStepNum].label;
            if (this.visualizationSpace) {
                this.visualizationSpace.removeAllViz();
                this.visualizationSpace.addVizWithName(myViz, this.currentOverlayName);
            }
        }
    }

    maybeHighlightToolpath(name: ToolpathName) {
        return name === this.currentToolpathName ? 'highlight' : '';
    }

    maybeHighlightTSS(name: TSSName) {
        return name === this.currentTSSName ? 'highlight' : '';
    }

    maybeHighlightOverlay(name: OverlayName) {
        return name === this.currentOverlayName ? 'highlight' : '';
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
                            ${this.currentToolpath?.instructions.map((i: string) => {
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
                        <div class="menu-head">Overlay Menu</div>
                        <ul class="list">
                            ${this.overlayNames.map(name => {
                                return html`
                                    <li @click=${() => this.onOverlayClick(name)}
                                        class=${this.maybeHighlightOverlay(name)}>
                                        ${name}</li>
                                `;
                            })}
                        </ul>
                        <div class="menu-head">Next Step</div>
                        <label>
                            <input type="button" name="Next Step" value="Next Step"
                            @click=${() => this.onNextStep()}>
                        </label>
                        <div class="menu-head">Step Description</div>
                        <div class="steps-box"> <code>${this.currentStepName}</code></div>
                    </div>

                    <div class="menu">
                        <div class="menu-head">Position Image</div>
                        <label>
                            <input type="button" name="Position Image" value="Overhead View"
                            @click=${() => this.onPositionImage()}>
                        </label>
                    </div>

                    <div class="menu">
                        <div class="menu-head">Capture Image</div>
                        <label>
                            <input type="button" name="Capture Image" value="Take snapshot"
                            @click=${() => this.onSnapshotClickSvg()}>
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
            setVisualizationSpaceInstance(this.visualizationSpace);
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
        .steps-box {
            border: 1px solid white;
            margin: 5px;
            height: 100px;
        }
        .steps-text {
            font-size: 14px;
            line-height: 1.4;
        }
        #canvas-container canvas {
            border: 1px solid white;
        }
        #camera-roll-container {
            max-width: 750px;
            height: 200px;
            border: 1px solid white;
            overflow-x: auto;
            white-space: nowrap;
        }
        #camera-roll-container svg {
            max-height: 100px;
            max-width: 150px;
            margin-right: 5px;
        }
    `;
}

declare global {
  interface HTMLElementTagNameMap {
    'root-element': RootElement;
  }
}
