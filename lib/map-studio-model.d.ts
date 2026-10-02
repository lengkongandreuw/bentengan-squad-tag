export interface MapAsset {asset:string;width:number;height:number;frames:Array<{x:number;y:number;width:number;height:number}>;fps:number}
export interface MapObject {id:string;name:string;asset:MapAsset|null;x:number;y:number;w:number;h:number;rotation:number;opacity:number;layer:string;z:number;behavior:string;slow:number;shape:string;points:Array<{x:number;y:number}>;visible:boolean;locked:boolean;mirror:boolean}
export interface StudioMap {id:`studio-${string}`;name:string;description:string;width:number;height:number;enabled:boolean;terrain:MapAsset|null;icon:MapAsset|null;terrainMode:string;tileSize:number;objects:MapObject[];bases:Record<'blue'|'red',{x:number;y:number}>;prisons:Record<'blue'|'red',{x:number;y:number;w:number;h:number}>}
export function validateMap(m:unknown):StudioMap;
export function validateDocument(d:unknown):{version:number;maps:StudioMap[]};
export function contains(o:MapObject,x:number,y:number):boolean;
export function touches(o:MapObject,x:number,y:number,r?:number):boolean;
export function waterAt(m:StudioMap,x:number,y:number):boolean;
export function solidAt(m:StudioMap,x:number,y:number,r?:number,jumping?:boolean):boolean;
export function speedAt(m:StudioMap,x:number,y:number):number;
export function frameAt(a:MapAsset,ms:number):MapAsset['frames'][number];
export function mapIssues(m:StudioMap):Array<{object?:string;message:string}>;
export function validateAsset(a:unknown):MapAsset|null;
export const BEHAVIORS:string[];
export const LAYERS:string[];
