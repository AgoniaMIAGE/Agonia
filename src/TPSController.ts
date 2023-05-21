import { Animation, CannonJSPlugin, PhysicsImpostor, StandardMaterial, MeshBuilder, Tools, RayHelper, PointLight, PBRMetallicRoughnessMaterial, SpotLight, DirectionalLight, OimoJSPlugin, PointerEventTypes, Space, Engine, SceneLoader, Scene, Vector3, Ray, TransformNode, Mesh, Color3, Color4, UniversalCamera, Quaternion, AnimationGroup, ExecuteCodeAction, ActionManager, ParticleSystem, Texture, SphereParticleEmitter, Sound, Observable, ShadowGenerator, FreeCamera, ArcRotateCamera, EnvironmentTextureTools, Vector4, AbstractMesh, KeyboardEventTypes, int, _TimeToken, CameraInputTypes, WindowsMotionController, Camera } from "@babylonjs/core";
import { float } from "babylonjs";
import { Boss } from "./Boss";
import { Enemy } from "./Enemy";
import { Mutant } from "./Mutant";
import { PlayerHealth } from "./PlayerHealth";
import { Zombie } from "./Zombie";
import * as CANNON from 'cannon';

export class TPSController {
    private _camera: ArcRotateCamera;
    private _cameraDistance: number = 10; // adjust as needed
    private _cameraHeightOffset: number = 2; // adjust as needed
    private _cameraTargetOffset: Vector3 = new Vector3(0, 1, 0);
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _enemy: Enemy;
    private _zombie: Zombie;
    private _mutant: Mutant;
    private _boss: Boss;
    private _damage: float;
    private _lastPost: Vector3;
    private _zMeshes: Array<String>;
    private _playerHealth: PlayerHealth;
    private _engine: Engine;
    private _cameraTarget: Mesh;
    private _rightClickPressed: boolean;
    private _playerMesh: Mesh;
    private _playerSpeed: number;
    private _cameraHeight: number;
    private isWalking: boolean = false; // Flag to indicate if the character is walking

    //weapons
    private _weapon: AbstractMesh;

    //cooldown to shot
    private _cooldown_fire: int;
    private _cooldown_time: int;
    public static _ammo: int;
    public static _max_ammo: int;

    //sounds
    private _weaponSound: Sound;
    private _flashlightSound: Sound;
    private _walkSound: Sound;
    private _runSound: Sound;
    private _hurt: Sound;
    private _empty_ammo: Sound;
    private _reloadSound: Sound;

    //headLight
    private _light: SpotLight;
    //private _gun_Flash: SpotLight;

    // animation trackers
    private _currentAnim: AnimationGroup = null;
    private _prevAnim: AnimationGroup;

    //animations
    private _end: AnimationGroup;
    private _shot: AnimationGroup;
    private _idle: AnimationGroup;
    private _reload: AnimationGroup;
    private _death: AnimationGroup;
    private _deathB: AnimationGroup;
    private _deathC: AnimationGroup;
    private _run: AnimationGroup;
    private _hurtA: AnimationGroup;
    private _hurtB: AnimationGroup;
    private _hurtC: AnimationGroup;
    private _start: AnimationGroup;
    private _walk: AnimationGroup;
    private _aim_walk: AnimationGroup;
    private _grenade: AnimationGroup;
    private _aim_idle: AnimationGroup;
    private _aim_run: AnimationGroup;

    //Keys
    private zPressed: boolean = false;
    private qPressed: boolean = false;
    private sPressed: boolean = false;
    private dPressed: boolean = false;
    private controlPressed: boolean = false;
    private controlIPressed: int = 0;
    private rightClickPressed = false;
    private reloadPressed = false;

    //speed
    public walkSpeed = 0.5;
    public runSpeed = 1;

