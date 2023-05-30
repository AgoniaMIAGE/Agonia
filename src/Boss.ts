import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { FPSController } from "./FPSController";
import { Enemy } from "./Enemy";

export class Boss extends Enemy {

    
    public override async CreateEnemy(position: Vector3): Promise<any> {
        const result = await SceneLoader.ImportMeshAsync("", "./models/", "monster.glb", this.scene);
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
        this._attack = this.scene.getAnimationGroupByName("Monster_01.Sit_Attack_2");
        this._fallingBack = this.scene.getAnimationGroupByName("Monster_01.Sit_Dead_1");
        this._hit = this.scene.getAnimationGroupByName("Monster_01.Sit_Get_Hit_1");
        this._idle = this.scene.getAnimationGroupByName("Monster_01.Sit_Idle_2");
        this._run = this.scene.getAnimationGroupByName("Monster_01.Sit_Run");
        this._walk = this.scene.getAnimationGroupByName("Monster_01.Sit_Walk");
        this._scream = this.scene.getAnimationGroupByName("Monster_01.Sit_Shout");
        this._setUpAnimations();

        allMeshes.map(allMeshes => {
            allMeshes.checkCollisions = true;
            allMeshes.ellipsoid = new Vector3(1, 1, 1);
        })
    }

}
