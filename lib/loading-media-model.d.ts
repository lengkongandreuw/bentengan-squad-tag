export type LoadingMedia = {asset:string;kind:'image'|'video';fit:'contain'|'cover';preserveProgress?:boolean};
export type LoadingMediaDocument = {version:number;slots:Record<string,LoadingMedia>};
export const LOADING_SLOTS:Record<string,string>;
export function validSlot(value:unknown):boolean;
export function mediaPath(value:unknown):boolean;
export function validateLoadingMedia(value:unknown):LoadingMediaDocument;
export function resolveLoadingMedia(document:LoadingMediaDocument,slot:string,arenaId?:string):LoadingMedia|null;
export function loadingBootHtml(html:string,document:unknown):string;
export function usesBuiltinProgress(media:LoadingMedia|null):boolean;
