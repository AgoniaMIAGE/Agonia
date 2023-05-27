import { Animation, Tools, RayHelper, EasingFunction, CannonJSPlugin, MeshBuilder, StandardMaterial, InstancedMesh, PointParticleEmitter, IAnimationKey, FreeCameraKeyboardMoveInput, FreeCameraMouseInput, FreeCameraTouchInput, FreeCameraGamepadInput, Axis, PointLight, PBRMetallicRoughnessMaterial, SpotLight, DirectionalLight, OimoJSPlugin, PointerEventTypes, Space, Engine, SceneLoader, Scene, Vector3, Ray, TransformNode, Mesh, Color3, Color4, UniversalCamera, Quaternion, AnimationGroup, ExecuteCodeAction, ActionManager, ParticleSystem, Texture, SphereParticleEmitter, Sound, Observable, ShadowGenerator, FreeCamera, ArcRotateCamera, EnvironmentTextureTools, Vector4, AbstractMesh, KeyboardEventTypes, int, _TimeToken, CameraInputTypes, WindowsMotionController, Camera } from "@babylonjs/core";
import { float } from "babylonjs";
import { Boss } from "./Boss";
import { Enemy } from "./Enemy";
import { Mutant } from "./Mutant";
import { PlayerHealth } from "./PlayerHealth";
import { Zombie } from "./Zombie";
import * as cannon from 'cannon';
import { Button, Control, Rectangle, AdvancedDynamicTexture, TextBlock, Grid } from "@babylonjs/gui";


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


    //examining object 
    private examiningObject: boolean = false;
    private examiningObjectMesh: AbstractMesh;
    private InteractiveObject: TransformNode;
    public oil: AbstractMesh;

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
                if (!this.isFiring) {

                    if (!this.zPressed && !this.qPressed && !this.sPressed && !this.dPressed) {
                        this.changeState(CharacterState.Idle);
                        this.stopwalkSound();
                    }

                    if (!this.shiftPressed) {
                        if (this.zPressed || this.qPressed || this.sPressed || this.dPressed) {
                            this.walk(this.walkSpeed);
                            this.walkSound();
                            this.changeState(CharacterState.Walk);
                        }
                    }

                    if (this.shiftPressed) {
                        if (this.zPressed || this.qPressed || this.sPressed || this.dPressed) {
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
            }, 60);
        });
    }


    /**
     * create the camera which represents the player (FPS)
     */
    private createController(): void {
        this._camera = new FreeCamera("camera", new Vector3(9, 3, 187), this._scene);
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
                            if (this._currentAnim !== this._reload && !this.reloadPressed) {
                                this.reloadPressed = true;
                                this._reloadSound.play();
                                this.changeState(CharacterState.Reload);
                            }
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
                            break;
                        case '&':
                            if (this._cooldown_fire <= this._cooldown_time / 60) {
                                this.fire();
                                this._cooldown_time = 0;
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

        // Mouse events
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
                            this.changeState(CharacterState.Fire);
                        }
                    } else if (pointerInfo.event.button === 2) {
                        this.rightClickPressed = !this.rightClickPressed;
                        if (this.rightClickPressed) {
                            this.changeState(CharacterState.AimIdle);
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
        if (this.canFire && !this.isMeleeWeapon) {
            if (this._cooldown_time / 60 >= this._cooldown_fire) {
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
                    if (this._currentAnim !== this._fire) {
                        this.changeState(CharacterState.Fire);
                    }

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




    private reload() {
        this._empty_ammo.play();
    }

    private async createAllWeapons(): Promise<any> {
        await this.createWeapon1();
        await this.createWeapon2();
        await this.createweapon3();

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
                    this._end.stop();
                    break;
                case CharacterState.Fire:
                    this._fire.stop();
                    break;
                case CharacterState.Idle:
                    this._idle.stop();
                    break;
                case CharacterState.Reload:
                    this._reload.stop();
                    break;
                case CharacterState.Run:
                    this._run.stop();
                    break;
                case CharacterState.Start:
                    this._start.stop();
                    break;
                case CharacterState.Walk:
                    this._walk.stop();
                    break;
                case CharacterState.AimWalk:
                    this._aim_walk.stop();
                    break;
                case CharacterState.AimShot:
                    this._aim_shot.stop();
                    break;
                case CharacterState.AimIdle:
                    this._aim_idle.stop();
                    break;
            }
        }

        // Start the new animation
        switch (newState) {
            case CharacterState.End:
                this._end.play();
                break;
            case CharacterState.Fire:
                this._fire.play();
                break;
            case CharacterState.Idle:
                this._idle.play(this._idle.loopAnimation);
                break;
            case CharacterState.Reload:
                this._reload.play();
                break;
            case CharacterState.Run:
                this._run.play();
                break;
            case CharacterState.Start:
                this._start.play();
                break;
            case CharacterState.Walk:
                this._walk.play();
                break;
            case CharacterState.AimWalk:
                this._aim_walk.play();
                break;
            case CharacterState.AimShot:
                this._aim_shot.play();
                break;
            case CharacterState.AimIdle:
                this._aim_idle.play();
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
        this._scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN && kbInfo.event.key === 'e') {
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
                        else {

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
                                } else {
                                    this.openChestOfDrawers(pickedObject);
                                }
                            }
                        }
                        if (pickInfo && pickInfo.hit && this.canExamineDoor(pickInfo.pickedMesh)) {
                            this.openDoor(pickInfo.pickedMesh);
                        }
                    }
                }
            }
        });
    }

    private isAnimating = false;
    private isOpen = false;

    private openChestOfDrawers(pickedObject: AbstractMesh) {
        if (this.isAnimating) {
            return; // Si une animation est déjà en cours, ne commencez pas une nouvelle animation
        }

        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialX = pickedObject.position.x; // Position initiale de l'objet
        const targetX = 1; // Position finale de l'ouverture du tiroir

        // Création de l'animation
        const animation = new Animation(
            'positionAnimation', // Nom de l'animation
            'position.x', // Propriété à animer (position.x)
            60, // Nombre de frames par seconde
            Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
            Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
        );

        // Création de la liste des frames de l'animation
        const keys: IAnimationKey[] = [
            { frame: 0, value: initialX }, // Frame initiale
            { frame: animationDuration, value: targetX } // Frame finale
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
            this.isOpen = true;
        };
    }

    private closeChestOfDrawers(pickedObject: AbstractMesh) {
        if (this.isAnimating) {
            return; // Si une animation est déjà en cours, ne commencez pas une nouvelle animation
        }

        const animationDuration = 20; // Durée de l'animation en millisecondes
        const initialX = pickedObject.position.x; // Position initiale de l'objet
        const targetX = 0.2; // Position finale de la fermeture du tiroir

        // Création de l'animation
        const animation = new Animation(
            'positionAnimation', // Nom de l'animation
            'position.x', // Propriété à animer (position.x)
            60, // Nombre de frames par seconde
            Animation.ANIMATIONTYPE_FLOAT, // Type d'animation (float)
            Animation.ANIMATIONLOOPMODE_CONSTANT // Mode de boucle (constant)
        );

        // Création de la liste des frames de l'animation
        const keys: IAnimationKey[] = [
            { frame: 0, value: initialX }, // Frame initiale
            { frame: animationDuration, value: targetX } // Frame finale
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
            this.isOpen = false;
        };
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

            // Move up to the next parent
            parent = parent.parent;
        }

        // None of the parents have an allowed name, cannot examine the object
        return false;
    }

    private canExamineDrawer(object: AbstractMesh): boolean {
        console.log(object.name);
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
            if (initialEulerAngles.y < 1) {
                if (this.canOpenDoor4) {
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

        // Iterate through the parents up to three levels
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


    private puzzleHUDVisible: boolean = false;
    private advancedTexture: AdvancedDynamicTexture;

    private createPuzzleGame(): void {
        const targetCode = [3, 2, 2, 3]; // Code cible pour ouvrir la porte
        const enteredCode: number[] = []; // Code entré par le joueur

        // Créer une interface utilisateur en utilisant AdvancedDynamicTexture
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // Créer le conteneur principal
        const container = new Rectangle();
        container.width = "400px";
        container.height = "300px";
        container.color = "white";
        container.thickness = 4;
        container.cornerRadius = 20;
        container.background = "#282c34";
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(container);

        // Titre du jeu
        const title = new TextBlock();
        title.text = "Enter Door Code";
        title.fontSize = 24;
        title.color = "white";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.addControl(title);

        // Créer une grille pour contenir les boutons
        const grid = new Grid();
        grid.addColumnDefinition(0.33);
        grid.addColumnDefinition(0.33);
        grid.addColumnDefinition(0.33);
        grid.addRowDefinition(0.25);
        grid.addRowDefinition(0.25);
        grid.addRowDefinition(0.25);
        grid.addRowDefinition(0.25);
        container.addControl(grid);

        // Créer les boutons numériques
        for (let i = 1; i <= 9; i++) {
            const button = Button.CreateSimpleButton("button" + i, i.toString());
            button.width = "100px";
            button.height = "100px";
            button.color = "white";
            button.fontSize = 32;
            button.cornerRadius = 10;
            button.background = "#61dafb";
            button.onPointerUpObservable.add(() => {
                if (this.puzzleHUDVisible) {
                    enteredCode.push(i);
                    if (enteredCode.length === 4) {
                        if (this.isCodeCorrect(enteredCode, targetCode)) {
                            alert("Door opened!");
                            //this.OuvrePorte(); // Ajoutez cette ligne ici
                        } else {
                            alert("Incorrect code!");
                            enteredCode.length = 0; // Réinitialiser le code entré
                        }
                        enteredCode.length = 0; // Réinitialiser le code entré
                    }
                }
            });
            grid.addControl(button, Math.floor((i - 1) / 3), (i - 1) % 3);
        }

        // Créer le bouton pour effacer le dernier chiffre
        const clearButton = Button.CreateSimpleButton("clearButton", "Clear");
        clearButton.width = "100px";
        clearButton.height = "100px";
        clearButton.color = "white";
        clearButton.fontSize = 32;
        clearButton.cornerRadius = 10;
        clearButton.background = "#61dafb";
        clearButton.onPointerUpObservable.add(() => {
            if (this.puzzleHUDVisible) {
                enteredCode.pop();
            }
        });
        grid.addControl(clearButton, 3, 1);

        // Gérer l'affichage du HUD lorsqu'une touche est enfoncée
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "e") {
                // Autres actions...
            } else if (["z", "q", "s", "d"].includes(event.key)) {
                this.puzzleHUDVisible = false;
                container.isVisible = false;
            }
        };
        const handleMouseUp = (event: MouseEvent) => {
            if (this.puzzleHUDVisible) {
                const canvas = this._scene.getEngine().getRenderingCanvas();
                const pointerX = event.clientX - canvas.getBoundingClientRect().left;
                const pointerY = event.clientY - canvas.getBoundingClientRect().top;
                const containerX = container.leftInPixels;
                const containerY = container.topInPixels;
                const containerWidth = container.widthInPixels;
                const containerHeight = container.heightInPixels;
                const isClickedInsideContainer =
                    pointerX >= containerX &&
                    pointerX <= containerX + containerWidth &&
                    pointerY >= containerY &&
                    pointerY <= containerY + containerHeight;

                if (!isClickedInsideContainer) {
                    this.puzzleHUDVisible = false;
                    container.isVisible = false;
                    canvas.style.cursor = "none"; // Cacher à nouveau la souris
                    canvas.removeEventListener("mouseup", handleMouseUp);
                    document.exitPointerLock(); // Libérer le pointeur
                }
            }
        };






        // Ajouter les écouteurs d'événements
        const canvas = this._scene.getEngine().getRenderingCanvas();
        canvas.addEventListener("keydown", handleKeyDown);
    }

    private isCodeCorrect(enteredCode: number[], targetCode: number[]): boolean {
        if (enteredCode.length !== targetCode.length) {
            return false;
        }
        for (let i = 0; i < enteredCode.length; i++) {
            if (enteredCode[i] !== targetCode[i]) {
                return false;
            }
        }
        return true;
    }

}
