import * as THREE from 'three';

import { STEP } from './type-utils.ts';
import { drawCross, drawArrow, drawTextAt, drawRect } from './overlay-functions.ts';

export type Overlay = () => STEP[];
export type OverlayName = 'basicOverlay';

export type OverlayCollection = Record<OverlayName, Overlay>;

export const overlayCollection: OverlayCollection = {
    basicOverlay: basicOverlay
};

export function step(stepName: string, visGroup: THREE.Group) {
    return {
        label: stepName,
        group: visGroup
    }
}

function basicOverlay() {
    let steps: STEP[] = [];
    
    // STEP 1
    let group1 = new THREE.Group();
    let stock = drawRect(80, 30, 50, 50);
    // let text = drawTextAt(100, 10, "Place stock here");
    drawTextAt(100, 10, "Place stock here").then((text) => {
        group1.add(text);
    });
    let arrow = drawArrow(95, 10, 75, 45);
    group1.add(stock);
    //group1.add(text);
    group1.add(arrow);

    let step1 = step("Placing the stock material", group1);
    steps.push(step1);

    // STEP 2
    let group2 = new THREE.Group();
    //let text1 = drawTextAt(100, 50, "center XY");
    drawTextAt(100, 50, "center XY").then((text2) => {
        group2.add(text2);
    })
    //group2.add(text1);

    let step2 = step("Center x and y", group2);
    steps.push(step2);

    // STEP 3
    let group3 = new THREE.Group();
    let cross = drawCross(50, 50);
    //let text2 = drawTextAt(100, 80, "Confirm?");
    drawTextAt(100, 80, "Confirm?").then((text3) => {
        group3.add(text3);
    })
    group3.add(cross);
    //group3.add(text2);

    let step3 = step("Confirm crosshair", group3);
    steps.push(step3);

    return steps;
}