    //soon an Array of Enemy instead of a simple zombie
    constructor(scene: Scene, canvas: HTMLCanvasElement, enemy: Enemy, mutant: Mutant, boss: Boss, zombie: Zombie) {
        this._scene = scene;
        this._canvas = canvas;
        this._enemy = enemy;
        this._zombie = zombie;
        this._mutant = mutant;
        this._boss = boss;
        this.createPlayer();
        this.createController();
        this.keyboardInput();
        this.setupFlashlight();
        this.setupAllMeshes();
        this.update();
        this._playerSpeed = 0.2;
        this._cameraDistance = 5;
        this._cameraHeight = 3;
        this.i = 0;
        this._cooldown_time = 0;
        this._flashlightSound = new Sound("flashlightSound", "sounds/flashlight.mp3", this._scene);
        this._walkSound = new Sound("walk", "sounds/walk.mp3", this._scene, null, {
            loop: true,
            autoplay: false,
            volume: 2.4
        });
        this._runSound = new Sound("run", "sounds/run.mp3", this._scene, null, {
            loop: true,
            autoplay: false,
            volume: 0.3
        });
        this._hurt = new Sound("hurt", "sounds/hurt.mp3", this._scene, null, {
            loop: false,
            autoplay: false,
            volume: 0.3
        });
        this._empty_ammo = new Sound("emptyammo", "sounds/emptyammo.mp3", this._scene);
        this._playerHealth = new PlayerHealth(this._scene, this._weapon, 200);
        this._reloadSound = new Sound("pistolsoundreload", "sounds/pistol-reload.mp3", this._scene);
    }
    
    /**
     * launched every 60ms 
     */
    private update() {
        this._scene.onReadyObservable.add(() => {
            setInterval(() => {
                if (this._cooldown_time < 99999999) {
                    this._cooldown_time += 1
                } else {
                    this._cooldown_time = 0;
                }
                
                // Animations change depending on the current speed
                switch (this._camera.speed) {
                    case 0:
                        if (!this.reloadPressed) {
                            if (!this.rightClickPressed) {
                                this.manageAnimation(this._idle);
                            } else {
                                this.manageAnimation(this._aim_idle);
                            }
                        }
                        break;
                    case this.walkSpeed:
                        if (!this.reloadPressed) {
                            if (!this.rightClickPressed) {
                                if (this.isWalking) {
                                    this.manageAnimation(this._walk); // Play the "walk" animation
                                } else {
                                    this.manageAnimation(this._idle);
                                }
                            } else {
                                this.manageAnimation(this._aim_walk);
                            }
                        }
                        break;
                    default:
                        clearInterval(1);
                }

                if (Enemy.hitPlayer) {
                    this.walkSpeed = 0.2;
                    this.runSpeed = 0.2;
                    this.walk(this.walkSpeed);
                } else {
                    this.walkSpeed = 3;
                    this.runSpeed = 4;
                }
            }, 60);
        });
    }
    
    private manageAnimation(animation) {
        this._currentAnim = animation;
        this._animatePlayer();
    }

    /**
     * create the camera which represents the player (FPS)
     */
    private createController(): void {
    let arcRotateCamera = new ArcRotateCamera("ArcRotateCam", 0, 0, 10, new Vector3(0, 10, -10), this._scene);
    arcRotateCamera.radius = 30; // Distance de la caméra à l'objet cible
    arcRotateCamera.target = this._playerMesh.position; // Objet cible à suivre

    // Ajuster la hauteur de la caméra par rapport à l'objet cible
    arcRotateCamera.beta = Math.PI / 3; // Angle de vue vertical (hauteur)
    
    // Ajuster l'angle de vue horizontal (rotation)
    arcRotateCamera.alpha = Math.PI / 2; // Angle de vue horizontal (rotation)

    // Pour l'accélération et la vitesse maximale, vous pouvez utiliser les valeurs suivantes
    arcRotateCamera.angularSensibilityX = 500; // Sensibilité de la rotation horizontale (vitesse d'accélération)
    arcRotateCamera.angularSensibilityY = 500; // Sensibilité de la rotation verticale (vitesse d'accélération)
    arcRotateCamera.lowerRadiusLimit = 10; // Limite inférieure de la distance de la caméra à l'objet cible
    arcRotateCamera.upperRadiusLimit = 50; // Limite supérieure de la distance de la caméra à l'objet cible

    this._camera = arcRotateCamera;
    this._scene.activeCamera = arcRotateCamera;

    if (this._playerMesh) {
        arcRotateCamera.target = this._playerMesh.position;
    }

    
        // hitbox + gravity
    
        // Définir la caméra comme joueur (sur sa hitbox)
        // this._camera.ellipsoid = new Vector3(0.5, 1.1, 0.5);
    }
    


