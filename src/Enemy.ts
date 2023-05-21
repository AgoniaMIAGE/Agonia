import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { TPSController } from "./TPSController";
import { PlayerHealth } from './PlayerHealth';

export class Enemy {

    protected velocity: float;
    protected isDead: Boolean;
    protected isAttacking:Boolean;
    protected _isScreaming:Boolean;

   
    public static hitPlayer:boolean;
    public camera: FreeCamera;
    public scene: Scene;
    public _canvas: HTMLCanvasElement;
    public zombieMeshes: AbstractMesh;
    public name:string;
    public currentHealth:float;
    public maxHealth:float;
    public damage:float;

    // animation trackers
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

    protected _ambiance:Sound;
    protected _ambiance2:Sound;
    protected _hurtSound:Sound;
    protected _screamSound:Sound;

    
    
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
        
        Enemy.hitPlayer = false;
        this._ambiance = new Sound("ambiance", "sounds/zombieambiance.mp3", this.scene,null,{
            loop: false,
            autoplay: false,
            volume: 0.2
          });
        this._ambiance2 = new Sound("ambiance2", "sounds/zombieambiance2.mp3", this.scene,null,{
            loop: false,
            autoplay: false,
            volume: 0.2
          });
        this._hurtSound = new Sound("hurtsound","sounds/hurt.mp3",this.scene,null,{
            loop: false,
            autoplay: false,
            volume: 0.7
          });
        this._screamSound = new Sound("screamsound","sounds/scream.mp3",this.scene,null,{
            loop: false,
            autoplay: false,
            volume: 0.2
          });
    }

    protected async spawner(difficulty: int): Promise<any> {
        this.CreateEnemy(new Vector3(this.getRandomInt(difficulty), 0, this.getRandomInt(difficulty)));
    }

    //signature
    public async CreateEnemy(position: Vector3): Promise<any> {

    }

    public changePosition(){
        this.zombieMeshes.position = new Vector3(this.getRandomInt(250), 0, this.getRandomInt(250));
        this.zombieMeshes.setEnabled(true);
        this.isDead = false;
        this._currentAnim = this._idle;
        this._animateZombie();
        this.currentHealth = this.maxHealth;
    }

    /**
     * launched every 60ms 
     */
     protected update() {
        this.scene.onReadyObservable.addOnce(() => {
        setInterval(() => {
            if(!this.isDead){
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
        var velocity2 = this.velocity;

        this.velocity = 0;
        this._currentAnim = this._hit;
        this._animateZombie();
        this.currentHealth -= damage;
        if(this.currentHealth <= 0)
        {
            this.die();
        }
        await Tools.DelayAsync(250);
        this.velocity = velocity2;
    }

    //enemy's death
    public async die() {
        if (!this.isDead) {
            this.isDead = true;
            this._currentAnim = this._fallingBack;
            this._animateZombie();
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

            if (distVec <= 6) {
                this.isAttacking = true;
                velocity = 0;
                this.attack();
                this.stunPlayer()
            }
            // Move enemy towards the player and stops slightly ahead
            else if (velocity >= 0.8) {
                this._currentAnim = this._run;
                this._animateZombie();
            }
            else if (velocity == 0) {
                this._currentAnim = this._idle;
                this._animateZombie();
            }
            else if (velocity >= 0.05 && velocity < 0.8) {
                this._currentAnim = this._walk;
                this._animateZombie();
            }
            distVec -= velocity;
            zombie.translate(new Vector3(targetVecNorm._x, 0, targetVecNorm._z,), velocity, Space.WORLD);

            // Enemy always faces the player
            zombie.setParent(null);
            zombie.lookAt(camera.position);
        }
    }

    //enemy's ability to stun
    protected async stunPlayer()
    {
        Enemy.hitPlayer = true;
        await Tools.DelayAsync(4000);
        this._currentAnim = this._scream;
        if(!this._isScreaming)
        {
            this._screamSound.play();
            this._isScreaming=true;
        }
        this._animateZombie();
        Enemy.hitPlayer = false;
        await Tools.DelayAsync(10000);
        this._isScreaming=false;
        this.isAttacking = false;
        await Tools.DelayAsync(1000);
    }


    //enemy's attack and the dmgs done
    protected attack() {
        
        if (!this.isDead && !this._attack.isPlaying)
            this._currentAnim = this._attack;
            this._animateZombie();
            PlayerHealth._current_Health -= this.damage;
            this._hurtSound.play();
    }

    //Zombie Animator
    protected _animateZombie(): void {
        if (this._currentAnim != null && this._prevAnim !== this._currentAnim) {
            this._prevAnim.stop();
            this._currentAnim.play(this._currentAnim.loopAnimation);
            this._prevAnim = this._currentAnim;
        }
    }

    protected _setUpAnimations(): void {
        //initialize current and previous
        this._currentAnim = this._idle;
        this._prevAnim = this._fallingBack;
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;
        this._walk.loopAnimation = true;
        this._walk2.loopAnimation = true;
        this._attack.loopAnimation = false;
        this._hit.loopAnimation = false;
        this._walk2.speedRatio = 2;
    }

    /**
     * 
     * @param max 
     * @returns randint(max) like
     */
     protected getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }
}
