import * as THREE from 'three';

import { drawCross, drawArrow, drawTextAt, removeMark, drawRect } from './overlay-functions.ts';

// clones an existing THREE.Group
function deepClone(object: any) {
    return JSON.parse(JSON.stringify(object));
}

export function overlay1() {
    let groupList:THREE.Group[] = [];
    let group1 = new THREE.Group();
    let stock = drawRect(80, 30, 50, 50);
    group1.add(stock);

    let text = drawTextAt(100, 10, "Place stock here")
    group1.add(text);

    let arrow = drawArrow(95, 10, 75, 45);
    group1.add(arrow);
    groupList.push(group1);

    let group2 = new THREE.Group();
    let text1 = drawTextAt(100, 50, "center XY");
    group2.add(text1);
    groupList.push(group2);

    let group3 = new THREE.Group();
    let cross = drawCross(50, 50);
    let text2 = drawTextAt(100, 80, "Confirm?");
    group3.add(cross);
    group3.add(text2);
    groupList.push(group3);

    return groupList;
}
