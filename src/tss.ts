import * as THREE from 'three';

import { IR } from './type-utils.ts';

export type TSS = (tp: IR[]) => THREE.Group;
export type TSSName = 'tssA' | 'tssB' | 'tssC' | 'basicVis';

export type TSSCollection = Record<TSSName, TSS>

export const tssCollection: TSSCollection = {
    basicVis: basicVis,
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
        let geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(300));
        let material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        return new THREE.Line(geometry, material);
    });
    let group = new THREE.Group();
    lines.forEach(line => group.add(line));
    group.rotateX(Math.PI / 2);
    return group;
}
