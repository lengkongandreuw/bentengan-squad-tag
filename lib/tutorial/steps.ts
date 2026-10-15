import type {TutorialStepId,TutorialControl,TutorialSignalKind} from './types.ts';
type Step = {id:TutorialStepId;en:string;idText:string;control:TutorialControl;signal:TutorialSignalKind;recovery:'repeat'|'director'|'handoff';next:TutorialStepId|null};
const rows: [TutorialStepId,string,string,TutorialControl,TutorialSignalKind,Step['recovery']][] = [
  ['intro_ui','Back your squad. Take their fort. Ready?','Bantu timmu. Rebut benteng lawan. Siap?',null,'ACK','repeat'],
  ['move','Move out of your fort.','Bergerak keluar bentengmu.','move','MOVED','repeat'],
  ['sprint','Sprint while moving for a burst of speed.','Sprint sambil bergerak untuk melesat.','sprint','SPRINTED','repeat'],
  ['parkour','Jump with Parkour—even on open ground.','Lompat dengan Parkour—di tanah kosong juga bisa.','parkour','PARKOURED','repeat'],
  ['tag_enemy','Touch an opponent who left their fort before you.','Sentuh lawan yang keluar benteng lebih dulu.','tag','TAGGED','director'],
  ['observe_prison','Tagged opponents go to your prison. Look for the captured player.','Lawan yang kena tag masuk penjaramu. Lihat pemain yang tertangkap.',null,'ACK','repeat'],
  ['rescue_friend','Touch your captured teammate to rescue them.','Sentuh teman yang tertangkap untuk membebaskannya.','rescue','RESCUED','director'],
  ['ultimate','When your meter is full, activate your Ultimate.','Saat meter penuh, aktifkan Ultimate.','ultimate','ULTIMATE','director'],
  ['capture_benteng','Reach the enemy fort and hold it to capture.','Capai benteng lawan dan bertahan untuk merebutnya.','fort','FORT_CAPTURED','director'],
  ['match_complete','Finish the practice match.','Selesaikan pertandingan latihan.',null,'MATCH_ENDED','director'],
  ['reward','Your first Benteng. Your first rewards.','Benteng pertamamu. Hadiah pertamamu.',null,'REWARD_SAVED','handoff'],
  ['character_unlock','Your profile shows which characters you can unlock next.','Profilmu menunjukkan karakter yang bisa dibuka berikutnya.',null,'CHARACTER_EXPLAINED','handoff'],
  ['map_unlock','Win and progress to unlock more arenas.','Menang dan naik level untuk membuka arena lainnya.',null,'MAP_EXPLAINED','handoff'],
  ['complete','Training complete. Your squad is waiting.','Latihan selesai. Timmu menunggu.',null,'ACK','handoff'],
];
export const TUTORIAL_STEPS:readonly Step[]=rows.map(([id,en,idText,control,signal,recovery],index)=>({id,en,idText,control,signal,recovery,next:rows[index+1]?.[0]??null}));
export const tutorialStep=(id:string)=>TUTORIAL_STEPS.find(step=>step.id===id)??null;
