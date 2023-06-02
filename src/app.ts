import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders";

import { SkyMaterial } from "@babylonjs/materials";
import { AdvancedDynamicTexture, StackPanel, Button, TextBlock, Rectangle, Control, Image } from "@babylonjs/gui";
import { FPSController } from "./FPSController";
import { PlayerHealth } from "./PlayerHealth";
import { Enemy } from "./Enemy";
import { Mutant } from "./Mutant";
import { Boss } from "./Boss";
import { Zombie } from "./Zombie";
import { UtilityLayerRenderer, Engine, int, KeyboardEventTypes, SceneOptimizer, SceneOptimizerOptions, Tools, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material, float, Light } from "@babylonjs/core";
import { Round } from "./Round";

//import { CustomLoadingUI } from "./CustomLoadingUi";


enum State { START = 0, GAME = 1, LOSE = 2, CUTSCENE = 3 }

class App {
    // General Entire Application
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _difficulty: int;
    private _velocity: float;
    private _velocity2: float;
    private _velocity3: float;
    private _transition: boolean = false;
    private _skyboxMaterial: SkyMaterial;
    private _gameScene: Scene;
    private _fightAmbianceMusic: Sound;
    private _horrorAmbianceMusic: Sound;
    private _round: Round;
    private _cooldown: int = 30000;
    private _currentRound: int = 1;
    private _isdead: boolean;
    private nighted: boolean = false;
    public cpt2: number = 9999;
    //private customLoadingUI = new CustomLoadingUI();

    private difficultyLevels: string[];  // Declare difficultyLevels property
    private currentDifficultyIndex: number;

    //all weapons
    private _fps: FPSController;
    private ammoIMG: Image;
    private ammo2IMG: Image;

    //Zombies
    private _enemies: Array<Enemy>;
    private _enemy: Enemy;
    private _zombie: Zombie;
    private _boss: Boss;
    private _mutant: Mutant;
    private _zombie_Max_Health: number;
    private _zombie_Damage: number;
    private _mutant_Max_Health: number;
    private _mutant_Damage: number;
    private _boss_Max_Health: number;
    private _boss_Damage: number;

    //Scene - related
    private _state: number = 0;

    constructor() {
        //assign the canvas and engine
        this._canvas = this._createCanvas();
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);


