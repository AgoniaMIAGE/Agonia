import { ILoadingScreen, Engine, ISceneLoaderProgressEvent } from "@babylonjs/core";

export class CustomLoadingScreen implements ILoadingScreen {
    public loadingUIText: string;
    public loadingUIBackgroundColor: string;
    private _loadingDiv: HTMLDivElement;
    private _loadingText: HTMLParagraphElement;
    private _progressBar: HTMLDivElement;

    constructor(loadingUIText = "Loading...", loadingUIBackgroundColor = "black") {
        this.loadingUIText = loadingUIText;
        this.loadingUIBackgroundColor = loadingUIBackgroundColor;

        this._loadingDiv = document.createElement("div");
        this._loadingDiv.id = "customLoadingScreenDiv";
        this._loadingDiv.style.position = "fixed";
        this._loadingDiv.style.top = "0";
        this._loadingDiv.style.bottom = "0";
        this._loadingDiv.style.left = "0";
        this._loadingDiv.style.right = "0";
        this._loadingDiv.style.background = this.loadingUIBackgroundColor;
        this._loadingDiv.style.zIndex = "1000";
        this._loadingDiv.style.color = "white";
        this._loadingDiv.style.fontFamily = "Arial";
        this._loadingDiv.style.display = "flex";
        this._loadingDiv.style.flexDirection = "column";
        this._loadingDiv.style.justifyContent = "center";
        this._loadingDiv.style.alignItems = "center";

        this._loadingText = document.createElement("p");
        this._loadingText.textContent = `${this.loadingUIText}`;
        this._loadingText.style.margin = "20px";

        this._progressBar = document.createElement("div");
        this._progressBar.style.width = "50%";
        this._progressBar.style.minWidth = "250px";
        this._progressBar.style.height = "30px";
        this._progressBar.style.background = "rgba(255, 255, 255, 0.2)";
        this._progressBar.style.borderRadius = "15px";
        this._progressBar.style.overflow = "hidden";
        this._progressBar.style.position = "relative";

        this._loadingDiv.appendChild(this._loadingText);
        this._loadingDiv.appendChild(this._progressBar);
    }

    public displayLoadingUI(): void {
        if (!document.getElementById(this._loadingDiv.id)) {
            document.body.appendChild(this._loadingDiv);
            this._createProgressBar();
        }
    }

    public hideLoadingUI(): void {
        const loadingScreenDiv = document.getElementById('customLoadingScreenDiv');
        if (loadingScreenDiv) {
            loadingScreenDiv.remove();
        }
    }
    
    
    

    private _createProgressBar(): void {
        let progressBarInner = document.createElement("div");
        progressBarInner.style.position = "absolute";
        progressBarInner.style.top = "0";
        progressBarInner.style.left = "0";
        progressBarInner.style.width = "0";
        progressBarInner.style.height = "100%";
        progressBarInner.style.background = "white";
        progressBarInner.style.transition = "width ease-in 0.2s";
        progressBarInner.id = "progressBarInner";
        this._progressBar.appendChild(progressBarInner);
    }

    public onProgress(event: ISceneLoaderProgressEvent): void {
        const progressBarInner = document.getElementById("progressBarInner");
        if (progressBarInner && event.lengthComputable) {
            progressBarInner.style.width = `${(event.loaded / event.total) * 100}%`;
            this._loadingText.textContent = `${this.loadingUIText} ${(event.loaded / event.total) * 100}%`;
        }
    }
}
