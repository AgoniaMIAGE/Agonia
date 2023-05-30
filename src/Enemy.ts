import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { FPSController } from "./FPSController";
import { PlayerHealth } from './PlayerHealth';

enum EnemyState {
    Idle,
    Walk,
    Run,
    Attack,
    Hit,
    Dead,
    Scream,
    Sleep
}

export class Enemy {

    protected velocity: float;
    protected isDead: Boolean;
    protected isAttacking: Boolean;
    protected _isScreaming: Boolean;


    public static hitPlayer: boolean;
    public camera: FreeCamera;
    public scene: Scene;
    public _canvas: HTMLCanvasElement;
    public zombieMeshes: AbstractMesh;
    public name: string;
    public currentHealth: float;
    public maxHealth: float;
    public damage: float;
    public isGetHit: boolean;

    // animation trackers
    protected currentState: EnemyState = EnemyState.Idle;
    protected _currentAnim: AnimationGroup = null;
    protected _prevAnim: AnimationGroup;

    //animations
    protected _attack: AnimationGroup;
    protected _fallingBack: AnimationGroup;
    protected _hit: AnimationGroup;
    protected _idle: AnimationGroup;
    protected _run: AnimationGroup;
    protected _walk: AnimationGroup;
    protected _walk2: AnimationGroup;
    protected _scream: AnimationGroup;
    protected _sleep: AnimationGroup;
    protected _animation1: AnimationGroup;

    protected _ambiance: Sound;
    protected _ambiance2: Sound;
    protected _hurtSound: Sound;
    protected _screamSound: Sound;





    constructor(scene: Scene, canvas: HTMLCanvasElement, difficulty, velocity: int, name: string) {
        this.scene = scene;
        this._canvas = canvas;
        this.velocity = velocity;
        this.name = name;
        this.spawner(difficulty);
        this.update();
        this._attack = new AnimationGroup("attack", scene);
        this._fallingBack = new AnimationGroup("fallingBack", scene);
        this._hit = new AnimationGroup("hit", scene);
        this._idle = new AnimationGroup("idle", scene);
        this._run = new AnimationGroup("run", scene);
        this._walk = new AnimationGroup("walk", scene);
        this._walk2 = new AnimationGroup("walk2", scene);
        this._scream = new AnimationGroup("scream", scene);
        this._sleep = new AnimationGroup("sleep", scene);
        this._animation1 = new AnimationGroup("animation1", scene);

        Enemy.hitPlayer = false;
        this._ambiance = new Sound("ambiance", "sounds/zombieambiance.mp3", this.scene, null, {
            loop: false,
            autoplay: false,
            volume: 0.2
        });
        this._ambiance2 = new Sound("ambiance2", "sounds/zombieambiance2.mp3", this.scene, null, {
            loop: false,
            autoplay: false,
            volume: 0.2
        });
        this._hurtSound = new Sound("hurtsound", "sounds/hurt.mp3", this.scene, null, {
            loop: false,
            autoplay: false,
            volume: 0.7
        });
        this._screamSound = new Sound("screamsound", "sounds/scream.mp3", this.scene, null, {
            loop: false,
            autoplay: false,
            volume: 0.2
        });
    }

    protected async spawner(difficulty: int): Promise<any> {
        this.CreateEnemy(new Vector3(this.getRandomInt(200), 0, this.getRandomInt(200)));
    }

    //signature
    public async CreateEnemy(position: Vector3): Promise<any> {

    }

    private updateState(newState: EnemyState) {
        if (this.currentState !== newState) {
            // Stop the current animation
            this.getCurrentAnimation().stop();

            // Update the current state
            this.currentState = newState;

            // Play the new animation
            this.getCurrentAnimation().play;
        }
    }

    private getCurrentAnimation(): AnimationGroup {
        switch (this.currentState) {
            case EnemyState.Idle: return this._idle;
            case EnemyState.Walk: return this._walk;
            case EnemyState.Run: return this._run;
            case EnemyState.Attack: return this._attack;
            case EnemyState.Hit: return this._hit;
            case EnemyState.Dead: return this._fallingBack;
            case EnemyState.Scream: return this._scream;
            case EnemyState.Sleep: return this._sleep;
            default: return this._idle;
        }
    }



