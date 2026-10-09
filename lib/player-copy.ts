import type {CharacterRole} from './characters';
export const roleLabel:Record<CharacterRole,string>={Wall:'Penjaga',Rescuer:'Penyelamat',Runner:'Pelari',Chaser:'Pemburu','All-rounder':'Serbabisa',Scout:'Pengintai',Disruptor:'Pengacau'};
export function playerStateLabel(state:string){return ({ACTIVE:'Di lapangan',IN_BASE:'Di benteng',PRISONER:'Ditahan',RETURNING:'Pulang',FALLING:'Jatuh'} as Record<string,string>)[state]??'Bersiap';}
export const arenaCopy:Record<string,string>={kampung:'Lapangan lega, jalur mudah dibaca. Tempat pas buat belajar tag dan bantu tim.',pasar:'Lorong sempit, banyak tikungan. Cocok buat mengecoh lawan.',taman:'Jalur berimbang dengan banyak rintangan. Pilih jalan, lalu parkour.',kanal:'Jembatan jadi rebutan. Lewat parkour buat mencari jalan lain.',kanal2:'Area tengah lebih lega. Jaga jembatan sambil cari celah ke benteng lawan.',kampung3d:'Sudut pandang 3D, aturan bentengan tetap sama.'};
export function playerArenaCopy(id:string,description:string,replaces?:string){
  // Editor notes stay untouched in map data. Only player-facing presentation changes.
  if(description&&!/footprint|terrain|collider|versi editor|upload|eksperimental|prototype/i.test(description))return description;
  return arenaCopy[replaces??id]??'Kenali jalurnya, bantu timmu, lalu cari celah ke benteng lawan.';
}
