import { AbstractMesh, Color3, CurrentScreenBlock, DynamicTexture, int, Mesh,  MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CubeMapToSphericalPolynomialTools } from "babylonjs";
import { TPSController } from "./TPSController";

export class PlayerHealth {

    protected _scene: Scene;
    public _player_Mesh: AbstractMesh;
    public _max_Health: int;
    public static _current_Health: int;

    constructor(scene: Scene, mesh: AbstractMesh, maxHealth: int)
    {
        this._scene=scene;
        this._player_Mesh=mesh;
        this._max_Health=maxHealth;
        PlayerHealth._current_Health=maxHealth;
    }
}