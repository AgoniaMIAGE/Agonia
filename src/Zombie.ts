import * as BabylonViewer from '@babylonjs/viewer';
import { Engine, Tools, KeyboardEventTypes, Space, AnimationGroup, int, AbstractMesh, float, ArcRotateCamera, OimoJSPlugin, SpotLight, HemisphericLight, Scene, Animation, Vector3, Mesh, Color3, Color4, ShadowGenerator, GlowLayer, PointLight, FreeCamera, CubeTexture, Sound, PostProcess, Effect, SceneLoader, Matrix, MeshBuilder, Quaternion, AssetsManager, StandardMaterial, PBRMaterial, Material } from "@babylonjs/core";
import { TPSController } from "./TPSController";
import { Enemy } from "./Enemy";

export class Zombie extends Enemy {

    public override async CreateEnemy(position: Vector3): Promise<any> {
    const result = await SceneLoader.ImportMeshAsync("", "./models/", "zombie.glb", this.scene);
    let env = result.meshes[0];
    let allMeshes = env.getChildMeshes();
    env.position = position;
    env.scaling = new Vector3(1.5, 1.5, -1.5);
    env.name = this.name;
    this.maxHealth = 70;
    this.damage = 14;
    this.currentHealth = this.maxHealth;
    this.zombieMeshes = env;

    //Animations
    this._attack = this.scene.getAnimationGroupByName("Ch10_nonPBR.Zombie_Punching");
    this._fallingBack = this.scene.getAnimationGroupByName("Ch10_nonPBR.Zombie_Death");
    this._hit = this.scene.getAnimationGroupByName("Ch10_nonPBR.Zombie_Reaction_Hit_(1)");
    this._idle = this.scene.getAnimationGroupByName("Ch10_nonPBR.Zombie_Idle");
    this._run = this.scene.getAnimationGroupByName("Ch10_nonPBR.Zombie_Running");
    this._walk = this.scene.getAnimationGroupByName("Ch10_nonPBR.Zombie_Running");
    this._scream = this.scene.getAnimationGroupByName("Ch10_nonPBR.Zombie_Scream");
    this._setUpAnimations();
    this._animateZombie()

    allMeshes.map(allMeshes => {
        allMeshes.checkCollisions = true;
        allMeshes.ellipsoid = new Vector3(1, 1, 1);
    })

}
}
