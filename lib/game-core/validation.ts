import type {CharacterId} from '../characters';
export type Validator<T>=(value:unknown)=>T;
const invalid=():never=>{throw Error('Invalid data');};
export const finite:Validator<number>=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=Number.MAX_SAFE_INTEGER?v:invalid();
export const nonnegative:Validator<number>=v=>{const n=finite(v);return n>=0?n:invalid();};
export const integer:Validator<number>=v=>{const n=nonnegative(v);return Number.isSafeInteger(n)?n:invalid();};
export const bool:Validator<boolean>=v=>typeof v==='boolean'?v:invalid();
export const text=(max=128):Validator<string>=>v=>{
  if(typeof v!=='string'||!v.length||v.length>max)return invalid();
  for(let i=0;i<v.length;i++){const code=v.charCodeAt(i);if(code<32||code===127)return invalid();}return v;
};
export const id:Validator<string>=v=>{const s=text()(v);return /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(s)?s:invalid();};
export const oneOf=<const T extends readonly (string|number)[]>(values:T):Validator<T[number]>=>v=>values.includes(v as T[number])?v as T[number]:invalid();
export const nullable=<T>(parse:Validator<T>):Validator<T|null>=>v=>v===null?null:parse(v);
export const bounded=(min:number,max:number):Validator<number>=>v=>{const n=finite(v);return n>=min&&n<=max?n:invalid();};
export const list=<T>(parse:Validator<T>,max=32):Validator<T[]>=>v=>{
  if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length>max||Reflect.ownKeys(v).length!==v.length+1)return invalid();
  const result:T[]=[];for(let i=0;i<v.length;i++){
    const descriptor=Object.getOwnPropertyDescriptor(v,String(i));
    if(!descriptor||!('value' in descriptor))return invalid();result.push(parse(descriptor.value));
  }return result;
};
type Schema=Record<string,Validator<unknown>>;
export const object=<S extends Schema>(schema:S):Validator<{[K in keyof S]:ReturnType<S[K]>}>=>v=>{
  if(!v||typeof v!=='object'||Object.getPrototypeOf(v)!==Object.prototype)return invalid();
  const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descriptors),expected=Object.keys(schema);
  if(keys.length!==expected.length||keys.some(k=>typeof k!=='string'||!Object.hasOwn(schema,k)))return invalid();
  const result:Record<string,unknown>={};
  for(const key of expected){const d=descriptors[key];if(!d||!('value' in d)||!d.enumerable)return invalid();result[key]=schema[key](d.value);}
  return result as {[K in keyof S]:ReturnType<S[K]>};
};
export const team=oneOf(['red','green']);
export const character=oneOf(['robot','ciici','kaka','buto','jago','raja','lala','maria','kumis','boke','tui','lui','bebe','kodo'] as const satisfies readonly CharacterId[]);
export const point=object({x:finite,y:finite});
export function safely<T>(parse:Validator<T>,value:unknown):T|null {try{return parse(value);}catch{return null;}}