    private i: int;

    //Key Events
    private keyboardInput(): void {
        this._scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.key) {
                        case 'z':
                            this.zPressed = true;
                            this.isWalking = true;
                            this.walk(this.walkSpeed);
                            this.walkSound();
                            break;
                        case 's':
                            this.sPressed = true;
                            this.walk(this.walkSpeed);
                            this.walkSound();
                            break;
                        case 'q':
                            this.qPressed = true;
                            this.walk(this.walkSpeed);
                            this.walkSound();
                            break;
                        case 'd':
                            this.dPressed = true;
                            this.walk(this.walkSpeed);
                            this.walkSound();
                            break;
                        case 'Shift':
                            if (this.zPressed || this.qPressed || this.sPressed || this.dPressed) {
                                this.walk(this.runSpeed);
                                this._walkSound.stop();
                                if (!this._runSound.isPlaying) {
                                    this._runSound.play();
                                }
                            }
                            break;
                        case 'r':
                            if (this._currentAnim != this._run && !this.reloadPressed) {
                                this.reloadPressed = true;
                                this._currentAnim = this._reload;
                                this._animatePlayer();
                                this._reloadSound.play();
                            }
                            break;
                        case 'f':
                            this._flashlightSound.play();
                            if (this._light.intensity == 5000) {
                                this._light.intensity = 0;
                            } else {
                                this._light.intensity = 5000;
                            }
                            break;
                    }
                    break;
                case KeyboardEventTypes.KEYUP:
                    switch (kbInfo.event.key) {
                        case 'z':
                            this.zPressed = false;
                            this.allUnpressed();
                            this.stopwalkSound();
                            break;
                        case 's':
                            this.sPressed = false;
                            this.allUnpressed();
                            this.stopwalkSound();
                            break;
                        case 'q':
                            this.qPressed = false;
                            this.allUnpressed();
                            this.stopwalkSound();
                            break;
                        case 'd':
                            this.dPressed = false;
                            this.allUnpressed();
                            this.stopwalkSound();
                            break;
                        case 'Shift':
                            this.walk(this.walkSpeed);
                            this._runSound.stop();
                            this.walkSound();
                            break;
                    }
                    break;
            }
        });
    }

    //Mouse Events
    private createPlayer(): void {
        SceneLoader.ImportMeshAsync("", "./models/", "pistol.glb", this._scene).then((result) => {
            this._playerMesh = result.meshes[0] as Mesh;
            let allMeshes = this._playerMesh.getChildMeshes();
            this._playerMesh.parent = this._camera;
            result.meshes[0].position = new Vector3(-0.25, -1.5, 2);
            result.meshes[0].rotation = new Vector3(0, 0, 0);
            result.meshes[0].scaling = new Vector3(0.5, 0.5, -0.5);

            var physicsPlugin = new CannonJSPlugin(true, 10, CANNON);
            this._scene.enablePhysics(new Vector3(0, -9.81, 0), physicsPlugin); // enable physics and set gravity

            let hitbox = MeshBuilder.CreateBox("hitbox", { height: 1.8, width: 0.6, depth: 0.3 }, this._scene);
            hitbox.isVisible = false;

            var hitboxMaterial = new StandardMaterial("mat", this._scene);
            hitboxMaterial.alpha = 0; // make the hitbox invisible
            hitbox.material = hitboxMaterial;

            // Set the hitbox as a child of the player
            const playerRoot = new TransformNode("playerRoot", this._scene);
            hitbox.parent = playerRoot;

            // Set the position of the hitbox to match the player
            hitbox.position = playerRoot.position;

            // Apply a physics imposter. This will make the hitbox respond to gravity and collisions.
            hitbox.physicsImpostor = new PhysicsImpostor(hitbox, PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0 }, this._scene);

            //audio effect
            this._weaponSound = new Sound("pistolsound", "sounds/pistol.mp3", this._scene);
            this._reloadSound = new Sound("pistolsoundreload", "sounds/pistol-reload.mp3", this._scene);

            //animations
            this._death = this._scene.getAnimationGroupByName("Soldier_marine.Death_A");
            this._deathB = this._scene.getAnimationGroupByName("Soldier_marine.Death_B");
            this._deathC = this._scene.getAnimationGroupByName("Soldier_marine.Death_C");
            this._hurtA = this._scene.getAnimationGroupByName("Soldier_marine.Take_damage_A");
            this._hurtB = this._scene.getAnimationGroupByName("Soldier_marine.Take_damage_B");
            this._hurtC = this._scene.getAnimationGroupByName("Soldier_marine.Take_damage_C");
            this._shot = this._scene.getAnimationGroupByName("Soldier_marine.Combat_shoot_burst");
            this._grenade = this._scene.getAnimationGroupByName("Soldier_marine.Combat_throw_grenade");
            this._idle = this._scene.getAnimationGroupByName("Soldier_marine.Guard_idle");
            this._reload = this._scene.getAnimationGroupByName("Soldier_marine.Combat_reload_generic");
            this._run = this._scene.getAnimationGroupByName("Soldier_marine.Combat_sprint");
            this._walk = this._scene.getAnimationGroupByName("Soldier_marine.Combat_walk_aim");
            this._aim_run = this._scene.getAnimationGroupByName("Soldier_marine.Combat_run_aim");
            this._aim_idle = this._scene.getAnimationGroupByName("Soldier_marine.Combat_idle_aim");

            this._setUpAnimations();
            this._animatePlayer();

            //shooting part
            this._cooldown_fire = 0.2;
            this._damage = 15;
            TPSController._ammo = 10;
            TPSController._max_ammo = 10;

            this._camera.parent = null;
            this._camera.position = this._playerMesh.position.clone().subtract(new Vector3(0, this._cameraHeightOffset, -this._cameraDistance));
            this._camera.setTarget(this._playerMesh.position.add(this._cameraTargetOffset));
        });
    }

    private _setUpAnimations(): void {
        this._scene.stopAllAnimations();
        //initialize current and previous
        this._currentAnim = this._idle;
        this._currentAnim.loopAnimation = false;
        this._prevAnim = this._death;
    }

    private _animatePlayer(): void {
        if (this._currentAnim != null && this._prevAnim !== this._currentAnim) {
            this._prevAnim.stop();
            this._currentAnim.play(this._currentAnim.loopAnimation);
            this._prevAnim = this._currentAnim;
        }
    }

    private walk(speed: number): void {
        this._camera.speed = speed;
        if (speed === 0) {
            this.stopwalkSound();
            if (this._runSound.isPlaying) {
                this._runSound.stop();
            }
        }
    }

    private walkSound(): void {
        if (!this._walkSound.isPlaying) {
            this._runSound.stop();
            this._walkSound.play();
        }
    }

    private stopwalkSound(): void {
        if (this._walkSound.isPlaying) {
            this._walkSound.stop();
        }
    }

    private allUnpressed(): void {
        if (!this.zPressed && !this.qPressed && !this.sPressed && !this.dPressed) {
            this.walk(0);
        }
    }

    private setupFlashlight(): void {
        this._light = new SpotLight("spotLight", new Vector3(0, 1, 0), new Vector3(0, 0, 1), Math.PI / 3, 2, this._scene);
        this._light.intensity = 0;
        this._light.parent = this._camera;
    }

    private setupAllMeshes(): void {
        this._zMeshes = ["skeletonZombie", "parasiteZombie", "Ch10_primitive0", "Ch10_primitive1"];
    }
}
