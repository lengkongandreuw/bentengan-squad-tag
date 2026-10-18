import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import postcss from 'postcss';
import parser from 'postcss-selector-parser';
const old=['action-dock','control-ribbon','ultimate-buff-indicator','active-objective','gameplay-guidance'];
void test('phase11 removes retired renderers and their CSS, while retaining live shared HUD/settings',async()=>{
 for(const name of old)await assert.rejects(access(`modules/ui/${name}.tsx`));
 for(const file of ['app/globals.css','app/ux-priority.css','modules/ui/desktop-ux.css','modules/ui/pause-hub.css','modules/ui/tutorial-coach.css']){
  const root=postcss.parse(await readFile(file,'utf8'));
  root.walkRules(rule=>parser(ast=>ast.walkClasses(c=>assert(![...old,'dock-status'].includes(c.value),`${file}: dead selector .${c.value}`))).processSync(rule.selector));
 }
 const source=await readFile('app/prototype.tsx','utf8'),pause=await readFile('modules/ui/pause-overlay.tsx','utf8'),overview=await readFile('modules/ui/pause-match-overview.tsx','utf8'),map=await readFile('modules/ui/pause-map.tsx','utf8'),settings=await readFile('modules/ui/hud-settings.tsx','utf8');
 for(const id of ['ActionDock','ControlRibbon','UltimateBuffIndicator','ActiveObjective','GameplayGuidance'])assert(!source.includes(`<${id}`));
 assert(source.includes('useHudPreferences'));assert(settings.includes('normalizeHudPreferences'));assert(settings.includes('benteng-hud-preferences-v1'));
 assert(pause.includes('<HudSettings'));assert(overview.includes('<ArenaIntel'));assert(map.includes('<CameraSwitcher'));assert(source.includes('<UltimateMeterHud'));assert(source.includes('<MobileControls'));
});