    public changePosition() {
        this.zombieMeshes.setEnabled(true);
        this.zombieMeshes.position = (new Vector3(this.getRandomInt(200), 0, this.getRandomInt(200)));
        this.isDead = false;
        this.updateState(EnemyState.Sleep);
        this.currentHealth = this.maxHealth;
    }

    /**
     * launched every 60ms 
     */
    protected update() {
        this.scene.onReadyObservable.addOnce(() => {
            setInterval(() => {
                if (!this.isDead) {
                    this.chase(this.velocity);
                }
                else {
                    clearInterval(1);
                }
            }, 60);
        })
    }

    //enemy taking damages and anims
    public async getHit(damage: float) {
        this.isGetHit = true;
        console.log("Get hit start");
        var velocity2 = this.velocity;

        this.velocity = 0;
        this.updateState(EnemyState.Hit);
        this.currentHealth -= damage;
        if (this.currentHealth <= 0) {
            this.die();
        }
        this._hit.onAnimationEndObservable.addOnce(() => {
            this.velocity = velocity2;
            this.isGetHit = false;
        });
    }

    //enemy's death
    public async die() {
        if (!this.isDead) {
            this.isDead = true;
            this.updateState(EnemyState.Dead);
            await Tools.DelayAsync(3000);
            this.zombieMeshes.setEnabled(false);
            await Tools.DelayAsync(1000);
            this.changePosition();
        }
    }

    /**
     * chasing the player 
     * @param velocity zombie's one
     */
    protected chase(velocity: float) {
        let zombie = this.zombieMeshes;
        let scene = this.scene;
        let camera = scene.getCameraByName("camera");

        if (zombie.isEnabled() && !this.isAttacking) {
            // Calculating distances between the enemy and the player
            let initVec = zombie.position.clone();
            let distVec = Vector3.Distance(camera.position, zombie.position);
            let targetVec = camera.position.subtract(initVec);
            let targetVecNorm = Vector3.Normalize(targetVec);

            if (distVec <= 4) {
                this.isAttacking = true;
                velocity = 0;
                this.attack();
                this.stunPlayer();
                this.updateState(EnemyState.Attack);
              }
              else if (velocity >= 0.8) {
                this.updateState(EnemyState.Run);
              }
              else if (velocity == 0) {
                this.updateState(EnemyState.Idle);
              }
              else if (velocity >= 0.05 && velocity < 0.8) {
                this.updateState(EnemyState.Walk);
              }
            distVec -= velocity;
            zombie.translate(new Vector3(targetVecNorm._x, 0, targetVecNorm._z,), velocity, Space.WORLD);

            // Enemy always faces the player
            zombie.setParent(null);
            zombie.lookAt(camera.position);
        }
    }

    //enemy's ability to stun
    protected async stunPlayer() {
        Enemy.hitPlayer = true;
        await Tools.DelayAsync(4000);
        this.updateState(EnemyState.Scream);
        if (!this._isScreaming) {
            this._screamSound.play();
            this._isScreaming = true;
        }
        Enemy.hitPlayer = false;
        await Tools.DelayAsync(10000);
        this._isScreaming = false;
        this.isAttacking = false;
        await Tools.DelayAsync(1000);
    }


    //enemy's attack and the dmgs done
    protected attack() {

        if (!this.isDead && !this._attack.isPlaying)
        this.updateState(EnemyState.Attack);
        PlayerHealth._current_Health -= this.damage;
        this._hurtSound.play();
    }

    protected _setUpAnimations(): void {
        //initialize current and previous
        this._animation1.stop();
        this._currentAnim = this._idle;
        this._prevAnim = this._sleep;
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._walk2.loopAnimation = true;
        this._attack.loopAnimation = false;
        this._hit.loopAnimation = false;
    }

    /**
     * 
     * @param max 
     * @returns randint(max) like
     */
    protected getRandomInt(max) {
        if (isNaN(max)) {
            // Gérer le cas où max n'est pas un nombre valide
            return 0; // ou une valeur par défaut appropriée
        } else {
            return Math.floor(Math.random() * max);
        }
    }
}