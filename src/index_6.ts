import {
    Engine,
    Scene,
    Vector3,
    WebXRDefaultExperience,
    MeshBuilder,
    Quaternion,
    StandardMaterial,
    Color3,
    WebXRPlaneDetector,
    ShadowGenerator,
    DirectionalLight,
    PolygonMeshBuilder,
    Vector2,
    IWebXRPlane,
    Mesh,
    Nullable,
    WebXRFeatureName,
    IShadowLight,
    HemisphericLight,
    WebXRFeaturesManager,
    WebXRHitTest,
    IWebXRHitResult,
    WebXRInputSource,
    Ray,
    Animation,
    IAnimationKey,
} from '@babylonjs/core';

import '@babylonjs/loaders';

import { Inspector } from '@babylonjs/inspector';

type classArguments = {
    debug: boolean;
}

type SessionModes = "immersive-ar" | "immersive-vr" | "inline";

type ReferenceSpaceType = "local-floor" | "bounded-floor" | "unbounded" | "local" | "viewer";


class XrExperience {
    _canvas: HTMLCanvasElement;
    _engine: Engine;
    _scene: Scene;
    _debug: boolean;
    _xr: WebXRDefaultExperience | null;
    _sessionMode: SessionModes;
    _referenceSpaceType: ReferenceSpaceType;
    _optionalFeatures: boolean;
    _fm: WebXRFeaturesManager | null;
    _shadowGenerator: ShadowGenerator | null;
    _xrPlanes: WebXRPlaneDetector | null;
    _xrHitTest: WebXRHitTest | null;
    _hitTest: IWebXRHitResult | undefined;
    _planes: Mesh[] = [];
    _marker: Mesh | null;
    _box: Mesh | null;


    /**
     * Constructs a new instance of the class.
     * @throws {string} Throws an error if WebGL is not supported.
     */
    constructor(args: classArguments) {
        if (!Engine.isSupported()) {
            throw 'WebGL not supported';
        }

        this._canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);
        this._debug = args.debug;
        this._sessionMode = "immersive-ar";
        this._referenceSpaceType = "local-floor";
        this._optionalFeatures = true;
        this._xr = null;
        this._fm = null;
        this._shadowGenerator = null;
        this._xrHitTest = null;
        this._xrPlanes = null;
        this._hitTest = undefined;
        this._planes = [];
        this._marker = null;
        this._box = null;

