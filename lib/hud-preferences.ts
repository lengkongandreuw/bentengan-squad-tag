export type HudPreferences={scale:number;contrast:boolean};
export function normalizeHudPreferences(value:unknown):HudPreferences {
  const candidate=value&&typeof value==='object'?value as Partial<HudPreferences>:{};
  return {scale:typeof candidate.scale==='number'&&Number.isFinite(candidate.scale)?Math.round(Math.max(1,Math.min(1.3,candidate.scale))*10)/10:1,contrast:candidate.contrast===true};
}
