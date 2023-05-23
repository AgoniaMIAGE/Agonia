import { Animation, Tools, RayHelper, PointLight, PBRMetallicRoughnessMaterial, SpotLight, DirectionalLight, OimoJSPlugin, PointerEventTypes, Space, Engine, SceneLoader, Scene, Vector3, Ray, TransformNode, Mesh, Color3, Color4, UniversalCamera, Quaternion, AnimationGroup, ExecuteCodeAction, ActionManager, ParticleSystem, Texture, SphereParticleEmitter, Sound, Observable, ShadowGenerator, FreeCamera, ArcRotateCamera, EnvironmentTextureTools, Vector4, AbstractMesh, KeyboardEventTypes, int, _TimeToken, CameraInputTypes, WindowsMotionController, Camera } from "@babylonjs/core";
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
    private dPressed: boolean = false;
    private controlPressed: boolean = false;
    private controlIPressed: int = 0;
    private rightClickPressed = false;
    private reloadPressed = false;

    //speed
    public walkSpeed = 3;
    public runSpeed = 4;

    //soon an Array of Enemy instead of a simple zombie
    constructor(scene: Scene, canvas: HTMLCanvasElement, enemy: Enemy, mutant: Mutant, boss: Boss, zombie: Zombie) {
        this._scene = scene;
        this._canvas = canvas;
        this._enemy = enemy;
        this._zombie = zombie;
        this._mutant = mutant;
        this._boss = boss;
        this.createPistol();
        this.createController();
        this.keyboardInput();
        this.setupFlashlight();
        this.setupAllMeshes();
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
        this.ApplyMovementRules(this._camera);
        this._camera.minZ = 0.1; // Réduire la valeur de la 'near plane'

    }

    /**
     * Movements rules
     * @param camera this camera
     */
    ApplyMovementRules(camera: FreeCamera): void {
        camera.keysUp.push(90);//z
        camera.keysDown.push(83);//s
        camera.keysLeft.push(81)//q
        camera.keysRight.push(68);//d*
        camera.minZ = 0.45;
        camera.angularSensibility = 2000;
        camera.inertia = 0.1;
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

    // Keyboard inputs
    private keyboardInput(): void {
        // Variables to track the previous state
        let prevMovementState: CharacterState = CharacterState.Idle;
        let prevAimState: CharacterState = CharacterState.Idle;

        this._scene.onKeyboardObservable.add((kbInfo) => {
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
                            if (this.zPressed || this.qPressed || this.sPressed || this.dPressed) {
                                this.walk(this.runSpeed);
                                this._walkSound.stop();
                                if (!this._runSound.isPlaying) {
                                    this._runSound.play();
                                }
                                prevMovementState = CharacterState.Walk; // Update previous movement state
                            }
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
                                this.changeState(CharacterState.Fire);
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
                    }

                    if (!this.zPressed && !this.qPressed && !this.sPressed && !this.dPressed) {
                        this.changeState(CharacterState.Idle);
                        this.stopwalkSound();
                        prevMovementState = CharacterState.Idle; // Update previous movement state
                    }

                    if (this.zPressed || this.qPressed || this.sPressed || this.dPressed) {
                        this.walk(this.walkSpeed);
                        this.walkSound();
                        prevMovementState = CharacterState.Walk; // Update previous movement state
                    }

                    if (prevMovementState === CharacterState.AimWalk || prevMovementState === CharacterState.AimIdle) {
                        // Only transition to aim-related states if the right click is pressed
                        if (this.rightClickPressed) {
                            this.changeState(CharacterState.AimWalk);
                            prevAimState = CharacterState.AimWalk; // Update previous aim state
                        } else {
                            this.changeState(CharacterState.Idle);
                            prevAimState = CharacterState.Idle; // Update previous aim state
                        }
                    }
                    break;
            }
        });

        // Mouse events
        this._scene.onPointerObservable.add((pointerInfo) => {
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
     * Launch the animation
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
        var zombie = this._enemy;
        var origin = this._camera.position;
        if (FPSController._ammo > 0) {
            FPSController._ammo -= 1;
            //this.gunMuzzleFlash();
            this._weaponSound.play(); //sound
            var forward = new Vector3(0, 0, 1);
            forward = this.vecToLocal(forward, this._camera);

            var direction = forward.subtract(origin);
            direction = Vector3.Normalize(direction);

            var length = 1000;

            var ray = new Ray(origin, direction, length);

            var hit = this._scene.pickWithRay(ray);

            //animation
            //set animation
            if (!this.rightClickPressed) {
                this.changeState(CharacterState.Fire);
            }
            else {
                this.changeState(CharacterState.AimShot);
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
        }
        else {
            this.reload();
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
        this._weaponSound = new Sound("pistolsound", "sounds/pistol.mp3", this._scene);
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
        this._cooldown_fire = 0.2;
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

        // Start the new animation
        switch (newState) {
            case CharacterState.End:
                this._end.play();
                break;
            case CharacterState.Fire:
                this._fire.play();
                break;
            case CharacterState.Idle:
                this._idle.play();
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
}
