import { Animation, Tools, Observer, CreateBox, RayHelper, EasingFunction, CannonJSPlugin, MeshBuilder, StandardMaterial, InstancedMesh, PointParticleEmitter, IAnimationKey, FreeCameraKeyboardMoveInput, FreeCameraMouseInput, FreeCameraTouchInput, FreeCameraGamepadInput, Axis, PointLight, PBRMetallicRoughnessMaterial, SpotLight, DirectionalLight, OimoJSPlugin, PointerEventTypes, Space, Engine, SceneLoader, Scene, Vector3, Ray, TransformNode, Mesh, Color3, Color4, UniversalCamera, Quaternion, AnimationGroup, ExecuteCodeAction, ActionManager, ParticleSystem, Texture, SphereParticleEmitter, Sound, Observable, ShadowGenerator, FreeCamera, ArcRotateCamera, EnvironmentTextureTools, Vector4, AbstractMesh, KeyboardEventTypes, int, _TimeToken, CameraInputTypes, WindowsMotionController, Camera } from "@babylonjs/core";
import { float } from "babylonjs";
import { SolidParticle } from 'babylonjs/Particles/solidParticle';
import { Boss } from "./Boss";
import { Enemy } from "./Enemy";
import { Mutant } from "./Mutant";
import { PlayerHealth } from "./PlayerHealth";
import { Zombie } from "./Zombie";
import * as cannon from 'cannon';
import { Button, Control, Rectangle, AdvancedDynamicTexture, TextBlock, Grid, StackPanel } from "@babylonjs/gui";


enum CharacterState {
    End,
    Fire,
    Idle,
    Reload,
    Run,
    Start,
    Walk,
    AimWalk,
    AimShot,
    AimIdle,
}
let prevMovementState: CharacterState = CharacterState.Idle;
let prevAimState: CharacterState = CharacterState.Idle;
let currentState: CharacterState = CharacterState.Idle;

export class FPSController {
    private _camera: FreeCamera;
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
    private _openDoorSound: Sound;
    private _keySound: Sound;
    private _doorunlockSound: Sound;
    private _lockedSound: Sound;
    private _lanternSound: Sound;
    private _plankBreak: Sound;
    private _radioSound: Sound;
    private _phoneSound: Sound;
    private _paperSound: Sound;
    private _putObjectSound: Sound;
    private _glassBottleSound: Sound;
    private _itemPickUpSound: Sound;
    private _axeSound: Sound;
    private _bookSound: Sound;
    private _appleSound: Sound;
    private _doorSlamSound: Sound;
    private _horrorViolinSound: Sound;
    private _horrorGhostTriggerSound: Sound;
    private _heartbeatSound: Sound;
    private _breathingShound: Sound;
    private _horrorSound: Sound;
    private _secretPassage1: Sound;

    //headLight
    private _light: SpotLight;
    private bougieLight: PointLight;
    private lanternLight: PointLight;
    private feu: ParticleSystem;
    //private _gun_Flash: SpotLight;

    // animation trackers
    private _currentAnim: AnimationGroup = null;
    private _prevAnim: AnimationGroup;

    //animations
    private _end: AnimationGroup;
    private _fire: AnimationGroup;
    private _idle: AnimationGroup;
    private _reload: AnimationGroup;
    private _run: AnimationGroup;
    private _start: AnimationGroup;
    private _walk: AnimationGroup;
    private _aim_walk: AnimationGroup;
    private _aim_shot: AnimationGroup;
    private _aim_idle: AnimationGroup;
    private _heal: AnimationGroup

    //Keys
    private zPressed: boolean = false;
    private qPressed: boolean = false;
    private sPressed: boolean = false;
    private shiftPressed: boolean = false;
    private dPressed: boolean = false;
    private controlPressed: boolean = false;
    private controlIPressed: int = 0;
    private rightClickPressed = false;
    private reloadPressed = false;

    //door
    private canOpenDoor1: boolean = true;
    private canOpenDoor2: boolean = false;
    private canOpenDoor3: boolean = false;
    private canOpenDoor4: boolean = false;

    //swap weapons
    private isMeleeWeapon: boolean = false;
    private canFire: boolean = false;
    private _candle: AbstractMesh;
    private _flashlight: AbstractMesh;
    private _lantern: AbstractMesh;
    private _pistol: AbstractMesh;
    private _rifle: AbstractMesh;
    private allWeapons: AbstractMesh[] = [];
    private ar15: AbstractMesh[] = [];
    private pistolet: AbstractMesh[] = [];
    private ar15names: string[] = [];
    private pistoletnames: string[] = [];


    //examining object 
    private examiningObject: boolean = false;
    private examiningObjectMesh: AbstractMesh;
    private InteractiveObject: TransformNode;
    public oil: AbstractMesh;
    public doorCpt: number = 0;
    public doorCpt2: number = 0;
    public canBreakPlanks: Boolean = false;

    //ghost
    private ghostCpt: number = 0;
    private ghostCpt2: number = 0;
    private ghostCpt3: number = 0;
    private ghostMesh1: AbstractMesh;
    private boxMesh1: Mesh;
    private boxMesh2: Mesh;
    private boxMesh12: Mesh;
    private ghostScareAnimation1: AnimationGroup;
    private ghostTauntAnimation: AnimationGroup;
    private ghostTurnRightAnimation: AnimationGroup;
    private ghostTurnLeftAnimation: AnimationGroup;
    private ghostWalkAnimation: AnimationGroup;
    private ghostTurnRightEndObserver: Observer<AnimationGroup>;
    private ghostCast01Animation: AnimationGroup;
    private ghostDodgeAnimation: AnimationGroup;
    private planksCpt: number = 5;
    private secretPassageCpt: number = 0;
    private animationEndFunction: () => void

    // firing animation flag
    private isFiring: boolean = false;

    //speed
    public walkSpeed = 1;
    public runSpeed = 1.4;



