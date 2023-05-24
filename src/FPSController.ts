import { Animation, Tools, RayHelper, Axis, PointLight, PBRMetallicRoughnessMaterial, SpotLight, DirectionalLight, OimoJSPlugin, PointerEventTypes, Space, Engine, SceneLoader, Scene, Vector3, Ray, TransformNode, Mesh, Color3, Color4, UniversalCamera, Quaternion, AnimationGroup, ExecuteCodeAction, ActionManager, ParticleSystem, Texture, SphereParticleEmitter, Sound, Observable, ShadowGenerator, FreeCamera, ArcRotateCamera, EnvironmentTextureTools, Vector4, AbstractMesh, KeyboardEventTypes, int, _TimeToken, CameraInputTypes, WindowsMotionController, Camera } from "@babylonjs/core";
import { float } from "babylonjs";
import { Boss } from "./Boss";
import { Enemy } from "./Enemy";
import { Mutant } from "./Mutant";
import { PlayerHealth } from "./PlayerHealth";
import { Zombie } from "./Zombie";

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

    //headLight
    private _light: SpotLight;
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

    //examining object 
    private examiningObject: boolean = false;
    private examiningObjectMesh: AbstractMesh;
    private InteractiveObject: TransformNode;

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
        this.createPistol();
        this.createController();
        this.InitCameraKeys();
        this.keyboardInput();
        this.setupFlashlight();
        this.setupAllMeshes();
        this.handleInteraction()
        this.createExaminationHUD()
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
                    this._cooldown_time += 1;
                } else {
                    this._cooldown_time = 0;
                }

                if (Enemy.hitPlayer) {
                    this.walkSpeed = 0.2;
                    this.runSpeed = 0.2;
                    this.walk(this.walkSpeed);
                } else {
                    this.walkSpeed = 3;
                    this.runSpeed = 4;
                }
                if (!this.isFiring) {

                    if (!this.zPressed && !this.qPressed && !this.sPressed && !this.dPressed) {
                        this.changeState(CharacterState.Idle);
                        this.stopwalkSound();
                        prevMovementState = CharacterState.Idle; // Update previous movement state
                        this.transitionToState(CharacterState.Idle); // Transition to idle animation
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
                            prevAimState = CharacterState.AimWalk; // Update previous aim state
                            this.transitionToState(CharacterState.AimWalk); // Transition to aim walk animation
                        } else {
                            this.changeState(CharacterState.Idle);
                            prevAimState = CharacterState.Idle; // Update previous aim state
                            this.transitionToState(CharacterState.Idle); // Transition to idle animation
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
        this._camera.ellipsoid = new Vector3(1, 1.1, 1);

        //Movements
        this.InitCameraKeys();
        this._camera.minZ = 0.1; // Réduire la valeur de la 'near plane'
    }

    /**
     * Movements rules
     * @param camera this camera
     */
    private enableCameraMovement(): void {
        this._camera.keysUp = this.cameraKeys.up;
        this._camera.keysDown = this.cameraKeys.down;
        this._camera.keysLeft = this.cameraKeys.left;
        this._camera.keysRight = this.cameraKeys.right;
    }

    private disableCameraMovement(): void {
        this._camera.keysUp = [];
        this._camera.keysDown = [];
        this._camera.keysLeft = [];
        this._camera.keysRight = [];
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
    private swap(lastWeapon: AbstractMesh): void {
        lastWeapon.dispose();
        switch (this.i) {
            case 0:
                this.createShotgun();
                this.i++;
                break;
            case 1:
                this.createScar();
                this.i++;
                break;
            case 2:
                this.createSniper();
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
                            this._flashlightSound.play();
                            if (this._light.intensity === 5000) {
                                this._light.intensity = 0;
                            } else {
                                this._light.intensity = 5000;
                            }
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
    public changeWeapon() {
        this.swap(this._weapon);
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

    //Anims Check to return to Idle
    private allUnpressed() {
        if (!this.zPressed && !this.qPressed && !this.sPressed && !this.dPressed) {
            this.walk(0);
        }
    }
    /**
     * create the flashlight
     */
    private setupFlashlight() {
        this._light = new SpotLight("spotLight", new Vector3(0, 1, 0), new Vector3(0, 0, 1), Math.PI / 3, 2, this._scene);
        this._light.intensity = 0;
        this._light.parent = this._camera;
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

    //Scar and its variables/stats
    private async createScar(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "scar.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this._weapon = env;
        for (let i = 1; i < 4; i++) {
            result.meshes[i].renderingGroupId = 2;
        }
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);

        //audio effect 
        this._weaponSound = new Sound("scarsound", "sounds/scarshot.mp3", this._scene);
        this._reloadSound = new Sound("scarsoundreload", "sounds/scar-reload.mp3", this._scene);
        //animations
        this._end = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Hide");
        this._fire = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Singl_Shot");
        this._idle = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Idle");
        this._reload = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Recharge");
        this._run = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Run");
        this._start = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Get");
        this._walk = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Walk");
        this._aim_walk = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Aiming_Walk");
        this._aim_shot = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Aiming_Shot");
        this._aim_idle = this._scene.getAnimationGroupByName("Hands_Automatic_rifle.Aiming_Idle");
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._aim_walk.loopAnimation = true;

        //shooting part
        this._cooldown_fire = 0.15;
        this._damage = 25;
        FPSController._ammo = 30;
        FPSController._max_ammo = 30;

        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
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
    private async createPistol(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "pistol.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.parent = this._camera;
        this._weapon = env;
        /*for (let i = 1; i < 9; i++) {
            result.meshes[i].renderingGroupId = 1;
        }*/
        result.meshes[0].position = new Vector3(0, -1.7, 0.2);
        result.meshes[0].rotation = new Vector3(0, 0, 0);
        result.meshes[0].scaling = new Vector3(1, 1, -1);

        //audio effect 
        this._weaponSound = new Sound("pistolsound", "sounds/whoosh.mp3", this._scene);
        this._reloadSound = new Sound("pistolsoundreload", "sounds/pistol-reload.mp3", this._scene);

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

        //shooting part
        this._cooldown_fire = 0.1;
        this._damage = 15;
        FPSController._ammo = 10;
        FPSController._max_ammo = 10;

        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
    }


    //Sniper and its variables/stats
    private async createSniper(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "sniper.glb", this._scene);

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
        this._weaponSound = new Sound("snipersound", "sounds/snipershot.mp3", this._scene);
        this._reloadSound = new Sound("snipersoundreload", "sounds/sniper-reload.mp3", this._scene);

        //animations
        this._end = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Hide");
        this._fire = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Shot");
        this._idle = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Idel");
        this._reload = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Recharge");
        this._run = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Run");
        this._start = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Get");
        this._walk = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Walk");
        this._aim_walk = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Aiming_Walk");
        this._aim_shot = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Aiming_Shot");
        this._aim_idle = this._scene.getAnimationGroupByName("Hands_Sniper_Rifle.Aiming_Idle");
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._aim_walk.loopAnimation = true;

        //shooting part
        this._cooldown_fire = 0.7;
        this._damage = 100;
        FPSController._ammo = 10;
        FPSController._max_ammo = 10;

        return {
            mesh: env as Mesh,
            animationGroups: result.animationGroups
        }
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

    private getAnimationGroup(state: CharacterState): AnimationGroup {
        switch (state) {
            case CharacterState.End:
                return this._end;
            case CharacterState.Fire:
                return this._fire;
            case CharacterState.Idle:
                return this._idle;
            case CharacterState.Reload:
                return this._reload;
            case CharacterState.Run:
                return this._run;
            case CharacterState.Start:
                return this._start;
            case CharacterState.Walk:
                return this._walk;
            case CharacterState.AimWalk:
                return this._aim_walk;
            case CharacterState.AimShot:
                return this._aim_shot;
            case CharacterState.AimIdle:
                return this._aim_idle;
        }
    }


    private createTransitionAnimation(currentAnim: AnimationGroup, newAnim: AnimationGroup): AnimationGroup {
        // Create a transition animation that blends between the last frame of the current animation and the first frame of the new animation
        const transitionAnim = new AnimationGroup("TransitionAnimation");
        const currentKeys = currentAnim.targetedAnimations[0].animation.getKeys();
        const newKeys = newAnim.targetedAnimations[0].animation.getKeys();
        const transitionKeys = [
            currentKeys[currentKeys.length - 1],
            newKeys[0]
        ];
        const transitionAnimation = new Animation("TransitionAnimation", "worldMatrix", 60, Animation.ANIMATIONTYPE_MATRIX);
        transitionAnimation.setKeys(transitionKeys);
        transitionAnim.addTargetedAnimation(transitionAnimation, this._weapon);
        transitionAnim.normalize(0, 1);
        transitionAnim.loopAnimation = false;

        return transitionAnim;
    }

    private transitionToState(newState: CharacterState) {
        // Get the current and new animations
        const currentAnim = this.getAnimationGroup(currentState);
        const newAnim = this.getAnimationGroup(newState);

        // Stop the current animation
        currentAnim.stop();

        // Create a transition animation
        const transitionAnim = this.createTransitionAnimation(currentAnim, newAnim);

        // Play the transition animation, then the new animation
        transitionAnim.onAnimationEndObservable.addOnce(() => {
            newAnim.play();
        });
        transitionAnim.play();

        // Update the current state
        currentState = newState;
    }

    private initialPosition: Vector3 = null;
    private lastParentName: string = null;
    // Add these properties to your class
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
                        // If already examining an object, put it back to its initial position and rotation
                        this.examiningObjectMesh.parent = this._scene.getTransformNodeByName(this.lastParentName);
                        this.examiningObjectMesh.position = this.initialPosition;
                        this.examiningObjectMesh.rotation = this.initialRotation;
                        this.examiningObject = false;

                        this.firstChild.setEnabled(true);

                        // Hide the examination HUD
                        document.getElementById("examination-hud").style.display = "none";

                        // Unlock the pointer and show the cursor
                        document.exitPointerLock();

                        // Enable camera movement
                        this.enableCameraMovement();
                    }
                } else {

                    this.firstChild = this._camera.getChildren(node => node.name === "__root__")[0];
                    console.log(this.firstChild.name);
                    console.log(this.firstChild.id);
                    this.firstChild.setEnabled(false);

                    // Calculate the forward direction from the camera
                    const forward = this._camera.getForwardRay().direction;

                    // Create a ray from the camera position in the forward direction
                    const ray = new Ray(this._camera.position, forward);

                    // Perform a raycast to check for intersections with objects in the scene
                    const pickInfo = this._scene.pickWithRay(ray);

                    // Check if an object was picked
                    if (pickInfo.hit) {
                        const pickedObject = pickInfo.pickedMesh;
                        this.examiningObjectMesh = pickedObject;
                        this.initialPosition = pickedObject.position.clone();
                        this.initialRotation = pickedObject.rotation.clone();
                        this.lastParentName = pickedObject.parent.name;

                        // Perform the desired interaction with the picked object
                        this.examineObject(pickedObject);
                        this.moveObject(pickedObject);

                        // Show the examination HUD
                        document.getElementById("examination-hud").style.display = "block";

                        // Lock the pointer and hide the cursor
                        this._canvas.requestPointerLock();
                        this.examiningObject = true;

                        // Disable camera movement
                        this.disableCameraMovement();
                    }
                }
            }
        });
    }

    private mouseMoveListener: (event: MouseEvent) => void = null;

    private examineObject(object: AbstractMesh): void {// Calculate the new position for the object based on the camera's position and direction
        // Calculate the new position for the object based on the camera's position and direction
        const distance = 1.5; // Distance from the camera to the object (adjust as needed)
        const offset = this._camera.getForwardRay().direction.scale(-distance); // Offset vector from the camera
        const newPosition = this._camera.position.add(offset);

        // Apply the object's scaling to the distance
        const scaledDistance = distance / object.scaling.length();

        // Set the new position for the object
        object.position.copyFrom(newPosition).normalize().scaleInPlace(scaledDistance);

        // Make the object a child of the camera during examination
        object.parent = this._camera;

        this.examiningObject = true;
    }

    private moveObject(object: AbstractMesh): void {
        // Enable pointer events for the canvas
        this._canvas.style.pointerEvents = "all";

        // Lock the pointer and hide the cursor when clicking on the canvas
        this._canvas.addEventListener("click", () => {
            this._canvas.requestPointerLock();
        });

        // Add pointer event listeners for mouse movement
        const mouseMoveListener = (event: MouseEvent) => {
            // Check if the pointer is locked and if the object is being examined
            if (document.pointerLockElement === this._canvas && this.examiningObject) {
                // Perform rotation based on the mouse movement
                object.rotation.y += event.movementX * 0.01; // Adjust rotation speed as needed
                object.rotation.x += event.movementY * 0.01; // Adjust rotation speed as needed
            }
        };

        this.mouseMoveListener = mouseMoveListener;
        this._canvas.addEventListener("mousemove", mouseMoveListener);

        // Release the pointer lock and show the cursor when pressing escape
        document.addEventListener("pointerlockchange", () => {
            if (document.pointerLockElement !== this._canvas) {
                this._canvas.style.cursor = "auto";
            } else {
                this._canvas.style.cursor = "none";
            }
        });
    }


    private createExaminationHUD(): void {
        // Create the HUD element if it does not exist
        // Create the HUD element if it does not exist
        // Create the HUD element if it does not exist
        var hud = document.getElementById("examination-hud");
        if (!hud) {
            hud = document.createElement("div");

            // Assign the id
            hud.id = "examination-hud";

            // Set the initial style
            hud.style.display = "none";
            hud.style.position = "fixed";
            hud.style.top = "0";
            hud.style.left = "0";
            hud.style.width = "100%";
            hud.style.height = "100%";
            hud.style.background = "none"; // Remove the dark background
            hud.style.color = "white";
            hud.style.fontSize = "2em";
            hud.style.padding = "1em";
            hud.style.boxSizing = "border-box";
            hud.style.overflowY = "auto";
            hud.style.border = "2px solid red"; // Add an eerie red border

            // Set the initial content with horror-themed style and icons
            hud.innerHTML = `
    <h1 style="text-align: center; font-size: 2.5em; font-family: 'Horror Font', cursive;">Examination</h1>
    <p style="font-family: 'Horror Font', cursive;">Object details...</p>
    <div style="text-align: center;">
  `;

            // Add the HUD to the body
            document.body.appendChild(hud);
        }


    }




}
