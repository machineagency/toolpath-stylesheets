import * as THREE from 'three';

import { IR } from './type-utils.ts';

/* Imports for efficient line rendering. */
//import { Line2 } from 'three/examples/jsm/lines/Line2.js'
//import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
//import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
//import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
//import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

export type TSS = (tp: IR[]) => THREE.Group;
export type TSSName = 'basicVis' | 'distanceTraveledVis' | 'sharpAnglesVis';

export type TSSCollection = Record<TSSName, TSS>

export const tssCollection: TSSCollection = {
  basicVis: basicVis,
  distanceTraveledVis: distanceTraveledVis,
  sharpAnglesVis: sharpAnglesVis
};

function basicVis(irs: IR[]) {
  let moveCurves: THREE.LineCurve3[] = [];
  //let positions: THREE.Vector3[] = [];
  //let colors: number[] = [];
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
        //positions.push(newPos);
        //let red = [255, 0, 0];
        //colors.push(...red);
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
  
  /*
  let positionsFlat = positions.map((vec) => [vec.x, vec.y, vec.z]).flat();
  let lineGeom = new LineGeometry();
  lineGeom.setPositions(positionsFlat);
  lineGeom.setColors(colors);
  let material = new LineMaterial({ 
    vertexColors: true,
    linewidth: 1,
    resolution: new THREE.Vector2(640, 480),
  });
  let line = new Line2(lineGeom, material);
  if (irs[0].state.units == 'in') {
    line.scale.set(25.4, 25.4, 25.4);
  }
  //line.scale.set(1, 1, 1);
  line.computeLineDistances();
  */

  let group = new THREE.Group();
  
  lines.forEach(line => group.add(line));
  if (irs[0].state.units === 'in') {
    group.scale.set(25.4, 25.4, 25.4); // in to mm converstion
  }
  //group.add(line);
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

function sharpAnglesVis(irs: IR[], sharpAngleThreshold: number = 60) {
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
  console.log(moveCurves);

  let sharpAngles = [];
  // now, find all the sharp angles based on some threshold value
  for (let i = 0; i < moveCurves.length - 1; i++) {
    // current and next curves
    let curve1 = moveCurves[i];
    let curve2 = moveCurves[i + 1];

    // end points of the curves
    let endPoint1 = curve1.v2.clone();
    let endPoint2 = curve2.v1.clone();

    // Calculate the vectors representing the directions of the curves
    let dir1 = endPoint1.clone().sub(curve1.v1);
    let dir2 = endPoint2.clone().sub(curve2.v2);

    // Normalize the vectors
    dir1.normalize();
    dir2.normalize();

    // Calculate the angle between the vectors in degrees
    let angle = THREE.MathUtils.radToDeg(dir1.angleTo(dir2));
    console.log(angle);
    // Check if the angle is sharper than threshold
    if (angle < sharpAngleThreshold) {
      // Define the scale factor for the shorter line
      let scaleFactor = 0.25; // Adjust as needed

      // Calculate the new endpoint for the shorter line
      let shorterLineEnd = new THREE.Vector3().copy(curve1.v1).addScaledVector(dir1, curve1.v2.distanceTo(curve1.v1) * scaleFactor);

      // Create a new line with the same direction but a different length
      let shorterLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([curve1.v2, shorterLineEnd]), new THREE.LineBasicMaterial({ color: 0x00ff00 }));

      // Add the green line to the array
      sharpAngles.push(shorterLine);

      // Calculate the new endpoint for the shorter line
      let shorterLineEnd2 = new THREE.Vector3().copy(curve2.v2).addScaledVector(dir2, curve2.v2.distanceTo(curve2.v1) * scaleFactor);

      // Create a new line with the same direction but a different length
      let shorterLine2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([curve2.v1, shorterLineEnd2]), new THREE.LineBasicMaterial({ color: 0x00ff00 }));

      // Add the green line to the array
      sharpAngles.push(shorterLine2);
    }
  }
  
  let group = new THREE.Group();
  
  lines.forEach(line => group.add(line));
  sharpAngles.forEach(line => group.add(line));
  if (irs[0].state.units === 'in') {
    group.scale.set(25.4, 25.4, 25.4); // in to mm converstion
  }
  group.rotateX(Math.PI / 2);
  return group;
}





