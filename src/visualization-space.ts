import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// NOTE: Thrisha uncomment below as needed
// import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';

interface Envelope extends THREE.Group {
    dimensions: {
        width: number;
        length: number;
        height: number;
    };
    center: THREE.Vector3;
};

export class VisualizationSpace {
    protected domContainer: HTMLDivElement;
    protected scene: THREE.Scene;
    protected camera: THREE.Camera;
    protected controls?: OrbitControls;
    protected threeRenderer?: THREE.Renderer;
    protected envelopeGroup: Envelope;
    protected vizGroup: THREE.Group;
    protected renderRequested: boolean;

    constructor(domContainer: HTMLDivElement) {
        this.domContainer = domContainer;
        this.scene = this.initScene();
        this.envelopeGroup = this.createEnvelopeGroup();
        this.vizGroup = new THREE.Group();
        this.scene.add(this.envelopeGroup);
        this.scene.add(this.vizGroup);
        this.camera = this.initCamera(true);
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
        // scene.background = new THREE.Color(0x23241f);
        scene.background = new THREE.Color(0x242424);
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

    initCamera(isOrtho: boolean) {
        let camera;
        let aspect = window.innerWidth / window.innerHeight;
        if (isOrtho) {
            camera = new THREE.OrthographicCamera(
              -720 / 2,
              720 / 2,
              480 / 2,
              -480 / 2,
              0.1,
              10000
            );
            camera.up = new THREE.Vector3(0, -1, 0);
            camera.zoom = 2;
            camera.updateProjectionMatrix();
            camera.position.set(-100, -100, -100);
            camera.updateProjectionMatrix();
        }
        else {
            let fov = 50;
            camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 30000);
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
        renderer.setSize(720, 480);
        this.domContainer.appendChild(renderer.domElement);
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

    createEnvelopeGroup() : Envelope {
        let dimensions = {
            width: 300,
            height: 17,
            length: 218
        };
        let boxGeom = new THREE.BoxGeometry(dimensions.width,
                    dimensions.height, dimensions.length, 2, 2, 2);
        let edgesGeom = new THREE.EdgesGeometry(boxGeom);
        let material = new THREE.LineDashedMaterial({
            color : 0xffffff,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 3
        });
        let mesh = new THREE.LineSegments(edgesGeom, material);
        mesh.computeLineDistances();
        let envelopeGroup = new THREE.Group() as Envelope;
        envelopeGroup.add(mesh);
        envelopeGroup.position.set(
            dimensions.width / 2,
            dimensions.height / 2,
            dimensions.length / 2
        );
        envelopeGroup.dimensions = dimensions;
        envelopeGroup.center = envelopeGroup.position.clone().add(
            new THREE.Vector3(-dimensions.width / 2, 0, -dimensions.length / 2)
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