        this.createXrExperience().then(() => {
            this.addFeaturesToSession();
            this.createScene().then(() => {
                this._engine.runRenderLoop(() => {
                    this._scene.render();
                });
                window.addEventListener('resize', () => {
                    this._engine.resize();
                });
            });
        }).catch((error) => {
            console.log(error);
        });
    }


    /**
     *  Enables the WebXR default experience helper
        This enables default XR features such as as session, a camera, xr input, default UI to enter XR and scene transitions.
        We also configure the session to use AR and floor tracking.
        All optional features are enabled to allow for the most immersive experience..
     *  @returns A promise that resolves when the XR experience is created.
     */
    async createXrExperience(): Promise<void> {
        this._xr = await WebXRDefaultExperience.CreateAsync(this._scene, {
            uiOptions: {
                sessionMode: this._sessionMode,
                referenceSpaceType: this._referenceSpaceType,
            },
            optionalFeatures: this._optionalFeatures,
        });

        if (!this._xr.baseExperience) {
            throw new Error('Unable to create XR experience');
        }
    }


    /**
     * Adds features to the session.
     */
    addFeaturesToSession() {
        if (this._xr === null) {
            return;
        }
        // Get the features manager from the default xr experience
        this._fm = this._xr.baseExperience.featuresManager;

        try {
            this._xrPlanes = this._fm.enableFeature(WebXRFeatureName.PLANE_DETECTION, "latest") as WebXRPlaneDetector;
            this._xrHitTest = this._fm.enableFeature(WebXRFeatureName.HIT_TEST, "latest") as WebXRHitTest;
        } catch (error) {
            console.log(error);
        }


    }

    /**
     * Creates the scene for the XR experience.
     * This function is called once when the scene is first created.
     * @returns A promise that resolves when the scene is created.
     */
    async createScene(): Promise<Scene> {

        this.createLightsAndShadows();
        this.createPlaneMeshesFromXrPlane();
        this.createBox();
        this.addMarkerForHitTest();
        this.performHitTest();
        this.handleControllerSelection();
        this.animateBox();

        if (this._debug) Inspector.Show(this._scene, {});

        return this._scene;
    }


    /**
     * Creates a shadow generator for the scene.
     * ! shadowGenerator can only be created with a directional light
     * @returns A shadow generator.
     */
    createLightsAndShadows() {
        const lights = this.createLights();

        const shadowGenerator = new ShadowGenerator(1024, lights as IShadowLight);

        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;

        this._shadowGenerator = shadowGenerator;
    }


    /**
     * Creates a light for the scene.
     * @returns A directional light.
     */
    createLights() {

        const directionalLight = new DirectionalLight("directionalLight", new Vector3(0, 0, 10), this._scene);
        directionalLight.intensity = 0.3;

        const hemiLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), this._scene);
        hemiLight.intensity = 0.7;

        return directionalLight;
    }


    /**
     * Creates a plane mesh from a detected plane.
     * @param xrPlane The detected plane.
     * @returns A plane mesh.
     */
    createPlaneMeshesFromXrPlane(): void {
        interface IWebXRPlaneWithMesh extends IWebXRPlane {
            mesh?: Mesh;
        }

        let mat: Nullable<StandardMaterial>;

        if (this._xrPlanes === null) {
            return;
        }

        this._xrPlanes.onPlaneAddedObservable.add((plane: IWebXRPlaneWithMesh) => {
            this._debug && console.log("plane added", plane);
            mat = new StandardMaterial("mat", this._scene);
            mat.alpha = 0.35;
            mat.diffuseColor = Color3.Random();
            this.initPolygon(plane, mat);
        });

        this._xrPlanes.onPlaneUpdatedObservable.add((plane: IWebXRPlaneWithMesh) => {
            if (this._planes[plane.id].material) {
                mat = this._planes[plane.id].material as StandardMaterial;
                this._planes[plane.id].dispose(false, false);
            }
            const some = plane.polygonDefinition.some(p => !p);
            if (some) {
                return;
            }
            this.initPolygon(plane, mat!);
        });

        this._xrPlanes.onPlaneRemovedObservable.add((plane: IWebXRPlaneWithMesh) => {
            if (plane && this._planes[plane.id]) {
                this._planes[plane.id].dispose()
            }
        })

        if (this._xr !== null) {
            this._xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
                this._planes.forEach((plane: Mesh) => plane.dispose());
                while (this._planes.pop());
            });
        }
    }


    /**
     * Initializes the polygon that represents the plane.
     * @param plane The plane.
     * @param mat The material.
     */
    initPolygon(plane: IWebXRPlane, mat?: StandardMaterial): Mesh {
        plane.polygonDefinition.push(plane.polygonDefinition[0]);
        const polygonTriangulation = new PolygonMeshBuilder(plane.xrPlane.orientation, plane.polygonDefinition.map((p) => new Vector2(p.x, p.z)), this._scene);
        const polygon = polygonTriangulation.build(false, 0.01);

        polygon.createNormals(false);

        if (mat) {
            polygon.material = mat;
        }

        polygon.rotationQuaternion = new Quaternion();
        polygon.checkCollisions = true;
        polygon.receiveShadows = true;

        plane.transformationMatrix.decompose(polygon.scaling, polygon.rotationQuaternion, polygon.position);

        this._planes[plane.id] = (polygon);

        return polygon;
    }


    /**
     * Creates a box mesh.
     */
    createBox() {
        const material = new StandardMaterial("material", this._scene);

        material.diffuseColor = Color3.Random();

        this._box = MeshBuilder.CreateBox("box", { width: 0.5, height: 0.5, depth: 0.5 }, this._scene);
        this._box.material = material;
        this._box.rotation.y = Math.PI / 4;
        this._box.rotation.x = Math.PI / 4;
        this._box.position = new Vector3(0, 1.5, 1.5);
    }


    /**
     * Adds a marker for hit testing.
     */
    addMarkerForHitTest() {
        this._marker = MeshBuilder.CreateTorus("marker", { diameter: 0.3, thickness: 0.1 }, this._scene);
        this._marker.isVisible = false;
        this._marker.rotationQuaternion = new Quaternion();
    }


    /**
     * Performs a hit test.
     */
    performHitTest() {
        if (this._xrHitTest === null || this._marker === null) {
            return;
        }
        this._xrHitTest.onHitTestResultObservable.add((results) => {
            if (results.length) {
                this._marker!.isVisible = true;
                this._hitTest = results[0];
                this._hitTest.transformationMatrix.decompose(undefined, this._marker!.rotationQuaternion!, this._marker!.position);
            } else {
                this._marker!.isVisible = false;
                this._hitTest = undefined;
            }
        });
    }


    /**
     * Handles controller selection.
     */
    handleControllerSelection() {

        if (this._xr === null) {
            return;
        }
        this._xr.input.onControllerAddedObservable.add((motionControllerAdded) => {
            motionControllerAdded.onMotionControllerInitObservable.add((motionControllerInit) => {
                const motionControllerComponentIds = motionControllerInit.getComponentIds();
                const triggerComponent = motionControllerInit.getComponent(motionControllerComponentIds[0]);

                triggerComponent.onButtonStateChangedObservable.add((component) => {
                    if (component.pressed && component.value > 0.8) {

                        const resultRay = this.createRayFromController(motionControllerAdded);
                        const raycastHit = this._scene.pickWithRay(resultRay);
                        if (this._debug) console.log(raycastHit);

                        if (raycastHit && raycastHit.hit && raycastHit.pickedMesh) {
                            if (raycastHit.pickedMesh === this._box) {
                                const mat = this._box!.material as StandardMaterial;
                                mat.diffuseColor = Color3.Random();
                                this._box!.material = mat;
                            }
                        }
                    }
                });
            });
        });
    }


    /**
     * Creates a ray from the controller.
     * @param controller The controller to create the ray from.
     * @returns A ray.
     */
    createRayFromController(controller: WebXRInputSource): Ray {
        const origin = controller.pointer.position;
        const direction = controller.pointer.forward;
        return new Ray(origin, direction, length = 100);
    }


    /**
     * Rotates the box mesh.
     */
    animateBox() {
        const rotateAnimation = new Animation("rotateAnimation", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keyFrames: { frame: number, value: number }[] = [];

        keyFrames.push({
            frame: 0,
            value: 0
        });

        keyFrames.push({
            frame: 50,
            value: Math.PI / 2
        });

        keyFrames.push({
            frame: 100,
            value: Math.PI
        });

        rotateAnimation.setKeys(keyFrames as IAnimationKey[]);
        this._box!.animations = [rotateAnimation];
        this._scene.beginAnimation(this._box, 0, 100, true);
    }
}

new XrExperience({ debug: false });

