import * as THREE from 'three';

import { IR } from './type-utils.ts';

export type TSS = (tp: IR[]) => THREE.Group;
export type TSSName = 'tssA' | 'tssB' | 'tssC' | 'basicVis' | 'distanceFromOriginVis' | 
                      'distanceTraveledVis';

export type TSSCollection = Record<TSSName, TSS>

export const tssCollection: TSSCollection = {
    basicVis: basicVis,
    distanceFromOriginVis: distanceFromOriginVis,
    distanceTraveledVis: distanceTraveledVis,
    tssA: tssA,
    tssB: tssB,
    tssC: tssC
};

function tssA(tp: IR[]) {
    tp;
    return new THREE.Group();
}

function tssB(tp: IR[]) {
    tp;
    return new THREE.Group();
}

function tssC(tp: IR[]) {
    tp;
    return new THREE.Group();
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
    group.rotateX(Math.PI / 2);
    return group;
}

function distanceFromOriginVis(irs: IR[]) {
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
        let material = new THREE.LineBasicMaterial({ vertexColors: true });
        return new THREE.Line(geometry, material);
    });

    let group = new THREE.Group();

    lines.forEach((line) => {
        let points= line.geometry.attributes.position.array;
        let colors = [];
        let color = new THREE.Color();
        
        for (let i = 0; i < points.length; i += 3) {
            let point = new THREE.Vector3(points[i], points[i + 1], points[i + 2]);
            let distance = point.distanceTo(new THREE.Vector3());

            let hue = distance / 300; // changes rainbow coloring
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
    return group;
}

function distanceTraveledVis(irs: IR[]) {
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
        let material = new THREE.LineBasicMaterial({ vertexColors: true });
        return new THREE.Line(geometry, material);
    });

    let group = new THREE.Group();

    let totalLength = 0;
    moveCurves.forEach(curve => {
        totalLength += curve.getLength();
    });

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
    return group;
  }
  
