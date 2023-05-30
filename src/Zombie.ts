import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { FPSController } from "./FPSController";
import { Enemy } from "./Enemy";

export class Zombie extends Enemy {

    public override async CreateEnemy(position: Vector3): Promise<any> {
    const result = await SceneLoader.ImportMeshAsync("", "./models/", "monster1.glb", this.scene);
    let env = result.meshes[0];
    let allMeshes = env.getChildMeshes();
    env.position = position;
    env.scaling = new Vector3(1, 1, -1);
    env.name = this.name;
    this.maxHealth = 70;
    this.damage = 5;
    this.currentHealth = this.maxHealth;
    this.zombieMeshes = env;

    //Animations
    this._attack = this.scene.getAnimationGroupByName("Monster_04.Sit_Attack_6");
    this._fallingBack = this.scene.getAnimationGroupByName("Monster_04.Sit_Dead_1");
    this._hit = this.scene.getAnimationGroupByName("Monster_04.Sit_Get_Hit_1");
    this._idle = this.scene.getAnimationGroupByName("Monster_04.Sit_Idle_2");
    this._run = this.scene.getAnimationGroupByName("Monster_04.Sit_Run");
    this._walk = this.scene.getAnimationGroupByName("Monster_04.Sit_Walk");
    this._scream = this.scene.getAnimationGroupByName("Monster_04.Sit_Shout");
    this._sleep = this.scene.getAnimationGroupByName("Monster_04.Sit_Sleep");
    this._animation1 = this.scene.getAnimationGroupByName("Monster_04.Sit_On_The_Celing_Idle")
    this._setUpAnimations();

    allMeshes.map(allMeshes => {
        allMeshes.checkCollisions = true;
        allMeshes.ellipsoid = new Vector3(1, -0.5, 1);
    })

}
}
