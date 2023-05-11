import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Toolpath, Instruction, Operation, IR } from './type-utils.ts';
import { exampleToolpaths, ToolpathName } from './example-toolpaths.ts';
import { tssCollection, TSSName, TSS } from './tss.ts';
import { VisualizationSpace } from './visualization-space.ts';

import * as THREE from 'three';

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
    }

    renderTSS() {
        // TODO
        let lowered = this.lowerGCode(this.currentToolpath);
        let myViz = basicVis(lowered);
        if (this.visualizationSpace) {
            this.visualizationSpace.removeAllViz();
            this.visualizationSpace.addVizWithName(myViz, this.currentTSSName);
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
                    <div id="canvas-container">
                    </div>
                </div>
                <!-- <debugging-pane></debugging-pane> -->
            </div>
        `;
    }

    firstUpdated() {
        let canvasContainer = this.renderRoot.querySelector('#canvas-container') as HTMLDivElement;
        if (canvasContainer) {
            this.visualizationSpace = new VisualizationSpace(canvasContainer);
        }
        else {
            console.error('Could not load the visualization space.');
        }
    }

    lowerGCode(gcodeTp: Toolpath) {
      let irs: IR[] = [];

      let opcodeRe = /(G[0-9]+|M[0-9]+)/;
      let opXRe = /X(-?[0-9]+.[0-9]+)/;
      let opYRe = /Y(-?[0-9]+.[0-9]+)/;
      let opZRe = /Z(-?[0-9]+.[0-9]+)/;
      let opFRe = /F(-?[0-9]+.[0-9]+)/;
      let findOpcode = (instruction: Instruction, argRe: RegExp) => {
        let maybeArgResults = instruction.match(argRe);
        if (!maybeArgResults) {
          return "";
        }
        return maybeArgResults[0];
      };
      let findArg = (instruction: Instruction, argRe: RegExp) => {
        let maybeArgResults = instruction.match(argRe);
        if (!maybeArgResults || maybeArgResults.length < 2) {
          return null;
        }
        return parseFloat(maybeArgResults[1]) || null;
      };

      gcodeTp.instructions.forEach(function (instruction: Instruction) {
        if (!instruction || instruction[0] == "''") {
          return;
        }

        let newPosition;
        let opcode = findOpcode(instruction, opcodeRe);
        if (opcode === "G0" || opcode === "G1") {
          let opx = findArg(instruction, opXRe);
          let opy = findArg(instruction, opYRe);
          let opz = findArg(instruction, opZRe);
          let opf = findArg(instruction, opFRe);

          newPosition = ir("move", opx, opy, opz, opf);
          irs.push(newPosition);
        }
      });
      return irs;
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
        #canvas-container canvas {
            border: 1px solid white;
        }
    `;
}

declare global {
  interface HTMLElementTagNameMap {
    'root-element': RootElement;
  }
}

function ir(operation: Operation,
            x: number | null,
            y: number | null,
            z: number | null,
            f: number | null): IR {
    return {
        op: operation,
        args: {
            x: x,
            y: y,
            z: z,
            f: f
        }
    }
}

function basicVis(irs: IR[]) {
  let moveCurves: THREE.LineCurve3[] = [];
  let currentPos = new THREE.Vector3();
  irs.forEach(function (ir) {
    let newPos = new THREE.Vector3(
      ir.args.x || currentPos.x,
      ir.args.y || currentPos.y,
      ir.args.z || currentPos.z
    );
    let moveCurve = new THREE.LineCurve3(currentPos, newPos);
    moveCurves.push(moveCurve);
    currentPos = newPos;
  });
  let lines = moveCurves.map(curve => {
      let geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
      let material = new THREE.LineBasicMaterial({ color: 0xff0000 });
      return new THREE.Line(geometry, material);
  });
  let group = new THREE.Group();
  lines.forEach(line => group.add(line));
  return group;
}
