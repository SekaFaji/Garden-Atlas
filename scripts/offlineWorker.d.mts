export declare function listOfflineAssets(distDir:string):Promise<string[]>;
export declare function makeWorker(assets:string[],digest:string,base?:string):string;
export declare function writeOfflineWorker(distDir:string,base?:string):Promise<string[]>;
