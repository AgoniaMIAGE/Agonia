export class CustomLoadingUI {
    private loadingDiv: HTMLDivElement;
    private progressMap: { [key: string]: number } = {};

    constructor() {
        this.loadingDiv = document.createElement('div');
        this.loadingDiv.id = 'customLoadingScreenDiv';
        this.loadingDiv.style.display = 'none';
        this.loadingDiv.innerHTML = 'Loading...';
        document.body.appendChild(this.loadingDiv);

        const style = document.createElement('style');
        style.innerHTML = `
            #customLoadingScreenDiv {
                background-color: #BB464Bcc;
                color: white;
                font-size: 50px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }

    displayLoadingUI() {
        this.loadingDiv.style.display = 'initial';
    }

    hideLoadingUI() {
        this.loadingDiv.style.display = 'none';
    }

    onProgress(name: string, progress: number) {
        this.progressMap[name] = progress;

        const sum = Object.values(this.progressMap).reduce((a, b) => a + b, 0);
        const average = sum / Object.keys(this.progressMap).length;
        this.loadingDiv.innerHTML = `Loading: ${average.toFixed(2)}%`;
    }
}
