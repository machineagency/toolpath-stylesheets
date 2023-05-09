import * as THREE from 'three';

import { IR } from './type-utils.ts';

export type TSS = (tp: IR[]) => THREE.Group;
export type TSSName = 'tssA' | 'tssB' | 'tssC';

export type TSSCollection = Record<TSSName, TSS>

export const tssCollection: TSSCollection = {
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