        var camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), this._scene);
        camera.attachControl(this._canvas, true);
        this.main();
    }


    private async main(): Promise<void> {
        await this.goToStart();
        // Register a render loop to repeatedly render the scene
        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.CUTSCENE:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    break;
                case State.LOSE:
                    this._scene.render();
                    break;
                default: break;
            }
        });

        //resize if the screen is resized/rotated
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    /**
     * Main menu GUI
     */
    private async goToStart() {
        this._scene.detachControl(); //dont detect any inputs from this ui while the game is loading
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        // Create a fullscreen UI for all of our GUI elements
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        guiMenu.idealHeight = 720; // Fit our fullscreen UI to this height

        const imageRect = new Rectangle("titleContainer");
        imageRect.width = 1;
        imageRect.thickness = 0;
        guiMenu.addControl(imageRect);

        const startbg = new Image("startbg", "/sprites/start.jpg");
        imageRect.addControl(startbg);

        const howToPlayImage = new Image("howToPlayImage", "/sprites/tuto.png");
        howToPlayImage.width = 0.55;
        howToPlayImage.height = 0.7;
        imageRect.addControl(howToPlayImage);
        howToPlayImage.isVisible = false; // Initiallement cachée


        const titleContainer = new Rectangle("titleContainer");
        titleContainer.width = 0.8;
        titleContainer.thickness = 0;
        titleContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        titleContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        imageRect.addControl(titleContainer);

        const title = new TextBlock("title", "AGONIA");
        title.resizeToFit = true;
        title.fontFamily = "Ceviche One";
        title.fontSize = "75px";
        title.color = "white";
        title.resizeToFit = true;
        title.top = "10px";
        title.width = 0.8;
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        titleContainer.addControl(title);  // Add the title to the container

        const mainPanel = new StackPanel();
        mainPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        mainPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        mainPanel.left = "150px"; // Increase the margin to the left
        mainPanel.top = "-50px"; // Increase the margin to the top
        mainPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; // Align the main panel to the left
        guiMenu.addControl(mainPanel);

        const startBtn = this.createTextButton("start", "Jouer");
        mainPanel.addControl(startBtn);

        this.difficultyLevels = ["Difficulté : facile", "Difficulté : Expérimenté", "Difficulté : ! TERREUR !"];  // Difficulty levels
        this.currentDifficultyIndex = 0;  // Start with the first difficulty level

        const difficultyBtn = this.createDifficultyButton("difficulty", this.difficultyLevels[this.currentDifficultyIndex]);
        mainPanel.addControl(difficultyBtn);

        const howToPlayBtn = this.createTextButton("howtoplay", "Comment jouer ?");
        mainPanel.addControl(howToPlayBtn);

        howToPlayBtn.onPointerDownObservable.add(() => {
            if (howToPlayImage.isVisible == true)
                howToPlayImage.isVisible = false;
            else {
                howToPlayImage.isVisible = true;
            }
        });

        startBtn.onPointerDownObservable.add(() => {
            this.goToGame();
            scene.detachControl();
        });

        // Set difficulty based on currentDifficultyIndex
        if (this.currentDifficultyIndex === 0) { // Easy difficulty
            this._difficulty = 400;
            this._velocity = 0.4;
            this._zombie_Max_Health = 125;
            this._zombie_Damage = 20;
            this._velocity2 = 0.35;
            this._mutant_Max_Health = 200;
            this._mutant_Damage = 25;
            this._velocity3 = 0.35;
            this._boss_Max_Health = 350;
            this._boss_Damage = 22;
        } else if (this.currentDifficultyIndex === 1) { // Experienced difficulty
            this._difficulty = 250;
            this._velocity = 0.7;
            this._zombie_Max_Health = 160;
            this._zombie_Damage = 50;
            this._velocity2 = 0.55;
            this._mutant_Max_Health = 250;
            this._mutant_Damage = 55;
            this._velocity3 = 0.55;
            this._boss_Max_Health = 425;
            this._boss_Damage = 45;
        } else if (this.currentDifficultyIndex === 2) { // Terror difficulty
            this._difficulty = 100;
            this._velocity = 1;
            this._zombie_Max_Health = 225;
            this._zombie_Damage = 80;
            this._velocity2 = 0.8;
            this._mutant_Max_Health = 325;
            this._mutant_Damage = 120;
            this._velocity3 = 0.8;
            this._boss_Max_Health = 525;
            this._boss_Damage = 70;
        }

        await scene.whenReadyAsync();


        this._scene.dispose();
        this._scene = scene;
        this._state = State.GAME;
    }

    private createTextButton(name: string, text: string) {
        const btnContainer = new Rectangle();
        btnContainer.width = "500px";
        btnContainer.height = "75px";
        btnContainer.cornerRadius = 0;
        btnContainer.thickness = 0;
        btnContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        btnContainer.paddingLeft = "0px"; // Add a left padding to create a margin
        btnContainer.color = "transparent"; // Set the container color to transparent

        const btnText = new TextBlock();
        btnText.text = text;
        btnText.color = "white";
        btnText.fontSize = "25px";
        btnText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; // Align the text to the left
        btnText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        btnContainer.addControl(btnText);

        return btnContainer;
    }

    private createDifficultyButton(name: string, text: string) {
        const btnContainer = new Rectangle();
        btnContainer.width = "550px";
        btnContainer.height = "75px";
        btnContainer.cornerRadius = 0;
        btnContainer.thickness = 0;
        btnContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        btnContainer.paddingLeft = "0px"; // Add a left padding to create a margin
        btnContainer.color = "transparent"; // Set the container color to transparent

        const btn = Button.CreateSimpleButton(name, "");
        btn.width = "100%";
        btn.height = "100%";
        btn.color = "white";
        btn.fontSize = "25px";
        btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; // Align the button to the left
        btn.thickness = 0; // Remove the border by setting the thickness to 0

        const btnText = new TextBlock();
        btnText.text = text;
        btnText.color = "white";
        btnText.fontSize = "25px";
        btnText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; // Align the text to the left
        btnText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        btn.addControl(btnText);
        btnContainer.addControl(btn);

        btn.onPointerDownObservable.add(() => {
            this.currentDifficultyIndex = (this.currentDifficultyIndex + 1) % this.difficultyLevels.length;
            btnText.text = this.difficultyLevels[this.currentDifficultyIndex];
        });

        return btnContainer;
    }


    /**
     * launched every 60ms 
     */
    private update() {
        this._scene.onReadyObservable.addOnce(() => {
            setInterval(() => {
                console.log(Enemy.unleashEnemies)
                if (Enemy.unleashEnemies) {
                    if (Enemy.enemyRotation % 3 === 0 && this.cpt2 % 3 === 0 && this.cpt2 !== 9999) {
                        this._zombie.velocityChase = this._velocity;
                        this._zombie.maxHealth = this._zombie_Max_Health;
                        this._zombie.damage = this._zombie_Damage;
                        this._zombie.changePosition();
                        this._mutant.sleep();
                        this._boss.sleep();
                        this.cpt2++;
                    }

                    else if (Enemy.enemyRotation % 3 === 1 && this.cpt2 % 3 === 1) {
                        this._mutant.velocityChase = this._velocity2;
                        this._mutant.maxHealth = this._mutant_Max_Health;
                        this._mutant.damage = this._mutant_Damage;
                        this._mutant.changePosition();
                        this._zombie.sleep();
                        this._boss.sleep();
                        this.cpt2++;
                    }
                    else if (Enemy.enemyRotation % 3 === 2 && this.cpt2 % 3 === 2) {
                        this._boss.velocityChase = this._velocity3;
                        this._boss.maxHealth = this._boss_Max_Health;
                        this._boss.damage = this._boss_Damage;
                        this._boss.changePosition();
                        this._mutant.sleep();
                        this._zombie.sleep();
                        this.cpt2++;
                    }

                    if (PlayerHealth._current_Health <= 0) {
                        this._isdead = true;
                        this._state = State.LOSE;
                        this.goToLose();
                    }
                    if (Enemy.unleashEnemies && !this.nighted) {
                        this.night();
                        console.log("night");
                        this.cpt2 = 0;
                    }
                    else {
                        clearInterval(1);
                    }
                }}, 60);

        })
    }

    /**
     * generate all meshes with glb map file
     */
    private async createMap(): Promise<void> {

        this._horrorAmbianceMusic = new Sound("horror", "sounds/horror.mp3", this._scene, null, {
            loop: true,
            autoplay: false,
            volume: 0.5
        });

        //sound         
        this._fightAmbianceMusic = new Sound("fight", "sounds/fight.mp3", this._scene, null, {
            loop: true,
            autoplay: false,
            volume: 0.8
        });

        // Sky material
        var skyboxMaterial = new SkyMaterial("skyMaterial", this._scene);
        skyboxMaterial.backFaceCulling = false;

        // Sky mesh (box)
        var skybox = Mesh.CreateBox("skyBox", 1000.0, this._scene);
        skybox.material = skyboxMaterial;
        skyboxMaterial.luminance = 0;
        this._skyboxMaterial = skyboxMaterial;

        // Manually set the sun position
        skyboxMaterial.useSunPosition = false; // Do not set sun position from azimuth and inclination
        skyboxMaterial.sunPosition = new Vector3(0, 100, 0);

        const result = await SceneLoader.ImportMeshAsync("", "./models/", "SampleScene.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();

        //hitbox
        allMeshes.map(allMeshes => {
            allMeshes.checkCollisions = true;
        })
    }
    // the 3 enemies of each wave
    private createEnemies() {
        this._enemies =
            [this._zombie = new Zombie(this._gameScene, this._canvas, this._difficulty, this._velocity, "zombie"),
            this._mutant = new Mutant(this._gameScene, this._canvas, this._difficulty, this._velocity2, "mutant"),
            this._boss = new Boss(this._gameScene, this._canvas, this._difficulty, this._velocity3, "boss"),
            ]

    }

    private disableEnemies() {
        for (var enemy of this._enemies) {
            enemy.zombieMeshes.setEnabled(false);
        }
    }
    private enableEnemies() {
        for (var enemy of this._enemies) {
            enemy.zombieMeshes.setEnabled(true);
        }
    }

    // launch the day and its functions, checks..
    public async day() {
        this.disableEnemies();
        if (!this._isdead) {
            this._currentRound += 1;
        }
        this._round.day();
        this._isdead = false;
        this._zombie.currentHealth = this._zombie.maxHealth;
        this._mutant.currentHealth = this._mutant.maxHealth;
        this._boss.currentHealth = this._boss.maxHealth;
        this._zombie.changePosition();
        this._zombie.sleep();
        this._mutant.changePosition();
        this._mutant.sleep();
        this._boss.changePosition();
        this._boss.sleep();
    }

    // launch the night and its functions, implementations...
    private async night() {
        this._round.night();
        this.enableEnemies();
        this.nighted = true;
    }

    /**
     * launch FirstPersonController.ts and change scene to "in game" one
     */
    private async goToGame() {
        let scene = new Scene(this._engine);
        this._gameScene = scene;
        this._scene.detachControl();
        this.createEnemies();
        this._fps = new FPSController(this._gameScene, this._canvas, this._zombie, this._mutant, this._boss, this._zombie);

        this._gameScene.onPointerDown = (evt) => {
            if (evt.button === 0)//left click
            {
                this._engine.enterPointerlock();
            }
            if (evt.button === 1)//middle click
            {
                this._engine.exitPointerlock();
            }
        }
        //stable framerate for using gravity
        const framesPerSecond = 60;
        const gravity = -9.81; //earth one
        this._gameScene.gravity = new Vector3(0, gravity / framesPerSecond, 0);
        this._gameScene.collisionsEnabled = true;
        //get rid of start scene, switch to gamescene and change states
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = this._gameScene;
        this._scene.detachControl();
        this._engine.loadingUIText = "\nChargement en cours... \nLe chargement peut prendre quelques minutes selon votre connexion internet.\n Merci de patienter.";
        this._engine.displayLoadingUI();
        await this.createMap();
        this._fps.createLights();
        await this._scene.whenReadyAsync();

        //AFTER LOADING
        this._engine.hideLoadingUI();
        //this._scene.debugLayer.show();
        this._fps.diableCarpet();
        this._scene.attachControl();
        this._fps.openDoorAtStart();
        this._fps.deleteBug();
        this._fps.correctHitbox();
        let options = new SceneOptimizerOptions(60, 2000);
        let optimizer = new SceneOptimizer(this._scene, options);

        optimizer.start();

        //this._fps.spawnGhost2();
        this._fps.spawnGhost1();
        this._fps.spawnboxTrigger1();
        this._fps.spawnboxTrigger2();
        this._fps.spawnboxTrigger12();
        this._fps.getMeshWeapons();
        this.disableEnemies();
        this._round = new Round(this._scene, this._canvas, this._skyboxMaterial, this._fightAmbianceMusic, this._horrorAmbianceMusic);
        this.day();
        this.update();
        const guiGame = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        guiGame.idealHeight = 50; //fit our fullscreen ui to this height

        //Rect that will contains all the gui bellow
        const imageRect = new Rectangle("titleContainer");
        imageRect.width = 1;
        imageRect.thickness = 0;
        guiGame.addControl(imageRect);

        //Croissair
        const crossHairImg = new Image("crossHairImg", "/sprites/cross.png");
        crossHairImg.width = "5%";
        crossHairImg.stretch = Image.STRETCH_UNIFORM;
        crossHairImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        crossHairImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        imageRect.addControl(crossHairImg);

        /*const ammoContainer = new Rectangle("ammoContainer");
        ammoContainer.thickness = 0;
        ammoContainer.width = "6%";
        ammoContainer.height = "5%";
        ammoContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        ammoContainer.top = "-42px";
        ammoContainer.paddingBottomInPixels = -45;

        this.ammoIMG = new Image("ammoImg", "/sprites/HUD_Ammo_full.png");
        this.ammoIMG.stretch = Image.STRETCH_UNIFORM;
        this.ammoIMG.width = 1;  // Set this to 1 to fill the parent
        this.ammoIMG.height = 1;  // Set this to 1 to fill the parent

        this.ammo2IMG = new Image("ammoImg2", "/sprites/HUD_Ammo_Empty.png");
        this.ammo2IMG.stretch = Image.STRETCH_UNIFORM;
        this.ammo2IMG.width = 1;  // Set this to 1 to fill the parent
        this.ammo2IMG.height = 1;  // Set this to 1 to fill the parent

        ammoContainer.addControl(this.ammoIMG);
        ammoContainer.addControl(this.ammo2IMG);

        //Ammo amount / Ammo max
        const ammoNb = new TextBlock("ammoNb", "" + FPSController._ammo);
        ammoNb.resizeToFit = true;
        ammoNb.fontFamily = "Strasse";
        var fontSizePercentage = 0.07 / 100;
        ammoNb.fontSize = (window.innerHeight + window.innerWidth) / 2 * fontSizePercentage;
        ammoNb.color = "black";
        ammoNb.resizeToFit = true;
        ammoNb.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;  // Set alignment to center
        ammoNb.paddingLeftInPixels = 1;

        ammoContainer.addControl(ammoNb);
        imageRect.addControl(ammoContainer);
        //healthBar Management
        //healthBar Management
        var hbImg = new Image("healthbar", "/sprites/HUD_Healthbar.png");
        var hbImgRed = new Image("healthbarred", "/sprites/HUD_Healthbar_Red.png");
        hbImgRed.color = "red";
        hbImgRed.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; // Align to right

        var container = new Rectangle("container");
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        container.top = "-18px";
        container.height = "12%";
        container.width = "15%";
        container.paddingBottom="3px";
        container.thickness = 0;
        container.alpha = 1;
        container.addControl(hbImg); // Add background first
        container.addControl(hbImgRed); // Add red health bar second so it's on top

        guiGame.addControl(container);

        this._scene.onAfterRenderObservable.add(function () {
            // Update the width of the red health bar
            hbImgRed.width = PlayerHealth._current_Health / PlayerHealth._max_Health;

            ammoNb.text = "";
            ammoNb.text = "   " + FPSController._ammo + "/" + FPSController._max_ammo;
        })*/
    }

    /**
     * If playerHealth == 0 display lose screen to retry
     */
    public async goToLose(): Promise<void> {
        this._engine.displayLoadingUI();

        //--SCENE SETUP--
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        //--GUI--
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        guiMenu.idealHeight = 720;

        //background image
        const image = new Image("lose", "sprites/lose.jpeg");
        image.autoScale = true;
        guiMenu.addControl(image);

        const panel = new StackPanel();
        guiMenu.addControl(panel);

        const text = new TextBlock();
        text.fontSize = 24;
        text.color = "white";
        text.height = "100px";
        text.width = "100%";
        panel.addControl(text);

        text.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
        text.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
        text.text = "You died !";
        const dots = new TextBlock();
        dots.color = "white";
        dots.fontSize = 24;
        dots.height = "100px";
        dots.width = "100%";
        dots.text = "...."

        const mainBtn = Button.CreateSimpleButton("mainmenu", "MAIN MENU");
        mainBtn.width = 0.2;
        mainBtn.height = "40px";
        mainBtn.color = "white";
        panel.addControl(mainBtn);

        Effect.RegisterShader("fade",
            "precision highp float;" +
            "varying vec2 vUV;" +
            "uniform sampler2D textureSampler; " +
            "uniform float fadeLevel; " +
            "void main(void){" +
            "vec4 baseColor = texture2D(textureSampler, vUV) * fadeLevel;" +
            "baseColor.a = 1.0;" +
            "gl_FragColor = baseColor;" +
            "}");

        let fadeLevel = 1.0;
        this._transition = false;
        scene.registerBeforeRender(() => {
            if (this._transition) {
                fadeLevel -= .05;
                if (fadeLevel <= 0) {
                    this.goToStart();
                    this._transition = false;
                }
            }
        })

        //this handles interactions with the start button attached to the scene
        mainBtn.onPointerUpObservable.add(() => {
            //todo: add fade transition & selection sfx
            scene.detachControl();
            guiMenu.dispose();
            this._transition = true;
        });

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); //when the scene is ready, hide loading
        //lastly set the current state to the lose state and set the scene to the lose scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
    }

    /**
     * set up the canvas
     * @returns this canvas
     */
    private _createCanvas(): HTMLCanvasElement {

        //Commented out for development
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        //create the canvas html element and attach it to the webpage
        this._canvas = document.createElement("canvas");
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.id = "gameCanvas";
        document.body.appendChild(this._canvas);

        return this._canvas;
    }
}
new App();
