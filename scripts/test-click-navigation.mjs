import assert from 'node:assert/strict';
import { clickRoute, clearSegment, pointerWorld } from '../lib/click-navigation.js';
const view = { x: 500, y: 300, width: 1000, height: 600, scale: 2 };
assert.deepEqual(pointerWorld({x:600,y:350},{left:100,top:50,width:1000,height:600},view),{x:500,y:300});
assert.deepEqual(pointerWorld({x:250,y:600},{left:100,top:100,width:300,height:500},view,true),{x:750,y:300});
const passable = (x,y) => x>=0 && y>=0 && x<480 && y<288 && !(x>190 && x<260 && y<220);
const start = {x:60,y:60}, target = {x:400,y:60};
const route = clickRoute(start,target,480,288,passable);
assert.ok(route.length>1,'Route must detour around wall/water, not walk straight');
let previous=start;
for(const waypoint of route){assert.ok(clearSegment(previous,waypoint,passable));previous=waypoint;}
assert.deepEqual(route.at(-1),target);
assert.deepEqual(clickRoute(start,{x:220,y:60},480,288,passable),[]);
assert.deepEqual(clickRoute(start,target,480,288,(x,y)=>passable(x,y)&& !(x>190&&x<260)),[]);
assert.deepEqual(clickRoute(start,{x:80,y:60},480,288,passable),[{x:80,y:60}]);
console.log('PASS click navigation: camera + rotated layout, detour, water/wall rejection, unreachable destination.');
