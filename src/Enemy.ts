import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Observer, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { FPSController } from "./FPSController";
import { PlayerHealth } from './PlayerHealth';
import { Zombie } from './Zombie';
import { Mutant } from './Mutant';
import { Boss } from './Boss';

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

  public velocity: float;
  public velocityChase: float;
  public isDead: Boolean;
  protected isAttacking: Boolean;
  protected _isScreaming: Boolean;
  public isSleeping: Boolean;
  public static enemyRotation = 0;
  public static unleashEnemies: boolean = false;


  public static hitPlayer: boolean = false;
  public attackCooldown: float = 1;
  public cooldownTimeAttack: float = 0;
  public stunCooldown: float = 3;
  public cooldownTimeStun
  public camera: FreeCamera;
  public scene: Scene;
  public _canvas: HTMLCanvasElement;
  public zombieMeshes: AbstractMesh;
  public targetMesh: AbstractMesh;
  public name: string;
  public currentHealth: float;
  public maxHealth: float;
  public damage: float;
  public isGetHit: boolean = false;
  public diee: boolean = false;

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
  protected zombieScreamEndObserver: Observer<AnimationGroup>;
  protected zombieAttackEndObserver: Observer<AnimationGroup>;
  protected zombieDieEndObserver: Observer<AnimationGroup>;

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
      volume: 1
    });
    this._screamSound = new Sound("screamsound", "sounds/scream.mp3", this.scene, null, {
      loop: false,
      autoplay: false,
      volume: 0.6
    });

  }

  protected async spawner(difficulty: int): Promise<any> {
    this.CreateEnemy();
    this.sleep();
  }

  public sleep() {
    this.changeState(EnemyState.Sleep);
    this.isSleeping = true;
  }

  //signature
  public async CreateEnemy(): Promise<any> {

  }
  private changeState(newState: EnemyState) {
    // Stop the current animation
    if (newState !== this.currentState) {
      this.stopCurrentAnimation();
    }

    // Start the new animation
    this.currentState = newState;
    switch (newState) {
      case EnemyState.Idle:
        this.playAnimation(this._idle);
        break;
      case EnemyState.Walk:
        this.playAnimation(this._walk);
        break;
      case EnemyState.Run:
        this.playAnimation(this._run);
        break;
      case EnemyState.Attack:
        this.playAnimation(this._attack);
        break;
      case EnemyState.Hit:
        this.playAnimation(this._hit);
        break;
      case EnemyState.Dead:
        this.playAnimation(this._fallingBack);
        break;
      case EnemyState.Scream:
        this.playAnimation(this._scream);
        break;
      case EnemyState.Sleep:
        this.playAnimation(this._sleep);
        break;
      default:
        this.playAnimation(this._idle);
        break;
    }
  }

  private stopCurrentAnimation() {
    if (this._currentAnim && !this._isScreaming && !this.isAttacking) {
      this._currentAnim.stop();
    }
  }

  private playAnimation(animationGroup: AnimationGroup) {
    if (animationGroup) {
      this._currentAnim = animationGroup;
      animationGroup.play();
    }
  }




  public changePosition() {
    this.isDead = false;
    this.zombieMeshes.setEnabled(true);
    this.currentHealth = this.maxHealth;
    if (this.targetMesh.name === "Monster_04_MEsh") {
      this.scene.getMeshByName("zombie").position = new Vector3(18.092, 0, 202.525);
      this.scene.getMeshByName("zombie").rotation = new Vector3(0, 0, 0);
    }
    else if (this.targetMesh.name === "Creature_03_Mesh") {
      this.scene.getMeshByName("mutant").position = new Vector3(26.519, 0, 182.086);
      this.scene.getMeshByName("mutant").rotation = new Vector3(0, 0, 0);
    }
    else {
      this.scene.getMeshByName("boss").position = new Vector3(44, 0, 174);
      this.scene.getMeshByName("boss").rotation = new Vector3(0, 0, 0);
    }
    this.isSleeping = false;
  }
  /**
   * launched every 60ms 
   */
  protected update() {
    this.scene.onReadyObservable.addOnce(() => {
      setInterval(() => {
        if (this.cooldownTimeAttack < 99999999) {
          this.cooldownTimeAttack += 1;
        }
        else {
          this.cooldownTimeAttack = 0;
        }
        if (this.cooldownTimeStun < 99999999) {
          this.cooldownTimeStun += 1;
        }
        else {
          this.cooldownTimeStun = 0;
        }
        if (!this.isDead && !this.isSleeping && !this.isAttacking && !this._isScreaming && !this.isGetHit) {
          this.chase(this.velocity);
        }
        if ((this.diee) && (this.targetMesh.visibility <= 1 && this.targetMesh.visibility > 0)) {
          this.targetMesh.visibility -= 0.010;
        }
        if (this.targetMesh.visibility <= 0.010) {
          this.diee = false;
          this.changePosition();
          this.sleep();
          this.targetMesh.visibility = 1;
        }
      }, 60);
    })
  }

  //enemy taking damages and anims
  public async getHit(damage: float) {
    this.isGetHit = true;
    var velocity2 = this.velocity;
    this.velocity = 0;
    this.changeState(EnemyState.Hit);
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

      this.changeState(EnemyState.Dead);
      this.isDead = true;
      this._fallingBack.onAnimationEndObservable.addOnce(() => {
        this.diee = true;
        Enemy.enemyRotation++;
      })
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

    if (zombie.isEnabled()) {
      // Calculating distances between the enemy and the player
      let initVec = zombie.position.clone();
      let distVec = Vector3.Distance(camera.position, zombie.position);
      let targetVec = camera.position.subtract(initVec);
      let targetVecNorm = Vector3.Normalize(targetVec);
      if (distVec <= 4) {
        velocity = 0;
        if (this.attackCooldown <= this.cooldownTimeAttack / 60) {
          this.isAttacking = true;
          this.attack();
          this.cooldownTimeAttack = 0;
        }
        else if (this.stunCooldown <= this.cooldownTimeStun / 60) {
          this.stunPlayer();
          this.cooldownTimeStun = 0;
          this.cooldownTimeAttack = 0;
        }
        else if(!this.isGetHit){
          this.changeState(EnemyState.Idle);
        }
      }
      else {
        this.velocity = this.velocityChase;
        zombie.translate(new Vector3(targetVecNorm._x, 0, targetVecNorm._z,), velocity, Space.WORLD);
        if (velocity >= 0.8) {
          this.changeState(EnemyState.Run);
        }
        else if (velocity >= 0.05 && velocity < 0.8) {
          this.changeState(EnemyState.Walk);
        }
      }
      distVec -= velocity;


      // Enemy always faces the player
      zombie.setParent(null);
      zombie.lookAt(camera.position);
    }
  }

  //enemy's ability to stun
  protected async stunPlayer() {
    Enemy.hitPlayer = true;
    this._isScreaming = true;
    this._scream.onAnimationEndObservable.addOnce(() => {
      this._isScreaming = false;
      Enemy.hitPlayer = false;
    })
    this.changeState(EnemyState.Scream);
    this._screamSound.play();
  }


  //enemy's attack and the dmgs done
  protected attack() {

    if (!this.isDead && !this._attack.isPlaying)
      this.changeState(EnemyState.Attack);
    this._attack.onAnimationEndObservable.addOnce(() => {
      this.isAttacking = false;
    })
    PlayerHealth._current_Health -= this.damage;
    this._hurtSound.play();

  }

  protected _setUpAnimations(): void {
    //initialize current and previous
    this._animation1.stop();
    this._run.loopAnimation = true;
    this._idle.loopAnimation = true;
    this._walk.loopAnimation = true;
    this._sleep.loopAnimation = true;
    this._walk2.loopAnimation = true;
    this._attack.loopAnimation = false;
    this._hit.loopAnimation = false;
    this._currentAnim = this._animation1;
    this._prevAnim = this._animation1;

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