    //soon an Array of Enemy instead of a simple zombie
    constructor(scene: Scene, canvas: HTMLCanvasElement, enemy: Enemy, mutant: Mutant, boss: Boss, zombie: Zombie) {
        this._scene = scene;
        this._canvas = canvas;
        this._enemy = enemy;
        this._zombie = zombie;
        this._mutant = mutant;
        this._boss = boss;
        this.InteractiveObject = scene.getTransformNodeByName("InteractiveObject");
        this.createAllWeapons();
        this.createCandle();
        this.createController();
        this.InitCameraKeys();
        this.keyboardInput();
        this.setuplight();
        this.setupAllMeshes();
        this.handleInteraction();
        this.update();

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
        //this._empty_ammo = new Sound("emptyammo", "sounds/emptyammo.mp3", this._scene);
        this._playerHealth = new PlayerHealth(this._scene, this._weapon, 200);
        //this._reloadSound = new Sound("pistolsoundreload", "sounds/pistol-reload.mp3", this._scene);
        this._openDoorSound = new Sound("dooropen", "sounds/dooropen.mp3", this._scene);
        this._keySound = new Sound("key", "sounds/key.mp3", this._scene);
        this._doorunlockSound = new Sound("doorunlock", "sounds/doorunlock.mp3", this._scene);
        this._lockedSound = new Sound("locked", "sounds/locked.mp3", this._scene);
        this._lanternSound = new Sound("lantern", "sounds/lantern.mp3", this._scene);
        this._plankBreak = new Sound("plankbreak", "sounds/plankbreak.mp3", this._scene);
        this._radioSound = new Sound("scaryradio", "sounds/scaryradio.mp3", this._scene);
        this._bookSound = new Sound("book", "sounds/book.mp3", this._scene);
        this._axeSound = new Sound("axe", "sounds/axe.mp3", this._scene);
        this._glassBottleSound = new Sound("glassbottle", "sounds/glassbottle.mp3", this._scene);
        this._itemPickUpSound = new Sound("itempickup", "sounds/itempickup.mp3", this._scene);
        this._paperSound = new Sound("paper", "sounds/paper.mp3", this._scene);
        this._phoneSound = new Sound("phone", "sounds/phone.mp3", this._scene);
        this._putObjectSound = new Sound("putobject", "sounds/putobject.mp3", this._scene);
        this._appleSound = new Sound("apple", "sounds/apple.mp3", this._scene);
        this._doorSlamSound = new Sound("doorslam", "sounds/doorslam.mp3", this._scene);
        this._horrorViolinSound = new Sound("horrorviolin", "sounds/horrorviolin.mp3", this._scene);
        this._horrorGhostTriggerSound = new Sound("horrorghosttrigger", "sounds/horrorghosttrigger.mp3", this._scene);
        this._heartbeatSound = new Sound("heartbeat", "sounds/heartbeat.mp3", this._scene);
        this._breathingShound = new Sound("breathing", "sounds/breathing.mp3", this._scene);
        this._horrorSound = new Sound("horrorsound", "sounds/horrorsound.mp3", this._scene);
        this._secretPassage1 = new Sound("secretpassage1", "sounds/secretpassage1.mp3", this._scene);
    }
    /**
     * launched every 60ms 
     */
    private update() {
        this._scene.onReadyObservable.add(() => {
            setInterval(() => {
                if (this._cooldown_time < 99999999) {
                    this._cooldown_time += 1;
                } else {
                    this._cooldown_time = 0;
                }

                if (Enemy.hitPlayer) {
                    this.walkSpeed = 0.2;
                    this.runSpeed = 0.2;
                    this.walk(this.walkSpeed);
                } else {
                    this.walkSpeed = 1;
                    this.runSpeed = 2.2;
                }
                if (!this.isFiring && !this.isReloading) {

                    if (!this.zPressed && !this.qPressed && !this.sPressed && !this.dPressed) {
                        this.changeState(CharacterState.Idle);
                        this.stopwalkSound();
                    }

                    if (!this.shiftPressed) {
                        if (this.zPressed || this.qPressed || this.sPressed || this.dPressed && !this.isReloading) {
                            this.walk(this.walkSpeed);
                            this.walkSound();
                            this.changeState(CharacterState.Walk);
                        }
                    }

                    if (this.shiftPressed) {
                        if (this.zPressed || this.qPressed || this.sPressed || this.dPressed && !this.isReloading) {
                            this.walk(this.runSpeed);
                            this._walkSound.stop();
                            if (!this._runSound.isPlaying) {
                                this._runSound.play();
                            }
                            this.changeState(CharacterState.Run);
                        }
                    }


                    if (prevMovementState === CharacterState.AimWalk || prevMovementState === CharacterState.AimIdle) {
                        // Only transition to aim-related states if the right click is pressed
                        if (this.rightClickPressed) {
                            this.changeState(CharacterState.AimWalk);
                        } else {
                            this.changeState(CharacterState.Idle);
                        }
                    }
                }
                if (this._camera.position.x >= 20.2) {
                    if (this.doorCpt === 1 && !this.canOpenDoor2) {
                        const object = this._scene.getMeshByName("DoorHouse.002")
                        const animationDuration = 10; // Durée de l'animation en millisecondes
                        const initialRotationQuaternion = object.rotationQuaternion;
                        const initialEulerAngles = initialRotationQuaternion.toEulerAngles();
                        var targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y, initialEulerAngles.z + (Math.PI / 2)); // Ajouter 90 degrés

                        this.doorCpt++;

                        // Création de l'animation
                        const animation = new Animation(
                            'rotationAnimation', // Nom de l'animation
                            'rotationQuaternion', // Propriété à animer (rotationQuaternion)
                            60, // Nombre de frames par seconde
                            Animation.ANIMATIONTYPE_QUATERNION, // Type d'animation (quaternion)
                            Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
                        );

                        const keys = [
                            { frame: 0, value: initialRotationQuaternion }, // Frame initiale
                            { frame: animationDuration, value: Quaternion.RotationYawPitchRoll(targetEulerAngles.y, targetEulerAngles.x, targetEulerAngles.z) } // Frame finale
                        ];

                        // Ajout des frames à l'animation
                        animation.setKeys(keys);

                        // Attacher l'animation à l'objet
                        object.animations = [];
                        object.animations.push(animation);

                        // Lancer l'animation
                        this.isAnimating = true;
                        this._scene.beginAnimation(object, 0, animationDuration, false).onAnimationEnd = () => {
                            this.isAnimating = false;
                            this.ghostMesh1.setEnabled(true);
                            if (this.ghostCpt < 1) {
                                this.ghostMesh1.position.z = 37;
                                this.ghostMesh1.rotation.y = this.ghostMesh1.rotation.y - 0.52;
                            }
                        };
                        this._doorSlamSound.play();
                    }

                }
                if (this.boxMesh1.intersectsPoint(this._camera.position))//trigger ghost1
                {
                    if (this.ghostCpt === 1) {
                        if (this._camera.target.z > 188.40) {
                            this._camera.rotation.y = -1.7452;
                            this._camera.rotation.x = -0.087;
                        }
                        else if (this._camera.target.z < 186.5) {
                            this._camera.rotation.y = -1.4834;
                            this._camera.rotation.x = -0.087;
                        }
                        else {
                            this._camera.rotation.y = -1.571;
                            this._camera.rotation.x = -0.087;
                        }
                        if (this.doorCpt >= 1) {
                            this.ghostMesh1.position.z = -2;
                            this.ghostMesh1.rotation.y = this.ghostMesh1.rotation.y + 0.52;
                        }

                        this.ghostScareAnimation1.play();
                        this.animationPositionGhost(this.ghostMesh1, this.ghostMesh1.position.z, this.ghostMesh1.position.z + 39, 60, false, false);
                        this._horrorViolinSound.setVolume(3);
                        this._horrorViolinSound.play();
                        this.ghostCpt++;
                    }
                }
                if (this.boxMesh2.intersectsPoint(this._camera.position))//trigger ghost 2
                {
                    if (this.ghostCpt2 === 1) {
                        this._camera.target.x = 26.767;
                        this._camera.target.y = 2.039;
                        this._camera.target.z = 187;
                        this._camera.rotation.x = -0.0349;
                        this._camera.rotation.y = -4.71518;
                        const initialRotation = this.ghostMesh1.rotation.x;
                        const targetRotation = initialRotation + 3.14;
                        const animation = new Animation(
                            'rotationAnimation', // Nom de l'animation
                            'rotation.x', // Propriété à animer (rotationQuaternion)
                            60, // Nombre de frames par seconde
                            Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                            Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
                        );

                        const keys = [
                            { frame: 0, value: initialRotation }, // Frame initiale
                            { frame: 120, value: targetRotation } // Frame finale
                        ];

                        // Ajout des frames à l'animation
                        animation.setKeys(keys);

                        // Attacher l'animation à l'objet
                        this.ghostMesh1.animations = [];
                        this.ghostMesh1.animations.push(animation);

                        // Lancer l'animation
                        this.isAnimating = true;
                        this._scene.beginAnimation(this.ghostMesh1, 0, 120, false).onAnimationEnd = () => {
                            this.isAnimating = false;
                            this._horrorGhostTriggerSound.play();
                            this.ghostTauntAnimation.start();
                        };

                        this.disableCameraMovement();
                        this.ghostTauntAnimation.onAnimationGroupEndObservable.add(() => {
                            this.ghostTurnRightAnimation.start();
                        });

                        this.ghostCpt2++;
                    }
                }
                if (this.boxMesh12.intersectsPoint(this._camera.position))//trigger ghost.setEnabled(true)
                {
                    this.ghostMesh1.setEnabled(true);
                }
                if (this.planksCpt < -1) {
                    if (this.ghostCpt3 === 0) {
                        this.ghostMesh1.setEnabled(true);
                        this._horrorSound.play();
                        this._camera.target.x = 42.45;
                        this._camera.target.y = 2.03;
                        this._camera.target.z = 181.5;
                        this._camera.rotation.x = -0.017452;
                        this._camera.rotation.y = 3.13752;
                        this.disableCameraMovement();
                        this.ghostCpt3++;
                        var animation;
                        // Création de l'animation
                        animation = new Animation(
                            'positionAnimation', // Nom de l'animation
                            'position.z', // Propriété à animer (position.z)
                            60, // Nombre de frames par seconde
                            Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                            Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
                        );


                        // Création de la liste des frames de l'animation
                        const keys: IAnimationKey[] = [
                            { frame: 0, value: this.ghostMesh1.position.z }, // Frame initiale
                            { frame: 50, value: this.ghostMesh1.position.z + 4.2 } // Frame finale
                        ];

                        // Ajout des frames à l'animation
                        animation.setKeys(keys);


                        // Attacher l'animation à l'objet
                        this.ghostMesh1.animations = [];
                        this.ghostMesh1.animations.push(animation);
                        // Lancer l'animation
                        this._scene.beginAnimation(this.ghostMesh1, 0, 50, false).onAnimationEnd = () => {
                            //this.ghostMesh1.rotation.x-=0.55846;
                            var animation;
                            this.ghostTurnRightAnimation.onAnimationGroupEndObservable.remove(this.ghostTurnRightEndObserver);
                            animation = new Animation(
                                'rotationAnimation',
                                'rotation.x',
                                60,
                                Animation.ANIMATIONTYPE_FLOAT,
                                Animation.ANIMATIONLOOPMODE_CONSTANT
                            );


                            const keys: IAnimationKey[] = [
                                { frame: 0, value: this.ghostMesh1.rotation.x }, // Frame initiale
                                { frame: 50, value: this.ghostMesh1.rotation.x - 2.1398 } // Frame finale
                            ]

                            animation.setKeys(keys);

                            this.ghostMesh1.animations = [];
                            this.ghostMesh1.animations.push(animation);
                            this._scene.beginAnimation(this.ghostMesh1, 0, 50, false).onAnimationEnd = () => {
                                this.ghostMesh1.rotation.x = 4.712;
                                this.ghostMesh1.position.z = 37.45;
                                this.ghostWalkAnimation.play();
                                this.ghostWalkAnimation.onAnimationGroupEndObservable.add(() => {
                                    this.ghostMesh1.position.y = -8;
                                    this.ghostDodgeAnimation.play();
                                    var animation;
                                    // Création de l'animation
                                    animation = new Animation(
                                        'positionAnimation', // Nom de l'animation
                                        'position.y', // Propriété à animer (position.z)
                                        60, // Nombre de frames par seconde
                                        Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                                        Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
                                    );


                                    // Création de la liste des frames de l'animation
                                    const keys: IAnimationKey[] = [
                                        { frame: 0, value: this.ghostMesh1.position.y }, // Frame initiale
                                        { frame: 50, value: this.ghostMesh1.position.y - 30 } // Frame finale
                                    ];

                                    // Ajout des frames à l'animation
                                    animation.setKeys(keys);


                                    // Attacher l'animation à l'objet
                                    this.ghostMesh1.animations = [];
                                    this.ghostMesh1.animations.push(animation);
                                    // Lancer l'animation
                                    this._scene.beginAnimation(this.ghostMesh1, 0, 50, false).onAnimationEnd = () => {
                                        this.enableCameraMovement();
                                    }
                                })
                            };
                        };
                    }
                }
            }, 60);
        });
    }


    /**
     * create the camera which represents the player (FPS)
     */
    private createController(): void {
        this._camera = new FreeCamera("camera", new Vector3(41.836, 2.1, 158.220), this._scene);
        this._camera.rotation.x = 0;
        this._camera.rotation.y = -4.72;
        this._camera.attachControl(this._canvas, true);

        //hitbox + gravity
        this._camera.applyGravity = true;
        this._camera.checkCollisions = true;

        //define the camera as player (on his hitbox)
        this._camera.ellipsoid = new Vector3(0.7, 1, 0.7);

        //Movements
        this.InitCameraKeys();
        this._camera.minZ = 0.1; // Réduire la valeur de la 'near plane'
    }


    private enableCameraMovement(): void {
        // Réactiver les contrôles de mouvement de la caméra

        // Ajouter les contrôles de mouvement de la caméra selon vos besoins
        this._camera.attachControl(this._canvas);

        // Ajouter l'écouteur d'événement pour la capture du pointeur sur le canvas
        this._canvas.addEventListener("click", () => {
            this._canvas.requestPointerLock();
        });
    }

    private disableCameraMovement(): void {
        // Désactiver les contrôles de mouvement de la caméra

        // Supprimer les contrôles de mouvement de la caméra selon vos besoins
        this._camera.detachControl();

        // Supprimer l'écouteur d'événement pour la capture du pointeur sur le canvas
        this._canvas.removeEventListener("click", () => {
            this._canvas.requestPointerLock();
        });
    }



    // In your constructor or initialization method
    private InitCameraKeys(): void {
        this.cameraKeys = {
            up: [90], // z
            down: [83], // s
            left: [81], // q
            right: [68] // d
        };
        this.ApplyMovementRules(this._camera);
    }

    ApplyMovementRules(camera: FreeCamera): void {
        camera.keysUp = [...this.cameraKeys.up];
        camera.keysDown = [...this.cameraKeys.down];
        camera.keysLeft = [...this.cameraKeys.left];
        camera.keysRight = [...this.cameraKeys.right];
        camera.minZ = 0.1;
        camera.angularSensibility = 2000;
        camera.inertia = 0.0;
    }


    private i: int;

    // Weapon upgrades
    private swap(lastWeapon: AbstractMesh, i: string): void {
        lastWeapon.setEnabled(false);
        switch (i) {
            case "flashlight":
                this.createFlashlight();
                break;
            case "candle":
                this.createCandle();
                break;
            case "lantern":
                this.createLantern();
                break;
            case "pistol":
                this.createPistol();
                break;
            case "ar15":
                this.createRifle();
                break;
        }
    }

    private keyboardInput(): void {

        this._scene.onKeyboardObservable.add((kbInfo) => {
            // Vérifier si l'examen de l'objet est en cours
            if (this.examiningObject) {
                return; // Sortir de la fonction pour désactiver les interactions
            }
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.key) {
                        case 'z':
                            this.zPressed = true;
                            break;
                        case 's':
                            this.sPressed = true;
                            break;
                        case 'q':
                            this.qPressed = true;
                            break;
                        case 'd':
                            this.dPressed = true;
                            break;
                        case 'Shift':
                            this.shiftPressed = true;
                            break;
                        case 'r':
                            this.reload();
                            break;
                        case 'f':
                            console.log(this._weapon.getChildMeshes()[0]?.name);
                            if (this._weapon.getChildMeshes()[0]?.name === "Flashlight2_Body") {
                                if (this.lanternLight.isEnabled()) {
                                    this.lantern(false);
                                } else {
                                    this.lantern(true);
                                }
                            } if (this._weapon.getChildMeshes()[0]?.name === "Candle_Mesh") {
                                if (this.bougieLight.isEnabled()) {
                                    this.bougie(false);
                                } else {
                                    this.bougie(true);
                                }
                            } if (this._weapon.getChildMeshes()[0]?.name === "Arm_mesh001") {
                                if (this._light.isEnabled()) {
                                    this.flashlight(false);
                                } else {
                                    this.flashlight(true);
                                }
                            }
                            break;
                    }
                    break;
                case KeyboardEventTypes.KEYUP:
                    switch (kbInfo.event.key) {
                        case 'z':
                            this.zPressed = false;
                            break;
                        case 's':
                            this.sPressed = false;
                            break;
                        case 'q':
                            this.qPressed = false;
                            break;
                        case 'd':
                            this.dPressed = false;
                            break;
                        case 'Shift':
                            this.shiftPressed = false;
                            break;
                    }
            }
        });

        this._scene.onPointerObservable.add((pointerInfo) => {
            if (this.examiningObject) {
                return; // Sortir de la fonction pour désactiver les interactions
            }
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 0) {
                        if (this._cooldown_fire <= this._cooldown_time / 60) {
                            this.fire();
                            this._cooldown_time = 0;
                            if (this.rightClickPressed) {
                                this.changeState(CharacterState.AimShot); // Ajout de l'animation de tir en visée
                            } else {
                                this.changeState(CharacterState.Fire); // Ajout de l'animation de tir
                            }
                        }
                    } else if (pointerInfo.event.button === 2) {
                        this.rightClickPressed = !this.rightClickPressed;
                        if (this.rightClickPressed) {
                            this.changeState(CharacterState.AimIdle); // Ajout de l'animation de visée
                        } else {
                            this.changeState(CharacterState.Idle);
                        }

                    }
                    break;
            }
        });
    }


    private async reloadAmmo(): Promise<void> {
        await Tools.DelayAsync(1000);
        FPSController._ammo = FPSController._max_ammo;
    }


    private walkSound() {
        if (!this._walkSound.isPlaying) {
            this._runSound.stop();
            this._walkSound.play();
        }
    }
    private stopwalkSound() {
        if (this._walkSound.isPlaying)
            this._walkSound.stop();
    }

    /**
     * create the flashlight
     */
    private setuplight() {
        this._light = new SpotLight("flashlight", new Vector3(0, 1, 0), new Vector3(0, 0, 1), Math.PI / 3, 2, this._scene);
        this._light.intensity = 500;
        this._light.setEnabled(false);
        this.bougieLight = new PointLight("bougie", new Vector3(0, 2, 0), this._scene);
        this.bougieLight.intensity = 12;
        this.bougieLight.setEnabled(false);
        this.lanternLight = new PointLight("lantern", new Vector3(0, -1, 0), this._scene);
        this.lanternLight.intensity = 150;
        this.lanternLight.setEnabled(false);


        this.lanternLight.parent = this._camera;
        this._light.parent = this._camera;
        this.bougieLight.parent = this._camera;
    }

    private bougie(bool: boolean) {
        if (bool) {
            this.feu.start();
        }
        else {
            this.feu.stop();
        }
        this.bougieLight.setEnabled(bool);
    }

    private flashlight(bool: boolean) {
        this._flashlightSound.play();
        this._light.setEnabled(bool);
    }
    private lantern(bool: boolean) {
        if (bool) {
            this._lanternSound.play();
            setTimeout(() => {
                this.lanternLight.setEnabled(bool);
            }
                , 1500);
        }
        else {
            this.lanternLight.setEnabled(bool);
        }

    }



    /**
     * zombie's meshes, used to know if the zombie is hit
     */
    private setupAllMeshes() {
        this._zMeshes = ["skeletonZombie", "parasiteZombie", "Ch10_primitive0", "Ch10_primitive1"];
    }

    /**
     * @param speed velocity of the player
     * @param animation launch this animation
     */
    public walk(speed: int) {
        this._camera.speed = speed;
        if (speed == 0) {
            this.stopwalkSound();
            if (this._runSound.isPlaying) {
                this._runSound.stop();
            }

        }
    }

    /**
     * coordinate transform of enemy
     * @param vector 
     * @param mesh 
     * @returns 
     */
    private vecToLocal(vector, mesh) {
        var m = mesh.getWorldMatrix();
        var v = Vector3.TransformCoordinates(vector, m);
        return v;
    }

    //left click to fire, right click to aim, ammo managed bellow too
    private fire() {
        console.log("clique droit");
        if (this.canFire && !this.isMeleeWeapon) {
            if (this._cooldown_time / 60 >= this._cooldown_fire) {
                console.log("fire");
                var zombie = this._enemy;
                var origin = this._camera.position;
                if (FPSController._ammo > 0) {
                    FPSController._ammo -= 1;
                    this._weaponSound.play(); // sound
                    var forward = new Vector3(0, 0, 1);
                    forward = this.vecToLocal(forward, this._camera);

                    var direction = forward.subtract(origin);
                    direction = Vector3.Normalize(direction);

                    var length = 1000;

                    var ray = new Ray(origin, direction, length);

                    var hit = this._scene.pickWithRay(ray);

                    // Set animation to "fire" if it's not already playing
                    this.changeState(CharacterState.Fire);

                    for (let i = 0; i < this._zMeshes.length; i++) {
                        if (hit.pickedMesh.name == this._zMeshes[i]) {
                            switch (this._zMeshes[i]) {
                                case "skeletonZombie":
                                    this._boss.getHit(this._damage);
                                    break;
                                case "parasiteZombie":
                                    this._mutant.getHit(this._damage);
                                    break;
                                case "Ch10_primitive0" || "Ch10_primitive1":
                                    this._zombie.getHit(this._damage);
                            }
                        }
                    }
                } else {
                    this.reload();
                }
            }

            // Set the flag to prevent other animations from playing
            this.isFiring = true;

            // Wait for a short delay before resetting the flag
            setTimeout(() => {
                this.isFiring = false;
            }, 1000); // Adjust the delay as needed
        }
    }




    private isReloading: boolean = false;


    private reload(): void {
        // If we're already reloading, we do nothing
        if (this.isReloading) {
            return;
        }
    
        // We indicate that we're currently reloading
        this.isReloading = true;
        console.log("is reloading", this.isReloading);
    
        // We start the reload animation
        this.changeState(CharacterState.Reload);
        console.log("reload");
    
        // Add an observer for the end of the animation.
        this._reload.onAnimationEndObservable.addOnce(() => {
            // This code will run once the reload animation has finished
            console.log("reload finished");
            this.isReloading = false;
        });
    }
    

    private playAnimation(animation) {
        if (this.isReloading) {
            return;
        }
        console.log(animation);

        animation.play();
    }


    private async createAllWeapons(): Promise<any> {
        await this.createWeapon1();
        await this.createWeapon2();
        await this.createweapon3();
        await this.createweapon4();
        await this.createweapon5();
        await this.createweapon6();

        // Désactiver toutes les armes
        for (const weapon of this.allWeapons) {
            weapon.setEnabled(false);
        }

        // Activer la première arme (candle dans cet exemple)
        this.allWeapons[0].setEnabled(true);
        this._weapon = this.allWeapons[0];
        this.createFlareCandle(this.allWeapons[0]);
    }


    private async createWeapon1(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "candle.glb", this._scene);
        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this.allWeapons.push(env);
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);
        //animations
        this._end = this._scene.getAnimationGroupByName("Candle.Hide");
        this._idle = this._scene.getAnimationGroupByName("Candle.Idle");
        this._run = this._scene.getAnimationGroupByName("Candle.Run");
        this._start = this._scene.getAnimationGroupByName("Candle.Get");
        this._walk = this._scene.getAnimationGroupByName("Candle.Walk");
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._start.loopAnimation = false;
        this._end.loopAnimation = false;


        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }

    private async createWeapon2(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "flashlight.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this.allWeapons.push(env);
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);

        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }

    private async createweapon3(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "lantern.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this.allWeapons.push(env);
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);


        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }

    private async createweapon4(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "pistol.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this.allWeapons.push(env);
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);


        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }

    private async createweapon5(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "rifle.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this.allWeapons.push(env);
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);


        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }

    private async createweapon6(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "seringue.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this.allWeapons.push(env);
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);


        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }

    //rifle and its variables/stats
    private async createSeringue(): Promise<any> {

        this.isMeleeWeapon = false;
        this.canFire = false;

        // Désactiver toutes les armes
        for (const weapon of this.allWeapons) {
            weapon.setEnabled(false);
        }

        // Activer la première arme (candle dans cet exemple)
        this.allWeapons[4].setEnabled(true);
        this._weapon = this.allWeapons[4];

        //animations
        this._heal = this._scene.getAnimationGroupByName("Hands_Syringe.First_Aid");
        this._heal.loopAnimation = false;


        //audio effect 
        this._weaponSound = new Sound("attack", "sounds/whoosh.mp3", this._scene);
    }

    //rifle and its variables/stats
    private async createRifle(): Promise<any> {

        this.isMeleeWeapon = false;
        this.canFire = true;

        // Désactiver toutes les armes
        for (const weapon of this.allWeapons) {
            weapon.setEnabled(false);
        }

        // Activer la première arme (candle dans cet exemple)
        this.allWeapons[4].setEnabled(true);
        this._weapon = this.allWeapons[4];

        //animations
        this._end = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Hide");
        this._fire = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Shott");
        this._idle = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Idle");
        this._run = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Run");
        this._start = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Get");
        this._walk = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Walk");
        this._aim_idle = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Aim_Idle");
        this._aim_shot = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Aim_Shot");
        this._aim_walk = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Aim_Walk");
        this._reload = this._scene.getAnimationGroupByName("Hands_Automatic_rifle03.Reload");
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._start.loopAnimation = false;
        this._fire.loopAnimation = false;
        this._end.loopAnimation = false;
        this._reload.loopAnimation = false;

        //audio effect 
        this._weaponSound = new Sound("attack", "sounds/whoosh.mp3", this._scene);
    }

    //Pistol and its variables/stats
    private async createPistol(): Promise<any> {

        this.canFire = true;

        // Désactiver toutes les armes
        for (const weapon of this.allWeapons) {
            weapon.setEnabled(false);
        }

        // Activer la première arme (candle dans cet exemple)
        this.allWeapons[3].setEnabled(true);
        this._weapon = this.allWeapons[3];

        //animations
        this._end = this._scene.getAnimationGroupByName("Hands_Gun.Hide");
        this._fire = this._scene.getAnimationGroupByName("Hands_Gun.Shot");
        this._idle = this._scene.getAnimationGroupByName("Hands_Gun.Idle");
        this._run = this._scene.getAnimationGroupByName("Hands_Gun.Run");
        this._start = this._scene.getAnimationGroupByName("Hands_Gun.Get");
        this._walk = this._scene.getAnimationGroupByName("Hands_Gun.Walk");
        this._aim_idle = this._scene.getAnimationGroupByName("Hands_Gun.Aiming_Idle");
        this._aim_shot = this._scene.getAnimationGroupByName("Hands_Gun.Aiming_Shot");
        this._aim_walk = this._scene.getAnimationGroupByName("Hands_Gun.Aiming_Walk");
        this._reload = this._scene.getAnimationGroupByName("Hands_Gun.Recharge");
        this._aim_idle.loopAnimation = false;
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._start.loopAnimation = false;
        this._fire.loopAnimation = false;
        this._end.loopAnimation = false;
        this._reload.loopAnimation = false;

        //audio effect 
        this._weaponSound = new Sound("attack", "sounds/whoosh.mp3", this._scene);
    }


    //Scar and its variables/stats
    private async createCandle(): Promise<any> {
        this.isMeleeWeapon = false;
        this.canFire = false;

        // Désactiver toutes les armes
        if (this.allWeapons.length > 0) {
            for (const weapon of this.allWeapons) {
                weapon.setEnabled(false);
            }

            // Activer la première arme (candle dans cet exemple)
            this.allWeapons[0].setEnabled(true);
            this._weapon = this.allWeapons[0];
        }

    }

    //Shotgun and its variables/stats
    private async createShotgun(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "shotgun.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this._weapon = env;
        for (let i = 1; i < 9; i++) {
            result.meshes[i].renderingGroupId = 1;
        }
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);

        //audio effect 
        this._weaponSound = new Sound("shotgunsound", "sounds/shotgun.mp3", this._scene);
        this._reloadSound = new Sound("shotgunsoundreload", "sounds/shotgun-reload.mp3", this._scene);

        //animations
        this._end = this._scene.getAnimationGroupByName("Hands_Shotgun.Hide");
        this._fire = this._scene.getAnimationGroupByName("Hands_Shotgun.Shot");
        this._idle = this._scene.getAnimationGroupByName("Hands_Shotgun.Idle");
        this._reload = this._scene.getAnimationGroupByName("Hands_Shotgun.Recharge");
        this._run = this._scene.getAnimationGroupByName("Hands_Shotgun.Run");
        this._start = this._scene.getAnimationGroupByName("Hands_Shotgun.Get");
        this._walk = this._scene.getAnimationGroupByName("Hands_Shotgun.Walk");
        this._aim_walk = this._scene.getAnimationGroupByName("Hands_Shotgun.Aming_Walk");
        this._aim_shot = this._scene.getAnimationGroupByName("Hands_Shotgun.Aming_Shot");
        this._aim_idle = this._scene.getAnimationGroupByName("Hands_Shotgun.Aming_Idle");
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._aim_walk.loopAnimation = true;


        //shooting part
        this._cooldown_fire = 0.3;
        this._damage = 50;
        FPSController._ammo = 10;
        FPSController._max_ammo = 10;

        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }

    //Pistol and its variables/stats
    private async createFlashlight(): Promise<any> {

        this.isMeleeWeapon = true;
        this.canFire = false;

        // Désactiver toutes les armes
        for (const weapon of this.allWeapons) {
            weapon.setEnabled(false);
        }

        // Activer la première arme (candle dans cet exemple)
        this.allWeapons[1].setEnabled(true);
        this._weapon = this.allWeapons[1];

        //animations
        this._end = this._scene.getAnimationGroupByName("Hands_Flashlight.HIde");
        this._fire = this._scene.getAnimationGroupByName("Hands_Flashlight.Attack");
        this._idle = this._scene.getAnimationGroupByName("Hands_Flashlight.Idle");
        this._run = this._scene.getAnimationGroupByName("Hands_Flashlight.Run");
        this._start = this._scene.getAnimationGroupByName("Hands_Flashlight.Get");
        this._walk = this._scene.getAnimationGroupByName("Hands_Flashlight.Walk");
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._start.loopAnimation = false;
        this._fire.loopAnimation = false;
        this._end.loopAnimation = false;

        //audio effect 
        this._weaponSound = new Sound("attack", "sounds/whoosh.mp3", this._scene);
    }


    //Sniper and its variables/stats
    private async createLantern(): Promise<any> {

        this.isMeleeWeapon = true;
        this.canFire = false;

        // Désactiver toutes les armes
        for (const weapon of this.allWeapons) {
            weapon.setEnabled(false);
        }

        // Activer la première arme (candle dans cet exemple)
        this.allWeapons[2].setEnabled(true);
        this._weapon = this.allWeapons[2];

        //animations
        this._end = this._scene.getAnimationGroupByName("Flashlight_2.Hide");
        this._fire = this._scene.getAnimationGroupByName("Flashlight_2.Attack");
        this._idle = this._scene.getAnimationGroupByName("Flashlight_2.Idle");
        this._run = this._scene.getAnimationGroupByName("Flashlight_2.Run");
        this._start = this._scene.getAnimationGroupByName("Flashlight_2.Get");
        this._walk = this._scene.getAnimationGroupByName("Flashlight_2.Walk");
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._start.loopAnimation = false;
        this._fire.loopAnimation = false;
        this._end.loopAnimation = false;

        //audio effect 
        this._weaponSound = new Sound("attack", "sounds/snipershot.mp3", this._scene);
        this._reloadSound = new Sound("snipersoundreload", "sounds/sniper-reload.mp3", this._scene);

    }

    private changeState(newState: CharacterState) {
        // Stop the current animation
        if (newState !== currentState) {
            switch (currentState) {
                case CharacterState.End:
                    this._end?.stop();
                    break;
                case CharacterState.Fire:
                    this._fire?.stop();
                    break;
                case CharacterState.Idle:
                    this._idle?.stop();
                    break;
                case CharacterState.Reload:
                    this._reload?.stop();
                    break;
                case CharacterState.Run:
                    this._run?.stop();
                    break;
                case CharacterState.Start:
                    this._start?.stop();
                    break;
                case CharacterState.Walk:
                    this._walk?.stop();
                    break;
                case CharacterState.AimWalk:
                    this._aim_walk?.stop();
                    break;
                case CharacterState.AimShot:
                    this._aim_shot?.stop();
                    break;
                case CharacterState.AimIdle:
                    this._aim_idle?.stop();
                    break;
            }
        }
    
        // Start the new animation
        switch (newState) {
            case CharacterState.End:
                this.playAnimation(this._end);
                break;
            case CharacterState.Fire:
                this.playAnimation(this._fire);
                break;
            case CharacterState.Idle:
                this.playAnimation(this._idle);
                break;
            case CharacterState.Reload:
                this._reload.play();  // this should trigger the reloading logic
                break;
            case CharacterState.Run:
                this.playAnimation(this._run);
                break;
            case CharacterState.Start:
                this.playAnimation(this._start);
                break;
            case CharacterState.Walk:
                this.playAnimation(this._walk);
                break;
            case CharacterState.AimWalk:
                this.playAnimation(this._aim_walk);
                break;
            case CharacterState.AimShot:
                this.playAnimation(this._aim_shot);
                break;
            case CharacterState.AimIdle:
                this.playAnimation(this._aim_idle);
                break;
        }
    
        // Update the current state
        currentState = newState;
    }
    
    
    private initialPosition: Vector3 = null;
    private lastParentName: string = null;
    // Add these properties to your class
    private initialRotation: Vector3;
    private firstChild = null;
    private cameraKeys: { up: number[], down: number[], left: number[], right: number[] };

    private handleInteraction(): void {
        let interactionEnabled = true;
        this._scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN && kbInfo.event.key === 'e' || kbInfo.event.key === 'E') {
                if (interactionEnabled) {
                    if (this.mouseMoveListener) {
                        this._canvas.removeEventListener("mousemove", this.mouseMoveListener);
                        this.mouseMoveListener = null;
                        if (this.examiningObject) {
                            console.log("examining object naeme :", this.examiningObjectMesh.name);
                            if (this.examiningObjectMesh.name === "IA_Lantern_primitive0") {
                                this.examiningObjectMesh.setEnabled(false);
                                this.swap(this._weapon, "lantern");
                                this.firstChild = this._weapon;
                                this.examiningObject = false;
                                this._light.setEnabled(false);
                                this.bougieLight.setEnabled(false);

                                // Hide the examination HUD
                                //document.getElementById("examination-hud").style.display = "none";

                                this._canvas.focus();

                                // Enable camera movement
                                this.enableCameraMovement();
                            }
                            if (this.examiningObjectMesh.name === "IA_Flashlight_primitive0") {
                                this.examiningObjectMesh.setEnabled(false);
                                this.swap(this._weapon, "flashlight");
                                this.firstChild = this._weapon;
                                this.examiningObject = false;
                                this.lanternLight.setEnabled(false);
                                this.bougieLight.setEnabled(false);

                                // Hide the examination HUD
                                //document.getElementById("examination-hud").style.display = "none";

                                this._canvas.focus();

                                // Enable camera movement
                                this.enableCameraMovement();
                            }
                            if (this.examiningObjectMesh.name === "Hands_Gun") {
                                this.examiningObjectMesh.setEnabled(false);
                                this.swap(this._weapon, "pistol");
                                this.firstChild = this._weapon;
                                this.examiningObject = false;
                                this.lanternLight.setEnabled(false);
                                this.bougieLight.setEnabled(false);

                                // Hide the examination HUD
                                //document.getElementById("examination-hud").style.display = "none";

                                this._canvas.focus();

                                // Enable camera movement
                                this.enableCameraMovement();
                            }
                            if (this.examiningObjectMesh.name === "I_Key03") {
                                this.examiningObjectMesh.setEnabled(false);
                                this.examiningObject = false;
                                this.firstChild = this._weapon;
                                this.firstChild.setEnabled(true);
                                this._canvas.focus();
                                this.enableCameraMovement();
                                this.canOpenDoor2 = true;
                                this._keySound.play();
                            }
                            if (this.examiningObjectMesh.name === "IA_Axe") {
                                this.examiningObjectMesh.setEnabled(false);
                                this.examiningObject = false;
                                this.firstChild = this._weapon;
                                this.firstChild.setEnabled(true);
                                this._canvas.focus();
                                this.enableCameraMovement();
                                this.canBreakPlanks = true;
                            }
                            else {
                                if (this.examiningObjectMesh.name === "Radio") {
                                    this._radioSound.stop();
                                }
                                // If already examining an object, put it back to its initial position and rotation
                                this.examiningObjectMesh.parent = this._scene.getTransformNodeByName(this.lastParentName);
                                this.examiningObjectMesh.position = this.initialPosition;
                                this.examiningObjectMesh.rotation = this.initialRotation;
                                this.examiningObject = false;

                                this.firstChild.setEnabled(true);

                                // Hide the examination HUD
                                //document.getElementById("examination-hud").style.display = "none";

                                this._canvas.focus();

                                // Enable camera movement
                                this.enableCameraMovement();
                            }
                        }
                    } else {

                        //distance of the ray
                        const maxDistance = 5;

                        // Calculate the forward direction from the camera
                        const forward = this._camera.getForwardRay().direction;

                        // Create a ray from the camera position in the forward direction
                        const ray = new Ray(this._camera.position, forward, maxDistance);

                        // Perform a raycast to check for intersections with objects in the scene
                        const pickInfo = this._scene.pickWithRay(ray);

                        // Check if an object was picked
                        if (pickInfo.hit) {
                            console.log(pickInfo.pickedMesh);
                            // Check if an object was picked and if it can be examined
                            if (pickInfo && pickInfo.hit && this.canExamineObject(pickInfo.pickedMesh)) {
                                const pickedObject = pickInfo.pickedMesh;
                                this.examiningObjectMesh = pickedObject;
                                this.initialPosition = pickedObject.position.clone();
                                this.initialRotation = pickedObject.rotation.clone();
                                this.lastParentName = pickedObject.parent.name;

                                // Perform the desired interaction with the picked object
                                this.examineObject(pickedObject);
                                this.moveObject(pickedObject);

                                // Show the examination HUD
                                //document.getElementById("examination-hud").style.display = "block";

                                // Lock the pointer and hide the cursor
                                this._canvas.requestPointerLock();
                                this.examiningObject = true;

                                // Disable camera movement
                                this.disableCameraMovement();
                            }


                            if (pickInfo && pickInfo.hit && this.canExamineDrawer(pickInfo.pickedMesh)) {
                                if (!pickInfo.pickedMesh.name.includes("ChestOfDrawers_mesh") && !pickInfo.pickedMesh.name.includes("ChestOfDrawers_mesh.001") && !pickInfo.pickedMesh.name.includes("ChestOfDrawers_mesh.002")) {
                                    const pickedObject = pickInfo.pickedMesh;
                                    console.log(pickedObject.name);
                                    if (this.isOpen) {
                                        this.closeChestOfDrawers(pickedObject);
                                        if (pickedObject.name === "Drawer1") {
                                            if (this.oilOpen) {
                                                this.closeOil();
                                                this.oilOpen = false;
                                                this.isOpen = false;
                                            }
                                        }
                                        if (pickedObject.name === "Drawer1.002") {
                                            if (this.batteryFlashlightOpen) {
                                                this.closeBattery();
                                                this.closeFlashlight();
                                                this.batteryFlashlightOpen = false;
                                                this.isOpen = false;
                                            }

                                        }
                                        else {
                                            this.isOpen = false;
                                        }


                                    } else {
                                        this.openChestOfDrawers(pickedObject);
                                        if (pickedObject.name === "Drawer1") {
                                            {
                                                if (!this.oilOpen) {
                                                    this.openOil();
                                                    this.oilOpen = true;
                                                    this.isOpen = true;
                                                }
                                            }
                                        }
                                        if (pickedObject.name === "Drawer1.002") {
                                            if (!this.batteryFlashlightOpen) {
                                                this.openBattery();
                                                this.openFlashlight();
                                                this.batteryFlashlightOpen = true;
                                                this.isOpen = true;
                                            }
                                        }
                                        else {
                                            this.isOpen = true;
                                        }

                                    }
                                }
                            }
                            if (pickInfo && pickInfo.hit && this.canExamineDoor(pickInfo.pickedMesh)) {
                                this.openDoor(pickInfo.pickedMesh);
                            }
                            if (pickInfo && pickInfo.hit && this.canExaminePlanks(pickInfo.pickedMesh) && this.canBreakPlanks) {
                                pickInfo.pickedMesh.setEnabled(false);
                                this._plankBreak.setVolume(0.2);
                                this._plankBreak.play();
                                this.planksCpt--;
                                if (this.planksCpt < 1) {
                                    console.log("no planks left");
                                }
                            }
                            if (this.ar15names.includes(pickInfo.pickedMesh.name)) {
                                this.swap(this._weapon, "ar15");
                            }
                            if (this.pistoletnames.includes(pickInfo.pickedMesh.name)) {
                                this.swap(this._weapon, "pistol");
                            }
                        }
                    }
                    interactionEnabled = false;
                    setTimeout(() => {
                        interactionEnabled = true; // Réactiver les interactions après le délai
                    }, 100);
                }
            }
        });
    }

    public openDoorAtStart() {
        if (this.doorCpt2 === 0) {
            var door2 = this._scene.getMeshByName("DoorHouse.002");
            var rotationQuaternion = door2.rotationQuaternion.clone();
            var rotationEulerAngles = rotationQuaternion.toEulerAngles();
            rotationEulerAngles = new Vector3(rotationEulerAngles.x, rotationEulerAngles.y, rotationEulerAngles.z - (Math.PI / 2));
            door2.rotationQuaternion = Quaternion.FromEulerAngles(rotationEulerAngles.x, rotationEulerAngles.y, rotationEulerAngles.z);
            this.doorCpt2++;
        }
    }

    public async spawnGhost1() {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "ghost.glb", this._scene);
        this.ghostMesh1 = result.meshes[0];
        this.ghostMesh1.name = "ghost1";
        this.ghostMesh1.parent = this._scene.getMeshByName("Wall5X_WindowHole_CLR_primitive0");
        console.log(this.ghostMesh1.rotation.y);
        result.meshes[0].position = new Vector3(-0.5, 2.5, -2);
        result.meshes[0].rotation = new Vector3(0, 0.52, 1.57);
        result.meshes[0].scaling = new Vector3(1.1, 1.2, -1);
        console.log(this.ghostMesh1.rotation.y);
        this.ghostScareAnimation1 = this._scene.getAnimationGroupByName("Weeper_DEMO.Cast02end");
        this.ghostCast01Animation = this._scene.getAnimationGroupByName("Weeper_DEMO.Cast01");
        this.ghostTauntAnimation = this._scene.getAnimationGroupByName("Weeper_DEMO.Taunt");
        this.ghostTurnRightAnimation = this._scene.getAnimationGroupByName("Weeper_DEMO.TurnRight");
        this.ghostTurnLeftAnimation = this._scene.getAnimationGroupByName("Weeper_DEMO.TurnLeft");
        this.ghostWalkAnimation = this._scene.getAnimationGroupByName("Weeper_DEMO.Walk");
        this.ghostDodgeAnimation = this._scene.getAnimationGroupByName("Weeper_DEMO.Dodge");
        this.ghostWalkAnimation.speedRatio = 4;
        this.ghostCast01Animation.loopAnimation = false;
        this.ghostWalkAnimation.loopAnimation = false;
        this.ghostDodgeAnimation.loopAnimation = false;
        this.ghostTurnRightEndObserver = this.ghostTurnRightAnimation.onAnimationGroupEndObservable.add(() => {
            this.animationPositionGhost2(this.ghostMesh1, this.ghostMesh1.position.y, this.ghostMesh1.position.y - 14.5, 60, false, true);
        });
    }


    public spawnboxTrigger1() {
        this.boxMesh1 = MeshBuilder.CreateBox("triggerbox1");
        this.boxMesh1.position.x = -2;
        this.boxMesh1.position.y = 0;
        this.boxMesh1.position.z = 1;
        this.boxMesh1.scaling.x = 1;
        this.boxMesh1.scaling.y = 4;
        this.boxMesh1.scaling.z = 3;
        this.boxMesh1.visibility = 0;
        this.boxMesh1.parent = this._scene.getMeshByName("VictorianRug (2)");
    }

    public spawnboxTrigger2() {
        this.boxMesh2 = MeshBuilder.CreateBox("triggerbox2");
        this.boxMesh2.visibility = 0;
        this.boxMesh2.position.x = -6.4;
        this.boxMesh2.position.y = 0;
        this.boxMesh2.position.z = 1;
        this.boxMesh2.scaling.x = 1;
        this.boxMesh2.scaling.y = 5;
        this.boxMesh2.scaling.z = 3;
        this.boxMesh2.parent = this._scene.getMeshByName("Rug");
    }

    public spawnboxTrigger12() {
        this.boxMesh12 = MeshBuilder.CreateBox("triggerbox12");
        this.boxMesh12.visibility = 0;
        this.boxMesh12.position.x = -3;
        this.boxMesh12.position.y = 0;
        this.boxMesh12.position.z = 1;
        this.boxMesh12.scaling.x = 4;
        this.boxMesh12.scaling.y = 6;
        this.boxMesh12.scaling.z = 2;
        this.boxMesh12.parent = this._scene.getMeshByName("WashingMachine");
    }





    private isAnimating = false;
    private isOpen = false;
    private oilOpen = false;
    private batteryFlashlightOpen = false;

    private openChestOfDrawers(pickedObject: AbstractMesh) {
        if (this.isAnimating) {
            return; // Si une animation est déjà en cours, ne commencez pas une nouvelle animation
        }

        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialX = pickedObject.position.x; // Position initiale de l'objet
        const targetX = 1; // Position finale de l'ouverture du tiroir
        this.animationPosition(pickedObject, initialX, targetX, animationDuration, true, false);
    }

    private closeChestOfDrawers(pickedObject: AbstractMesh) {
        if (this.isAnimating) {
            return; // Si une animation est déjà en cours, ne commencez pas une nouvelle animation
        }

        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialX = pickedObject.position.x; // Position initiale de l'objet
        const targetX = 0.2; // Position finale de la fermeture du tiroir
        this.animationPosition(pickedObject, initialX, targetX, animationDuration, true, false);
    }


    private mouseMoveListener: (event: MouseEvent) => void = null;

    private examineObject(object: AbstractMesh): void {// Calculate the new position for the object based on the camera's position and direction
        // hide the hands
        //this.firstChild = this._camera.getChildren(node => node.name === "__root__")[0];
        this.firstChild = this._weapon;
        this.firstChild.setEnabled(false);
        // Make the object a child of the camera during examination
        object.parent = this._camera;
        object.position = new Vector3(0, 0, 0.5);
        object.scaling.z = Math.abs(object.scaling.z) * -1;

        if (object.name === "Radio") {
            this._radioSound.play();
        }
        if (object.name === "Paper_01" || object.name === "PaperBent_A") {
            this._paperSound.play();
        }
        if (object.name === "IC_PetrolOilBottle") {
            this._glassBottleSound.play();
        }
        if (object.name === "Budha") {
            this._putObjectSound.play();
        }
        if (object.name === "Telephone01") {
            this._phoneSound.play();
        }
        if (object.name === "IH_Apple" || object.name === "IH_Banana") {
            this._appleSound.play();
        }
        if (object.name === "IA_Axe") {
            this._axeSound.play();
        }
        if (object.name === "IR_Battery01" || object.name === "IR_Battery01 (1)") {
            this._itemPickUpSound.play();
        }
        if (object.name === "Book_01.001" || object.name === "Book_03.001" || object.name === "Book_04.001") {
            this._bookSound.play();
        }

        if (object.name === "Book_02.001" && this.secretPassageCpt === 0) {
            this._bookSound.play();
            this._secretPassage1.play();
            const mesh = this._scene.getMeshByName("Bookshelf_Big.001")
            const initialRotationQuaternion = mesh.rotationQuaternion;
            const initialEulerAngles = initialRotationQuaternion.toEulerAngles();
            var targetEulerAngles = new Vector3(initialEulerAngles.x + (90 / 57.3), initialEulerAngles.y + (90 / 57.3), initialEulerAngles.z + (90 / 57.3)); // Ajouter 90 degrés
            // Création de l'animation
            const animation = new Animation(
                'rotationAnimation', // Nom de l'animation
                'rotationQuaternion', // Propriété à animer (rotationQuaternion)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_QUATERNION, // Type d'animation (quaternion)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );

            const keys = [
                { frame: 0, value: initialRotationQuaternion }, // Frame initiale
                { frame: 260, value: Quaternion.RotationYawPitchRoll(targetEulerAngles.y, targetEulerAngles.x, targetEulerAngles.z) } // Frame finale
            ];

            // Ajout des frames à l'animation
            animation.setKeys(keys);

            // Attacher l'animation à l'objet
            mesh.animations = [];
            mesh.animations.push(animation);

            // Lancer l'animation
            this._scene.beginAnimation(mesh, 0, 260, false).onAnimationEnd = () => {
                mesh.checkCollisions = false;
                this._scene.getTransformNodeByName("Bookshelf_Books.004").setEnabled(false);
                this._scene.getMeshByName("Chalice").setEnabled(false);
            }
            this.secretPassageCpt++;
        }

        this.examiningObject = true;
    }

    private moveObject(object: AbstractMesh): void {
        // Enable pointer events for the canvas
        this._canvas.style.pointerEvents = "all";

        // Add pointer event listeners for mouse movement
        const mouseMoveListener = (event: MouseEvent) => {
            // Check if the pointer is locked and if the object is being examined
            if (document.pointerLockElement === this._canvas && this.examiningObject) {
                // Perform rotation based on the mouse movement
                object.rotate(Axis.Y, event.movementX * 0.01, Space.WORLD);
                object.rotate(Axis.X, event.movementY * 0.01, Space.WORLD);

            }
        };

        this.mouseMoveListener = mouseMoveListener;
        this._canvas.addEventListener("mousemove", mouseMoveListener);

    }

    private canExamineObject(object: AbstractMesh): boolean {
        let parent = object.parent;

        // Iterate through the parents up to three levels
        for (let i = 0; i < 2; i++) {
            if (!parent || !parent.name) {
                // No more parents to check, exit the loop
                break;
            }

            // Check if the parent's name is in the allowed list
            if (["Examine", "Interact", "Items", "Lamps"].includes(parent.name)) {
                return true;
            }
            if (this.ar15names.includes(object.name)) {
                return false;
            }
            if (this.pistoletnames.includes(object.name)) {
                return false;
            }

            // Move up to the next parent
            parent = parent.parent;
        }

        // None of the parents have an allowed name, cannot examine the object
        return false;
    }

    private canExamineDrawer(object: AbstractMesh): boolean {
        let parent = object.parent;
        // Iterate through the parents up to three levels
        for (let i = 0; i < 2; i++) {
            if (!parent || !parent.name) {
                // No more parents to check, exit the loop
                break;
            }

            // Check if the parent's name is in the allowed list
            if (["ChestOfDrawers", "ChestOfDrawers.001", "ChestOfDrawers.002"].includes(parent.name)) {
                return true;
            }

            // Move up to the next parent
            parent = parent.parent;
        }

        // None of the parents have an allowed name, cannot examine the object
        return false;
    }

    private openDoor(pickedObject: AbstractMesh) {
        if (this.isAnimating || (pickedObject.name !== "DoorHouse.002" && pickedObject.name !== "DoorHouse.004" &&
            pickedObject.name !== "Door.001" && pickedObject.name !== "OldDoor.001")) {
            return;
        }

        const animationDuration = 60; // Durée de l'animation en millisecondes
        const initialRotationQuaternion = pickedObject.rotationQuaternion;
        const initialEulerAngles = initialRotationQuaternion.toEulerAngles();
        let targetEulerAngles: Vector3;
        if (pickedObject.name === "DoorHouse.004") {
            if (this.canOpenDoor1) {
                if (initialEulerAngles.z > -3) {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y, initialEulerAngles.z + (Math.PI / 2)); // Ajouter 90 degrés
                    this._openDoorSound.play();
                }

                else {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y, initialEulerAngles.z + (3 * (Math.PI / 2))); // Soustraire 90 degrés
                    this._openDoorSound.play();
                }
            }
            else {
                this._lockedSound.play();
                return;
            }
        }

        if (pickedObject.name === "DoorHouse.002") {
            if (this.canOpenDoor2) {
                if (initialEulerAngles.z > 1) {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y, initialEulerAngles.z - (Math.PI / 2)); // Soustraire 90 degrés
                    this._openDoorSound.play();
                } else {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y, initialEulerAngles.z + (Math.PI / 2)); // Ajouter 90 degrés
                    this._openDoorSound.play();
                }
            } else {
                this._lockedSound.play();
                return;
            }
        }

        if (pickedObject.name === "Door.001") {
            if (this.canOpenDoor3) {
                if (initialEulerAngles.z < 2) {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y, initialEulerAngles.z + (Math.PI / 2)); // Ajouter 90 degrés
                    this._openDoorSound.play();
                } else {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y, initialEulerAngles.z - (Math.PI / 2)); // Soustraire 90 degrés
                    this._openDoorSound.play();
                }
            }
            else {
                this.createPuzzleGame();
                this._lockedSound.play();
                return;
            }
        }
        if (pickedObject.name === "OldDoor.001") {
            if (this.canOpenDoor4) {
                if (initialEulerAngles.y < 1) {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y + (Math.PI / 2), initialEulerAngles.z); // Ajouter 90 degrés
                    this._openDoorSound.play();
                } else {
                    targetEulerAngles = new Vector3(initialEulerAngles.x, initialEulerAngles.y - (Math.PI / 2), initialEulerAngles.z); // Soustraire 90 degrés
                    this._openDoorSound.play();
                }
            }
            else {
                this._lockedSound.play();
                return;
            }
        }

        // Création de l'animation
        const animation = new Animation(
            'rotationAnimation', // Nom de l'animation
            'rotationQuaternion', // Propriété à animer (rotationQuaternion)
            60, // Nombre de frames par seconde
            Animation.ANIMATIONTYPE_QUATERNION, // Type d'animation (quaternion)
            Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
        );

        const keys = [
            { frame: 0, value: initialRotationQuaternion }, // Frame initiale
            { frame: animationDuration, value: Quaternion.RotationYawPitchRoll(targetEulerAngles.y, targetEulerAngles.x, targetEulerAngles.z) } // Frame finale
        ];

        // Ajout des frames à l'animation
        animation.setKeys(keys);

        // Attacher l'animation à l'objet
        pickedObject.animations = [];
        pickedObject.animations.push(animation);

        // Lancer l'animation
        this.isAnimating = true;
        this._scene.beginAnimation(pickedObject, 0, animationDuration, false).onAnimationEnd = () => {
            this.isAnimating = false;
        };
    }


    private canExamineDoor(object: AbstractMesh): boolean {
        let parent = object.parent;

        // Iterate through the parents up to two levels
        for (let i = 0; i < 2; i++) {
            if (!parent || !parent.name) {
                // No more parents to check, exit the loop
                break;
            }
            // Check if the parent's name is in the allowed list
            if (["Door02 (3)", "Door02.001", "OldDoor", "Door02_Jammed"].includes(parent.name)) {
                return true;
            }

            // Move up to the next parent
            parent = parent.parent;
        }
        return false;
    }

    private createFlareCandle(candleMesh: AbstractMesh) {
        this.feu = new ParticleSystem("feu", 2000, this._scene);

        this.feu.particleTexture = new Texture("sprites/flare2.png", this._scene);

        // Create a small, invisible box
        let emitterBox = MeshBuilder.CreateBox("emitterBox", { size: 0.1 }, this._scene);
        emitterBox.isVisible = false;

        // Attach it to the candle
        emitterBox.parent = candleMesh;

        // Position it slightly in front and above the candle
        emitterBox.position = new Vector3(0.13, 1.63, -0.63);

        // Use the box as the emitter
        this.feu.emitter = emitterBox;

        // Create a point emitter
        var emitter = new PointParticleEmitter();
        emitter.direction1 = new Vector3(0.0, 0.2, 0.0);
        emitter.direction2 = new Vector3(0.0, 0.3, 0.0);
        // Use the point as the emitter
        this.feu.particleEmitterType = emitter;

        // Configure other particle system properties
        // Colors of a real flame
        this.feu.color1 = new Color4(1.0, 1.0, 0.0, 1.0);
        this.feu.color2 = new Color4(1.0, 0.66, 0.66, 1.0);
        this.feu.colorDead = new Color4(1.0, 0.22, 0.22, 0.2);

        this.feu.minSize = 0.01; // Smaller particles for a finer flame
        this.feu.maxSize = 0.03; // Smaller particles for a finer flame


        this.feu.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        this.feu.gravity = new Vector3(0, -0.5, 0);

        this.feu.minAngularSpeed = 0;
        this.feu.maxAngularSpeed = Math.PI;

        this.feu.minLifeTime = 0.02; // Shorter lifetime for particles
        this.feu.maxLifeTime = 0.1; // Shorter lifetime for particles

        this.feu.emitRate = 700; // Lower emission rate

        this.feu.updateSpeed = 0.01; // Faster update speed


        this.feu.minEmitPower = 0.5;
        this.feu.maxEmitPower = 1.5;

    }

    public diableCarpet() {
        const rugNames = ["VictorianRug", "VictorianRug (1)", "VictorianRug (2)"];
        const instancedMeshes = [];

        rugNames.forEach((name) => {
            const instancedMesh = this._scene.getMeshByName(name) as InstancedMesh;
            if (instancedMesh) {
                instancedMeshes.push(instancedMesh);
            }
        });

        // Set collision to false for each InstancedMesh
        instancedMeshes.forEach((instancedMesh) => {
            instancedMesh.checkCollisions = false;
        });
    }


    private createPuzzleGame(): void {
        // Create a 2D advanced texture to hold the GUI controls
        let advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        let isHUDVisible = true;


        // Create a grid to hold the buttons
        let grid = new Grid();
        grid.width = "250px";
        grid.height = "220px";
        grid.addColumnDefinition(1);
        grid.addColumnDefinition(1);
        grid.addColumnDefinition(1);
        grid.addRowDefinition(1);
        grid.addRowDefinition(1);
        grid.addRowDefinition(1);
        grid.addRowDefinition(1);
        grid.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        grid.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        advancedTexture.addControl(grid);

        // The code that the user needs to enter
        const correctCode = "3223";

        // The code that the user has entered
        let enteredCode = "";

        // TextBlock to display the entered code
        let codeDisplay = new TextBlock();
        codeDisplay.text = "";
        codeDisplay.color = "white";  // Change color to white
        codeDisplay.fontSize = 36;     // Increase font size to 36
        codeDisplay.height = "40px";
        codeDisplay.width = "220px";
        codeDisplay.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        advancedTexture.addControl(codeDisplay);

        // TextBlock pour afficher les messages
        let messageDisplay = new TextBlock();
        messageDisplay.text = "";
        messageDisplay.color = "white";
        messageDisplay.fontSize = 18;
        messageDisplay.height = "40px";
        messageDisplay.width = "220px";
        messageDisplay.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        messageDisplay.top = "-50px";
        advancedTexture.addControl(messageDisplay);


        // Add buttons in a grid layout
        let buttonValues = [
            ['7', '8', '9'],
            ['4', '5', '6'],
            ['1', '2', '3'],
            ['Clear', '0', 'Enter']
        ];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                let button = Button.CreateSimpleButton("button" + buttonValues[i][j], buttonValues[i][j]);
                button.width = "80px";
                button.height = "50px";
                button.color = "white";
                button.background = "black";
                button.paddingTop = "10px";
                button.paddingBottom = "10px";
                button.paddingLeft = "10px";
                button.paddingRight = "10px";

                // Add an animation when a character is entered
                var animation = new Animation("buttonClickAnimation", "scaleX", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
                var keys = [];
                keys.push({ frame: 0, value: 1 });
                keys.push({ frame: 10, value: 0.9 });
                keys.push({ frame: 20, value: 1 });
                animation.setKeys(keys);
                button.animations = button.animations || [];
                button.animations.push(animation);
                this._scene.beginAnimation(button, 0, 20, false);


                button.onPointerUpObservable.add(() => {
                    // If the button value is a digit, add it to the entered code
                    if (buttonValues[i][j] >= '0' && buttonValues[i][j] <= '9') {
                        enteredCode += buttonValues[i][j];
                        codeDisplay.text = enteredCode;
                        messageDisplay.text = "Entered number " + buttonValues[i][j];
                    }

                    // If the button value is 'Clear', remove the last digit from the entered code
                    if (buttonValues[i][j] === 'Clear') {
                        enteredCode = enteredCode.slice(0, -1);
                        codeDisplay.text = enteredCode;
                        messageDisplay.text = "Cleared last digit";
                    }

                    // Afficher les messages dans le TextBlock messageDisplay
                    // If the button value is 'Enter', check if the entered code is correct
                    if (buttonValues[i][j] === 'Enter') {
                        if (enteredCode === correctCode) {
                            messageDisplay.text = "Correct code entered!";
                            this._doorunlockSound.play();
                            // Déverrouiller la porte
                            this.canOpenDoor3 = true;
                            isHUDVisible = false; // Hide the HUD
                            this.disableHUD(grid, codeDisplay, messageDisplay);
                        } else {
                            messageDisplay.text = "Incorrect code. Try again.";
                        }
                        // Réinitialiser le code entré
                        enteredCode = "";
                        codeDisplay.text = enteredCode;
                    }
                });
                grid.addControl(button, i, j);
            }
        }

        // Add keydown event listener
        window.addEventListener("keydown", (event) => {
            // If the pressed key is a digit, add it to the entered code
            if (event.key >= '0' && event.key <= '9') {
                enteredCode += event.key;
                codeDisplay.text = enteredCode;
                console.log("Entered number " + event.key);
            }

            // If the pressed key is Backspace, remove the last digit from the entered code
            if (event.key === 'Backspace') {
                enteredCode = enteredCode.slice(0, -1);
                codeDisplay.text = enteredCode;
                console.log("Cleared last digit");
            }

            // If the pressed key is Escape, clear the entered code
            if (event.key === 'Escape') {
                enteredCode = "";
                codeDisplay.text = enteredCode;
                console.log("Code reset");
            }

            if (event.key === 'Enter') {
                if (enteredCode === correctCode) {
                    messageDisplay.text = "Correct code entered!";
                    this._doorunlockSound.play();
                    // Déverrouiller la porte
                    this.canOpenDoor3 = true;
                    isHUDVisible = false; // Hide the HUD
                    this.disableHUD(grid, codeDisplay, messageDisplay);
                } else {
                    messageDisplay.text = "Incorrect code. Try again.";
                }
                // Réinitialiser le code entré
                enteredCode = "";
                codeDisplay.text = enteredCode;
            }
            if (event.key === 'Z' || event.key === 'Q' || event.key === 'D' || event.key === 'S') {
                isHUDVisible = false; // Hide the HUD
                this.disableHUD(grid, codeDisplay, messageDisplay);
            }
        });
    }

    private disableHUD(grid: Grid, codeDisplay: TextBlock, messageDisplay: TextBlock) {
        grid.isVisible = false;
        codeDisplay.isVisible = false;
        setTimeout(() => {
            messageDisplay.isVisible = false;
        }, 2000);

    }


    private openOil() {
        const object = this._scene.getMeshByName("IC_OilBottle");
        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialZ = 200.746337890625; // Position initiale de l'objet
        console.log(initialZ);
        const targetZ = 201.246337890625; // Position finale de l'ouverture du tiroir
        this.animationPosition(object, initialZ, targetZ, animationDuration, false, false);
    }

    private closeOil() {
        const object = this._scene.getMeshByName("IC_OilBottle");
        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialZ = 201.246337890625; // Position initiale de l'objet
        console.log(initialZ);
        const targetZ = 200.746337890625; // Position finale de l'ouverture du tiroir

        this.animationPosition(object, initialZ, targetZ, animationDuration, false, false);
    }

    private openBattery() {
        const object = this._scene.getMeshByName("IR_Battery01");
        const object2 = this._scene.getMeshByName("IR_Battery01 (1)");
        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialX = -44.3411504765749; // Position initiale de l'objet
        const targetX = -43.8411504765749; // Position finale de l'ouverture du tiroir

        this.animationPosition(object, initialX, targetX, animationDuration, true, false);
        this.animationPosition(object2, initialX, targetX, animationDuration, true, false);
    }

    private closeBattery() {
        const object = this._scene.getMeshByName("IR_Battery01");
        const object2 = this._scene.getMeshByName("IR_Battery01 (1)");
        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialX = -43.8411504765749; // Position initiale de l'objet
        const targetX = -44.3411504765749; // Position finale de l'ouverture du tiroir

        this.animationPosition(object, initialX, targetX, animationDuration, true, false);
        this.animationPosition(object2, initialX, targetX, animationDuration, true, false);
    }


    private openFlashlight() {
        const object = this._scene.getMeshByName("IA_Flashlight_primitive0");
        const object2 = this._scene.getMeshByName("IA_Flashlight_primitive1");
        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialPosition = 0;
        const targetPosition = 0.20;

        this.animationPosition(object, initialPosition, targetPosition, animationDuration, true, false);
        this.animationPosition(object2, initialPosition, targetPosition, animationDuration, true, false);
    }

    private closeFlashlight() {
        const object = this._scene.getMeshByName("IA_Flashlight_primitive0");
        const object2 = this._scene.getMeshByName("IA_Flashlight_primitive1");
        const animationDuration = 20; // Durée de l'animation en millisecondes

        const initialPosition = 0.20;
        const targetPosition = 0;

        this.animationPosition(object, initialPosition, targetPosition, animationDuration, true, false);
        this.animationPosition(object2, initialPosition, targetPosition, animationDuration, true, false);
    }

    /**
 * 
 * @param pickedObject 
 * @param initialPosition 
 * @param targetPosition 
 * @param animationDuration 
 * @param x boolean pour savoir s'il move sur cet axe
 * @param y boolean pour savoir s'il move sur cet axe
 * dans le cas z, x et y seront false
 */
    private animationPosition(pickedObject: AbstractMesh, initialPosition: number, targetPosition: number, animationDuration, x: boolean, y: boolean) {
        var animation;
        if (x) {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.x', // Propriété à animer (position.x)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }
        else if (y) {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.y', // Propriété à animer (position.y)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }
        else {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.z', // Propriété à animer (position.z)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }



        // Création de la liste des frames de l'animation
        const keys: IAnimationKey[] = [
            { frame: 0, value: initialPosition }, // Frame initiale
            { frame: animationDuration, value: targetPosition } // Frame finale
        ];

        // Ajout des frames à l'animation
        animation.setKeys(keys);

        // Attacher l'animation à l'objet
        pickedObject.animations = [];
        pickedObject.animations.push(animation);

        // Lancer l'animation
        this.isAnimating = true;
        this._scene.beginAnimation(pickedObject, 0, animationDuration, false).onAnimationEnd = () => {
            this.isAnimating = false;
        };
    }

    private animationPositionGhost(pickedObject: AbstractMesh, initialPosition: number, targetPosition: number, animationDuration, x: boolean, y: boolean) {
        var animation;
        if (x) {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.x', // Propriété à animer (position.x)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }
        else if (y) {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.y', // Propriété à animer (position.y)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }
        else {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.z', // Propriété à animer (position.z)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }



        // Création de la liste des frames de l'animation
        const keys: IAnimationKey[] = [
            { frame: 0, value: initialPosition }, // Frame initiale
            { frame: animationDuration, value: targetPosition } // Frame finale
        ];

        // Ajout des frames à l'animation
        animation.setKeys(keys);

        // Attacher l'animation à l'objet
        pickedObject.animations = [];
        pickedObject.animations.push(animation);

        // Lancer l'animation
        this.isAnimating = true;
        this._scene.beginAnimation(pickedObject, 0, animationDuration, false).onAnimationEnd = () => {
            this.isAnimating = false;
            if (this.doorCpt < 1) {
                pickedObject.setEnabled(false);
            }
            else {
                pickedObject.setEnabled(true);
            }

            this.ghostMesh1.rotation.y = 0;
            this._heartbeatSound.play();
            this.enableCameraMovement();
        };
    }

    private animationPositionGhost2(pickedObject: AbstractMesh, initialPosition: number, targetPosition: number, animationDuration, x: boolean, y: boolean) {
        var animation;
        if (x) {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.x', // Propriété à animer (position.x)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }
        else if (y) {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.y', // Propriété à animer (position.y)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }
        else {
            // Création de l'animation
            animation = new Animation(
                'positionAnimation', // Nom de l'animation
                'position.z', // Propriété à animer (position.z)
                60, // Nombre de frames par seconde
                Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
                Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
            );
        }



        // Création de la liste des frames de l'animation
        const keys: IAnimationKey[] = [
            { frame: 0, value: initialPosition }, // Frame initiale
            { frame: animationDuration, value: targetPosition } // Frame finale
        ];

        // Ajout des frames à l'animation
        animation.setKeys(keys);

        // Attacher l'animation à l'objet
        pickedObject.animations = [];
        pickedObject.animations.push(animation);

        // Lancer l'animation
        this.isAnimating = true;
        this._scene.beginAnimation(pickedObject, 0, animationDuration, false).onAnimationEnd = () => {
            this.isAnimating = false;
            pickedObject.setEnabled(false);
            this._breathingShound.setVolume(3);
            this._breathingShound.play();
            this.enableCameraMovement();
            this.ghostMesh1.rotation.x -= 1, 396;
            this.ghostMesh1.position.z -= 4;
        };
    }


    private canExaminePlanks(object: AbstractMesh): boolean {
        let parent = object.parent;
        for (let i = 0; i < 2; i++) {
            if (!parent || !parent.name) {
                // No more parents to check, exit the loop
                break;
            }
            // Check if the parent's name is in the allowed list
            if (["Plank", "Plank (1)", "Plank (2)", "Plank (3)", "Plank (4)"].includes(object.name)) {
                return true;
            }

            // Move up to the next parent
            parent = parent.parent;
        }
        return false;
    }

    public getMeshWeapons() {

        // Obtenir les meshes
        var ar15_primitive0 = this._scene.getMeshByName("ar15_primitive0");
        var ar15_primitive1 = this._scene.getMeshByName("ar15_primitive1");
        var ar15_primitive2 = this._scene.getMeshByName("ar15_primitive2");
        var ar15_primitive3 = this._scene.getMeshByName("ar15_primitive3");
        var ar15_primitive4 = this._scene.getMeshByName("ar15_primitive4");
        this.ar15names = ["ar15_primitive0", "ar15_primitive1", "ar15_primitive2", "ar15_primitive3", "ar15_primitive4"];


        // Stocker les meshes dans un tableau
        this.ar15 = [ar15_primitive0, ar15_primitive1, ar15_primitive2, ar15_primitive3, ar15_primitive4];

        // Obtenir les meshes
        var pistolet_primitive0 = this._scene.getMeshByName("pistolet_primitive0");
        var pistolet_primitive1 = this._scene.getMeshByName("pistolet_primitive1");
        this.pistoletnames = ["pistolet_primitive0", "pistolet_primitive1"];

        // Stocker les meshes dans un tableau
        this.pistolet = [pistolet_primitive0, pistolet_primitive1];

    }


}

