import { AbstractMesh, Color3, CurrentScreenBlock, DynamicTexture, int, Mesh,  MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CubeMapToSphericalPolynomialTools } from "babylonjs";
import { FPSController } from "./FPSController";

export class PlayerHealth {

    protected _scene: Scene;
    public _player_Mesh: AbstractMesh;
    public static _max_Health: int;
    public static _current_Health: int;

    constructor(scene: Scene, mesh: AbstractMesh, maxHealth: int)
    {
        this._scene=scene;
        this._player_Mesh=mesh;
        PlayerHealth._current_Health=maxHealth;
    }
}