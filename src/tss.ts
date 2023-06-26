import * as THREE from 'three';

import { IR } from './type-utils.ts';
import { drawCross, drawArrow, drawTextAt, removeMark, drawRect } from './overlay-functions.ts';
import { overlay1 } from './overlay.ts';

/* Imports for efficient line rendering. */
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

export type TSS = (tp: IR[]) => THREE.Group;
export type TSSName = 'basicVis' | 'distanceTraveledVis' | 'overlay';

export type TSSCollection = Record<TSSName, TSS>

export const tssCollection: TSSCollection = {
  basicVis: basicVis,
  distanceTraveledVis: distanceTraveledVis,
  overlay: overlay
};

function basicVis(irs: IR[]) {
  let moveCurves: THREE.LineCurve3[] = [];
  let currentPos = new THREE.Vector3();
  let previousPos = new THREE.Vector3();
  let isOnBed = false;

  irs.forEach(function (ir) {
    let newPos = new THREE.Vector3(
      ir.args.x || currentPos.x,
      ir.args.y || currentPos.y,
      ir.args.z || currentPos.z
    );

    if (isOnBed && ir.state.toolOnBed) {
      if (currentPos.distanceTo(previousPos) > Number.EPSILON) {
        let moveCurve = new THREE.LineCurve3(currentPos, newPos);
        moveCurves.push(moveCurve);
      }
    }
    // starts new line segment when transitioning from on and off bed
    if (!isOnBed && ir.state.toolOnBed) {
      currentPos = newPos;
    }

    isOnBed = ir.state.toolOnBed || false;
    previousPos = currentPos;
    currentPos = newPos;
  });

  let lines = moveCurves.map(curve => {
    let geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
    let material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    return new THREE.Line(geometry, material);
  });

  let group = new THREE.Group();
  lines.forEach(line => group.add(line));
  if (irs[0].state.units === 'in') {
    group.scale.set(25.4, 25.4, 25.4); // in to mm converstion
  }
  group.rotateX(Math.PI / 2);
  return group;
}

function distanceTraveledVis(irs: IR[]) {
  let moveCurves: THREE.LineCurve3[] = [];
  let currentPos = new THREE.Vector3();
  let previousPos = new THREE.Vector3();
  let isOnBed = false;
  let totalLength = 0;

  irs.forEach(function (ir) {
    let newPos = new THREE.Vector3(
      ir.args.x || currentPos.x,
      ir.args.y || currentPos.y,
      ir.args.z || currentPos.z
    );
    let moveCurve = new THREE.LineCurve3(currentPos, newPos);
    totalLength += moveCurve.getLength();

    if (isOnBed && ir.state.toolOnBed) {
      if (currentPos.distanceTo(previousPos) > Number.EPSILON) {
        moveCurves.push(moveCurve);
      }
    }

    // starts new line segment when transitioning from on and off bed
    if (!isOnBed && ir.state.toolOnBed) {
      currentPos = newPos;
    }

    isOnBed = ir.state.toolOnBed || false;
    previousPos = currentPos;
    currentPos = newPos;
  });

  let lines = moveCurves.map(curve => {
    let geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
    let material = new THREE.LineBasicMaterial({ vertexColors: true });
    return new THREE.Line(geometry, material);
  });

  let group = new THREE.Group();
  let distance = 0;

  lines.forEach((line) => {
    let points= line.geometry.attributes.position.array;
    let colors = [];
    let color = new THREE.Color();
          
    for (let i = 0; i < points.length; i += 3) {
      let point = new THREE.Vector3(points[i], points[i + 1], points[i + 2]);
      let segmentLength = point.distanceTo(currentPos);
      distance += segmentLength;
      currentPos = point;
      let hue = distance / totalLength;
      color.setHSL(hue, 1.0, 0.5);
      colors.push(color.r, color.g, color.b);
    }

    line.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(colors), 3)
    );

    group.add(line);
  });

  group.rotateX(Math.PI / 2);
  if (irs[0].state.units === 'in') {
    group.scale.set(25.4, 25.4, 25.4); // in to mm converstion
  }
  return group;
}

function overlay() {
  let groupList = overlay1();

  return groupList[2];
}
