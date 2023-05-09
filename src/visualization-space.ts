import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class VisualizationSpace {
    protected scene: THREE.Scene;
    protected camera: THREE.Camera;
    protected controls?: OrbitControls;
    protected threeRenderer?: THREE.Renderer;
    protected envelopeGroup: THREE.Group;
    protected vizGroup: THREE.Group;
    protected renderRequested: boolean;

    constructor() {
        this.scene = this.initScene();
        this.envelopeGroup = this.createEnvelopeGroup();
        this.vizGroup = new THREE.Group();
        this.scene.add(this.envelopeGroup);
        this.scene.add(this.vizGroup);
        this.camera = this.initCamera(this.envelopeGroup.position, true);
        this.renderRequested = false;
        this.initPostDomLoadLogistics();
        // For debugging
        (window as any).vs = this;
    }

    addVizWithName(vizGroup: THREE.Group, interpreterName: string) {
        vizGroup.name = interpreterName;
        this.vizGroup.add(vizGroup);
        this.threeRenderScene();
    }

    getCurrentVizNames() {
        return this.vizGroup.children.map((alsoCalledVizGroup) => {
            return alsoCalledVizGroup.name;
        });
    }

    removeAllViz() {
        // TODO: cast as THREE.Mesh and call dispose on geom and mat
        this.vizGroup.children.forEach((child: THREE.Object3D) => {
            child.remove();
        });
        this.vizGroup.children = [];
        this.threeRenderScene();
    }

    createExampleToolpath() {
        let line = new THREE.LineCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(100, 100, 40),
        );
        let geom = new THREE.TubeGeometry(line, 64, 1, 64, false);
        let material = new THREE.MeshToonMaterial({
            color: 0xe44242,
            side: THREE.DoubleSide
        });
        let mesh = new THREE.Mesh(geom, material);
        return mesh;
    }

    initPostDomLoadLogistics() {
        this.threeRenderer = this.initThreeRenderer();
        this.controls = this.initControls(this.camera, this.threeRenderer);
        this.threeRenderScene();
        // let animate = () => {
        //     let maxFramerate = 20;
        //     setTimeout(() => {
        //         requestAnimationFrame(animate);
        //     }, 1000 / maxFramerate);
        //     this.threeRenderScene();
        // };
        // animate();
    }

    initScene() {
        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0x23241f);
        let topDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
        let leftDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.50);
        let rightDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
        let ambientLight = new THREE.AmbientLight(0x404040);
        leftDirectionalLight.position.set(-1.0, 0.0, 0.0);
        rightDirectionalLight.position.set(0.0, 0.0, 1.0);
        scene.add(topDirectionalLight);
        scene.add(leftDirectionalLight);
        scene.add(rightDirectionalLight);
        scene.add(ambientLight);
        return scene;
    }

    initCamera(centerPoint: THREE.Vector3, isOrtho: boolean) {
        let camera;
        let aspect = window.innerWidth / window.innerHeight;
        let viewSize = 150;
        if (isOrtho) {
            camera = new THREE.OrthographicCamera(-viewSize * aspect,
                viewSize * aspect,
                viewSize, -viewSize, -1000, 10000);
            camera.zoom = 0.95;
            camera.updateProjectionMatrix();
            camera.frustumCulled = false;
            camera.position.set(-500, 500, 500); // I don't know why this works
            camera.lookAt(centerPoint);
        }
        else {
            let fov = 50;
            camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 30000);
            camera.lookAt(centerPoint);
            camera.position.set(-500, 500, 500);
            camera.updateProjectionMatrix();
        }
        return camera;
    }

    initControls(camera: THREE.Camera, renderer: THREE.Renderer) {
        let controls = new OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.addEventListener('change', this.requestRenderScene.bind(this));
        controls.enableDamping = true;
        controls.dampingFactor = 0.5;
        return controls;
    }

    initThreeRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        let maybeDom = document.getElementById('visualization-space');
        if (maybeDom) {
            maybeDom.appendChild(renderer.domElement);
        }
        else {
            throw new Error('bad');
        }
        return renderer;
    }

    requestRenderScene() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(this.threeRenderScene.bind(this));
        }
    }

    threeRenderScene() {
        // this.controls.update();
        // let deltaSeconds = this.clock.getDelta();
        // this.mixers.forEach((mixer) => {
        //     mixer.update(deltaSeconds);
        // });
        this.renderRequested = false;
        this.controls?.update();
        this.threeRenderer?.render(this.scene, this.camera);
    }

    createEnvelopeGroup() : THREE.Group {
        let dimensions = {
            width: 300,
            height: 17,
            length: 218
        };
        let whitesmoke = 0xf5f5f5;
        let boxGeom = new THREE.BoxGeometry(dimensions.width,
                    dimensions.height, dimensions.length, 2, 2, 2);
        let edgesGeom = new THREE.EdgesGeometry(boxGeom);
        let material = new THREE.LineDashedMaterial({
            color : whitesmoke,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 3
        });
        let mesh = new THREE.LineSegments(edgesGeom, material);
        mesh.computeLineDistances();
        let envelopeGroup = new THREE.Group();
        envelopeGroup.add(mesh);
        envelopeGroup.position.set(
            dimensions.width / 2,
            dimensions.height / 2,
            dimensions.length / 2
        );
        return envelopeGroup;
    }

    computeOverheadView() {
        // TODO
    }

    computeARScene() {
        // TODO
    }

    toString() : string {
        return `<VS with: ${this.getCurrentVizNames()}>`;
    }
}

