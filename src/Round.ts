import { Animation, Tools, Light, RayHelper, PointLight, PBRMetallicRoughnessMaterial, SpotLight, DirectionalLight, OimoJSPlugin, PointerEventTypes, Space, Engine, SceneLoader, Scene, Vector3, Ray, TransformNode, Mesh, Color3, Color4, UniversalCamera, Quaternion, AnimationGroup, ExecuteCodeAction, ActionManager, ParticleSystem, Texture, SphereParticleEmitter, Sound, Observable, ShadowGenerator, FreeCamera, ArcRotateCamera, EnvironmentTextureTools, Vector4, AbstractMesh, KeyboardEventTypes, int, _TimeToken, CameraInputTypes, WindowsMotionController } from "@babylonjs/core";
import { SkyMaterial } from "@babylonjs/materials";

export class Round{
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _light1: Light;
    private _skyboxMaterial: SkyMaterial;
    private _ambianceMusic: Sound;
    private _dayAmbianceMusic: Sound;

    constructor(scene: Scene, canvas: HTMLCanvasElement, light1: Light, skyboxMaterial: SkyMaterial,ambianceMusic: Sound, dayAmbianceMusic:Sound ) {
        this._scene = scene;
        this._canvas = canvas;
        this._light1 = light1;
        this._skyboxMaterial = skyboxMaterial;
        this._ambianceMusic = ambianceMusic;
        this._dayAmbianceMusic = dayAmbianceMusic;
    }
    
    //day settings
    public async day(){
            this._ambianceMusic.stop();
            if(!this._dayAmbianceMusic.isPlaying)
            {
                this._dayAmbianceMusic.play();
            }
            this._skyboxMaterial.luminance = 1;
            this._light1.intensity = 1;
            this._skyboxMaterial.useSunPosition = true; // Do not set sun position from azimuth and inclination
            this._skyboxMaterial.sunPosition = new Vector3(0, 100, 0);
    }
 
    //night settings
    public async night(){
        this._dayAmbianceMusic.stop();
        if(!this._ambianceMusic.isPlaying)
            {
                this._ambianceMusic.play();
            }
        
            this._skyboxMaterial.luminance = 0;
            this._light1.intensity = 0.05;
            this._skyboxMaterial.useSunPosition = false;
    }
}