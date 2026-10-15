export type TutorialStepId = 'intro_ui'|'move'|'sprint'|'parkour'|'tag_enemy'|'observe_prison'|'rescue_friend'|'ultimate'|'capture_benteng'|'match_complete'|'reward'|'character_unlock'|'map_unlock'|'complete';
export type TutorialControl = 'move'|'sprint'|'parkour'|'tag'|'rescue'|'ultimate'|'fort'|null;
export type TutorialSignalKind = 'ACK'|'MOVED'|'SPRINTED'|'PARKOURED'|'TAGGED'|'RESCUED'|'ULTIMATE'|'FORT_CAPTURED'|'MATCH_ENDED'|'REWARD_SAVED'|'CHARACTER_EXPLAINED'|'MAP_EXPLAINED';
export type TutorialSignal = {serial:number;kind:TutorialSignalKind;expectedStep?:TutorialStepId};
export type TutorialSession = {stepId:TutorialStepId;lastSerial:number;transitions:number;finished:boolean;lastSuccess:string|null};
