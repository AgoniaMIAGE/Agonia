import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { FPSController } from "./FPSController";
import { Enemy } from "./Enemy";

export class Mutant extends Enemy {

    public override async CreateEnemy(position: Vector3): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "mutant.glb", this.scene);
        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        env.position = position;
        env.scaling = new Vector3(1.5, 1.5, -1.5);
        env.name = this.name;
        this.maxHealth = 130;
        this.damage = 26;
        this.currentHealth = this.maxHealth;
        this.zombieMeshes = env;

        //Animations
        this._attack = this.scene.getAnimationGroupByName("Parasite_l_starkie.Mutant_Jump_Attack");
        this._fallingBack = this.scene.getAnimationGroupByName("Parasite_l_starkie.Falling_Back_Death");
        this._hit = this.scene.getAnimationGroupByName("Parasite_l_starkie.Zombie_Reaction_Hit");
        this._idle = this.scene.getAnimationGroupByName("Parasite_l_starkie.Idle_(1)");
        this._run = this.scene.getAnimationGroupByName("Parasite_l_starkie.Fast_Run");
        this._walk = this.scene.getAnimationGroupByName("Parasite_l_starkie.Walking");
        this._scream = this.scene.getAnimationGroupByName("Parasite_l_starkie.Zombie_Scream");
        this._setUpAnimations();
        this._animateZombie()

        allMeshes.map(allMeshes => {
            allMeshes.checkCollisions = true;
            allMeshes.ellipsoid = new Vector3(1, 1, 1);
        })

    }

}
