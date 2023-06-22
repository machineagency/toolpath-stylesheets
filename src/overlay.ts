import * as THREE from 'three';

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