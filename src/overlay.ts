import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// function draws a crosshair at the given x and y coord
export function drawCross(x: number, y: number) {
    let group = new THREE.Group();
    let material = new THREE.LineBasicMaterial({ color: 0xff0000});
  
    let line1 = new THREE.LineCurve3(new THREE.Vector3(-100000, y, 0), 
                                     new THREE.Vector3(100000, y, 0));
    let line2 = new THREE.LineCurve3(new THREE.Vector3(x, -100000, 0), 
                                     new THREE.Vector3(x, 100000, 0));
    
    let geometry1 = new THREE.BufferGeometry().setFromPoints(line1.getPoints(50));
    let geometry2 = new THREE.BufferGeometry().setFromPoints(line2.getPoints(50));
    group.add(new THREE.Line(geometry1, material));  
    group.add(new THREE.Line(geometry2, material));    
    group.rotateX(Math.PI / 2);
    return group;
}

// function draws an arrow on the bed from the given start x and y coord to the
// given end x and y coord
export function drawArrow(x1: number, y1: number, x2: number, y2: number) {
    let startPoint = new THREE.Vector3(x1, y1, 0);
    let endPoint = new THREE.Vector3(x2, y2, 0);
    let direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    let length = direction.length();

    let arrowHelper = new THREE.ArrowHelper(
        direction.normalize(),
        startPoint,
        length,
        0x00ff00
    );

    let group = new THREE.Group();
    group.add(arrowHelper);
    group.rotateX(Math.PI / 2);
    return group;
}

// function draws text on the bed starting at the given x and y coord
// containing the given input string
export function drawTextAt(x: number, y: number, input: string) {
    let group = new THREE.Group();
    const loader = new FontLoader();

    loader.load('fonts.json', function (font) {
        let text = new TextGeometry(input, {
            font: font,
            size: 15,
            height: 0.02,
        });

        let material = new THREE.MeshPhongMaterial( {color: 0xffb6c1} );
        let textMesh = new THREE.Mesh(text, material);
        textMesh.position.set(x, -y, 0);
        textMesh.rotation.z =  - Math.PI / 2;
        group.add(textMesh);
        group.rotateX(Math.PI / 2);
        group.rotateZ(Math.PI / 2);
    });

    return group;
}