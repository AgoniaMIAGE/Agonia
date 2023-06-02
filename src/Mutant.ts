import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { FPSController } from "./FPSController";
import { Enemy } from "./Enemy";

export class Mutant extends Enemy {
    public isSleeping: Boolean;

    public override async CreateEnemy(): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "monster2.glb", this.scene);
        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.position = new Vector3(26.519 , 0 , 182.086);
        env.scaling = new Vector3(1.5, 1.5, -1.5);
        env.name = this.name;
        this.currentHealth = this.maxHealth;
        this.zombieMeshes = env;
        this.targetMesh = this.scene.getMeshByName("Creature_03_Mesh");

        //Animations
        this._attack = this.scene.getAnimationGroupByName("Monster_03.Sit_Attack_2");
        this._fallingBack = this.scene.getAnimationGroupByName("Monster_03.Sit_Dead_1");
        this._hit = this.scene.getAnimationGroupByName("Monster_03.Sit_Get_Hit_1");
        this._idle = this.scene.getAnimationGroupByName("Monster_03.Sit_Idle_2");
        this._run = this.scene.getAnimationGroupByName("Monster_03.Sit_Run");
        this._walk = this.scene.getAnimationGroupByName("Monster_03.Sit_Walk");
        this._scream = this.scene.getAnimationGroupByName("Monster_03.Sit_Shout");
        this._sleep = this.scene.getAnimationGroupByName("Monster_03.Sit_Sleep");
        this._animation1 = this.scene.getAnimationGroupByName("Monster_03.Sit_On_The_Celing_Idle");
        this._setUpAnimations();
        // Create hitbox mesh
        let hitbox = MeshBuilder.CreateBox("hitboxM", { size: 1 }, this.scene);
        hitbox.position.y = 0.4;

        // Attach hitbox to the enemy mesh
        hitbox.parent = env;

        // Make the hitbox invisible
        let hitboxMaterial = new StandardMaterial("hitboxMaterial", this.scene);
        hitboxMaterial.alpha = 0.00;
        hitbox.material = hitboxMaterial;
    }
}