import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { TPSController } from "./TPSController";
import { Enemy } from "./Enemy";

export class Boss extends Enemy {

    
    public override async CreateEnemy(position: Vector3): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "boss.glb", this.scene);
        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.position = position;
        env.scaling = new Vector3(1.7, 1.7, -1.7);
        env.name = this.name;
        this.maxHealth = 110;
        this.damage = 40;
        this.currentHealth = this.maxHealth;
        this.zombieMeshes = env;

        //Animations
        this._attack = this.scene.getAnimationGroupByName("Skeletonzombie_t_avelange.Mutant_Jump_Attack_1");
        this._fallingBack = this.scene.getAnimationGroupByName("Skeletonzombie_t_avelange.Falling_Back_Death_1");
        this._hit = this.scene.getAnimationGroupByName("Skeletonzombie_t_avelange.Zombie_Reaction_Hit_1");
        this._idle = this.scene.getAnimationGroupByName("Skeletonzombie_t_avelange.Idle_(1)");
        this._run = this.scene.getAnimationGroupByName("Skeletonzombie_t_avelange.Fast_Run_1");
        this._walk = this.scene.getAnimationGroupByName("Skeletonzombie_t_avelange.Walking_1");
        this._scream = this.scene.getAnimationGroupByName("Skeletonzombie_t_avelange.Zombie_Scream_1");
        this._setUpAnimations();
        this._animateZombie()

        allMeshes.map(allMeshes => {
            allMeshes.checkCollisions = true;
            allMeshes.ellipsoid = new Vector3(1, 1, 1);
        })
    }

}
