# BENTENG — Custom In-Game SFX + Tag Counter Announcer
## Codex Implementation Brief — Token Efficient

> **Scope:** Replace selected procedural gameplay SFX with user-provided MP3 files, add Tag Counter announcer 1–5, and add a dedicated enemy-base capture success sound.
> **Do not touch:** music system, gameplay mechanics, character balance, sprites, Map Studio, Sprite Studio, progression, UI layout.
> **Goal:** Improve gameplay feedback with minimal code changes, reusable audio routing, and safe fallback behavior.

---

# 1. Read First

Before implementation, read only:

- `memori.md`
- `CHECKPOINT.md`
- `lib/gameplay-audio.ts`
- `lib/audio-settings.ts`
- relevant sections of `app/prototype.tsx` where gameplay/audio events are fired

Do not scan or rebuild unrelated systems.

If `CHECKPOINT.md` has an ACTIVE unrelated task, preserve all current user work.

---

# 2. Current Audio Baseline

Current procedural gameplay sound IDs:

```ts
type GameplaySound =
  | 'step'
  | 'dash'
  | 'tag'
  | 'caught'
  | 'prison'
  | 'rescued'
  | 'rescue'
  | 'fort-enter'
  | 'fort-captured';
```

Existing procedural effects must remain available as fallback when a custom audio sample fails to load.

Existing SFX volume must remain the single master control.

Do not create another SFX volume system.

---

# 3. User-Provided Audio Files

Expected source files:

```text
boost2.MP3
defeat.MP3
enter enemy base.MP3
Objective Success.MP3
Player Captured.MP3
release.MP3
Rescue Start.MP3
tag1.MP3
tag2.MP3
tag3.MP3
tag4.MP3
total coundown.MP3
ultimate.MP3
victory.MP3

first tag.mp3
double tag.mp3
tripple tag.mp3
gas terus.mp3
tag rampage.mp3

Objective Success plus BENTENG.mp3
```

User request text may refer to the final file as:

```text
objectives complete plus BENTENG.mp3
```

The visible supplied filename is:

```text
Objective Success plus BENTENG.mp3
```

Codex must search for the actual file present in the repository and use the real filename rather than inventing a missing path.

Preserve source files.

Runtime copies may use normalized lowercase names.

---

# 4. Core Gameplay SFX Mapping

| Source File | Runtime Event | Existing Event | Behavior |
|---|---|---|---|
| `boost2.MP3` | Sprint / boost start | `dash` | Play once when boost starts |
| `Player Captured.MP3` | Player captured | `caught` | Play once when player becomes captured |
| `Rescue Start.MP3` | Rescue interaction | `rescue` | Play on rescue action trigger |
| `release.MP3` | Successful release | `rescued` | Play once after rescue succeeds |
| `enter enemy base.MP3` | Enter enemy base | `fort-enter` | Play once on valid enemy-base entry |
| `Objective Success.MP3` | Generic objective success | `fort-captured` fallback | Use only as fallback/general success sample |
| `Objective Success plus BENTENG.mp3` | Enemy base successfully captured | `fort-captured` primary | Preferred final capture sound |
| `tag1.MP3` | Tag impact variation 1 | `tag` | Random pool |
| `tag2.MP3` | Tag impact variation 2 | `tag` | Random pool |
| `tag3.MP3` | Tag impact variation 3 | `tag` | Random pool |
| `tag4.MP3` | Tag impact variation 4 | `tag` | Random pool |
| `total coundown.MP3` | Match countdown | new sound ID | Play once when countdown starts |
| `ultimate.MP3` | Ultimate activation | new sound ID | Play once when Ultimate starts |
| `victory.MP3` | Final victory | new sound ID | Play once |
| `defeat.MP3` | Final defeat | new sound ID | Play once |

---

# 5. Tag Counter Announcer

Add a separate announcer layer for consecutive player Tags.

This is NOT a replacement for `tag1–4.MP3`.

Every successful Tag should produce:

```text
Tag Impact SFX
+
Tag Counter Announcer when applicable
```

The impact sound remains short and tactile.

The announcer communicates the streak milestone.

---

# 6. Tag Counter Dialog Mapping

Use exactly:

```text
1 Tag  -> first tag.mp3
2 Tags -> double tag.mp3
3 Tags -> tripple tag.mp3
4 Tags -> gas terus.mp3
5 Tags -> tag rampage.mp3
```

Conceptual dialog:

```text
1 = FIRST TAG!
2 = DOUBLE TAG!
3 = TRIPLE TAG!
4 = GAS TERUS!
5 = TAG RAMPAGE! GILA!
```

Do not rename the original source file solely because `tripple` is misspelled.

Runtime copy may be normalized to:

```text
tag-counter-01.mp3
tag-counter-02.mp3
tag-counter-03.mp3
tag-counter-04.mp3
tag-counter-05.mp3
```

---

# 7. Tag Counter Behavior

Treat this as a **consecutive Tag streak**, similar to shooter-game multi-kill feedback.

Recommended rules:

```text
first valid player Tag
→ counter = 1

another valid player Tag inside streak window
→ counter + 1
```

Recommended streak window:

```text
10 seconds
```

Make the value a small named constant so balancing is easy.

Example:

```ts
const TAG_STREAK_WINDOW_MS = 10_000;
```

---

# 8. Tag Counter Reset Rules

Reset the counter when:

```text
10 seconds pass without another valid player Tag
OR
player becomes captured
OR
match ends
OR
match restarts
OR
player exits the active match
```

Do not reset because:

```text
another player/bot makes a Tag
player performs Rescue
player uses Sprint
player enters enemy base
```

The streak belongs to the local controlled player.

---

# 9. Tag Counter Maximum

Counter announcement stops escalating after level 5.

Recommended behavior:

```text
Tag 1 -> FIRST TAG
Tag 2 -> DOUBLE TAG
Tag 3 -> TRIPLE TAG
Tag 4 -> GAS TERUS
Tag 5 -> TAG RAMPAGE
Tag 6+ -> no new announcer tier
```

The normal `tag1–4` impact sound still plays for every valid Tag.

Do NOT replay `tag rampage.mp3` on every Tag after five.

This avoids announcer spam.

---

# 10. Player-Only Announcer

Tag Counter announcer must track the **local controlled player only**.

Do not announce:

- ally bot Tags
- enemy bot Tags
- passive simulation events

Bot Tags may keep normal gameplay Tag SFX if current behavior already supports them, but they must not increment the player's announcer streak.

---

# 11. Tag Impact Variation

`tag1–4.MP3` remain a random impact pool.

On every valid Tag:

```text
choose exactly one sample
```

Avoid immediate repetition.

Suggested state:

```ts
lastTagSampleIndex
```

Pick a new random index different from the previous index whenever possible.

Do not play multiple tag impact files simultaneously.

---

# 12. Tag Audio Timing

Recommended sequence:

```text
successful Tag event
     ↓
play one random Tag impact immediately
     ↓
increment local-player Tag streak
     ↓
if streak is 1–5:
    play announcer with a very short delay
```

Suggested announcer delay:

```text
100–250 ms
```

Purpose:

- impact lands first
- voice remains intelligible
- avoids both sounds masking each other

Use one small constant.

Do not add large delays that make feedback feel disconnected.

---

# 13. Enemy Base Capture Sound

When the local player/team successfully completes the enemy-base objective, use:

```text
Objective Success plus BENTENG.mp3
```

as the **primary `fort-captured` sample**.

The existing:

```text
Objective Success.MP3
```

should remain available as:

```text
fallback
```

Do not play both simultaneously by default.

Preferred behavior:

```text
fort-captured
    ↓
try Objective Success plus BENTENG
    ↓
if unavailable/failed
    ↓
Objective Success
    ↓
if unavailable
    ↓
existing procedural fort-captured fallback
```

This creates a three-layer safety path without audio stacking.

---

# 14. Objective Capture Trigger

Play the special capture SFX only when the objective is actually completed.

Do not trigger it merely because:

```text
player enters enemy base
player begins capture
capture progress increases
player is standing inside base
```

Those belong to `fort-enter` or existing gameplay state.

Special success file fires on:

```text
confirmed objective/base capture
```

exactly once for that objective completion.

---

# 15. Sounds Not Replaced Yet

Keep procedural:

```text
step
prison
```

No dedicated custom source is currently supplied.

Do not remove their procedural code.

---

# 16. Recommended Runtime Asset Structure

Normalize runtime copies:

```text
public/audio/gameplay/
├── boost.mp3
├── captured.mp3
├── rescue-start.mp3
├── released.mp3
├── enemy-base-enter.mp3
├── objective-success.mp3
├── objective-success-benteng.mp3
├── tag-01.mp3
├── tag-02.mp3
├── tag-03.mp3
├── tag-04.mp3
├── countdown.mp3
├── ultimate.mp3
├── victory.mp3
├── defeat.mp3
│
└── announcer/
    ├── tag-counter-01.mp3
    ├── tag-counter-02.mp3
    ├── tag-counter-03.mp3
    ├── tag-counter-04.mp3
    └── tag-counter-05.mp3
```

Preserve user source files.

Do not delete or overwrite source masters unnecessarily.

---

# 17. Recommended Audio Architecture

Do not scatter HTML Audio elements throughout gameplay code.

Extend the existing `GameplayAudio`.

Preferred flow:

```text
Gameplay Event
     ↓
GameplayAudio.play(sound)
     ↓
Decoded Custom Sample Available?
   ↙                       ↘
 YES                       NO
 ↓                          ↓
AudioBuffer              Procedural
Playback                 Fallback
```

For Tag Counter:

```text
Player Tag Event
     ↓
GameplayAudio.play('tag')
     ↓
TagStreakTracker
     ↓
GameplayAudio.playTagCounter(level)
```

Keep streak state small and local to match/gameplay state.

Do not create a large new subsystem.

---

# 18. Recommended Sound IDs

Extend only as required:

```ts
type GameplaySound =
  | 'step'
  | 'dash'
  | 'tag'
  | 'caught'
  | 'prison'
  | 'rescued'
  | 'rescue'
  | 'fort-enter'
  | 'fort-captured'
  | 'countdown'
  | 'ultimate'
  | 'victory'
  | 'defeat';
```

Tag counter can use a dedicated method:

```ts
playTagCounter(level: 1 | 2 | 3 | 4 | 5)
```

This is preferable to adding five unrelated gameplay sound IDs.

---

# 19. Sample Manifest

Recommended compact mapping:

```ts
const SAMPLE_FILES = {
  dash: 'audio/gameplay/boost.mp3',
  caught: 'audio/gameplay/captured.mp3',
  rescue: 'audio/gameplay/rescue-start.mp3',
  rescued: 'audio/gameplay/released.mp3',
  'fort-enter': 'audio/gameplay/enemy-base-enter.mp3',
  'fort-captured': 'audio/gameplay/objective-success-benteng.mp3',
  countdown: 'audio/gameplay/countdown.mp3',
  ultimate: 'audio/gameplay/ultimate.mp3',
  victory: 'audio/gameplay/victory.mp3',
  defeat: 'audio/gameplay/defeat.mp3',
} as const;
```

Fallback for `fort-captured`:

```ts
objective-success.mp3
```

Tag pool:

```ts
const TAG_SAMPLE_FILES = [
  'audio/gameplay/tag-01.mp3',
  'audio/gameplay/tag-02.mp3',
  'audio/gameplay/tag-03.mp3',
  'audio/gameplay/tag-04.mp3',
];
```

Announcer:

```ts
const TAG_COUNTER_FILES = {
  1: 'audio/gameplay/announcer/tag-counter-01.mp3',
  2: 'audio/gameplay/announcer/tag-counter-02.mp3',
  3: 'audio/gameplay/announcer/tag-counter-03.mp3',
  4: 'audio/gameplay/announcer/tag-counter-04.mp3',
  5: 'audio/gameplay/announcer/tag-counter-05.mp3',
} as const;
```

Use existing public/base path logic so GitHub Pages subpath works.

---

# 20. Loading Strategy

Reuse the existing Web Audio `AudioContext`.

Recommended:

```text
fetch
→ arrayBuffer
→ decodeAudioData
→ AudioBuffer cache
```

Playback:

```text
AudioBufferSourceNode
→ optional per-sound GainNode
→ existing SFX output/compressor
```

Requirements:

- preload once
- cache decoded audio
- failed audio must never block gameplay
- do not create AudioContext per sample
- autoplay restrictions remain safely handled

---

# 21. Preload

Preload this small SFX set during gameplay audio initialization or existing match asset preparation.

Do not add a mandatory loading delay solely because an announcer file failed.

If custom audio is unavailable:

```text
game still starts
```

---

# 22. Volume

All new files must use the existing SFX master.

Includes:

```text
normal Tag impact
Tag Counter announcer
objective capture special sound
victory
defeat
ultimate
countdown
```

Requirements:

- SFX mute affects them
- live SFX slider affects them
- music volume remains separate
- do not create announcer volume UI

A small internal announcer multiplier is acceptable.

---

# 23. Recommended Internal Gain

Initial suggestion:

```text
dash                    0.85
tag impact              0.85
tag announcer           1.00
caught                  1.00
rescue                  0.90
rescued                 1.00
fort-enter              0.90
fort-captured special   1.00
countdown               0.95
ultimate                1.00
victory                 1.00
defeat                  1.00
```

These are multipliers under the existing SFX master.

Avoid clipping.

Do not amplify above safe output without runtime testing.

---

# 24. Countdown

`total coundown.MP3` is assumed to contain the whole countdown sequence.

Play once:

```text
when match countdown sequence begins
```

Do not trigger once for every number unless inspection proves the file contains only one cue.

---

# 25. Ultimate

Use `ultimate.MP3` as the generic current activation sound for:

```text
Raja
Kaka
```

Trigger once when Ultimate activation begins.

Do not modify Ultimate behavior.

---

# 26. Victory / Defeat

Play:

```text
victory.MP3
```

or:

```text
defeat.MP3
```

exactly once after final match outcome is resolved.

Do not bind playback directly to React render.

Avoid repeated playback from:

- rerender
- profile update
- progression update
- opening result details

---

# 27. Rescue Semantics

Map:

```text
Rescue Start.MP3 -> rescue
release.MP3      -> rescued
```

Meaning:

```text
rescue
= interaction/action cue

rescued
= successful release confirmation
```

Keep both.

---

# 28. Cooldowns

Preserve current anti-spam logic.

Custom sounds must obey similar protection.

Especially:

```text
dash
tag
fort-enter
```

Tag announcer should not use the same cooldown as normal Tag impact because its playback is controlled by streak level.

---

# 29. Implementation Order

## Stage A — Inspect

Locate actual trigger points for:

```text
dash
tag
caught
rescue
rescued
fort-enter
fort-captured
countdown
ultimate
victory
defeat
```

Also identify how to reliably detect:

```text
Tag made by local controlled player
```

Do not change behavior yet.

## Stage B — Assets

Locate the supplied MP3 files.

Copy/normalize only required files into:

```text
public/audio/gameplay/
```

Do not touch unrelated assets.

## Stage C — Sample Loader

Extend `GameplayAudio` with:

```text
sample manifest
AudioBuffer cache
sample playback
fallback
tag variation pool
tag announcer playback
```

## Stage D — Existing Event Replacement

Wire custom samples for:

```text
dash
tag
caught
rescue
rescued
fort-enter
fort-captured
```

Keep procedural fallback.

## Stage E — Match-Level SFX

Wire:

```text
countdown
ultimate
victory
defeat
```

Use existing state transitions.

## Stage F — Tag Counter

Implement only the small streak tracker:

```text
count
lastTagTimestamp
```

Rules:

```text
10 second window
reset on caught
reset on match end/restart/exit
max announcer tier = 5
```

Connect to player Tag event.

## Stage G — Validate

Run focused tests and runtime smoke test.

Stop.

---

# 30. Expected Files to Change

Prefer:

```text
lib/gameplay-audio.ts
app/prototype.tsx
public/audio/gameplay/*
CHECKPOINT.md
memori.md
```

Optional focused test:

```text
scripts/test-gameplay-audio.mjs
```

Only edit `lib/audio-settings.ts` if strictly necessary.

Do not touch unrelated components.

---

# 31. Required Automated Validation

At minimum:

```bash
npx tsc --noEmit
npm run build:pages
```

Add focused tests for:

```text
base SFX paths
5 Tag Counter paths
tag pool count = 4
tag streak reset logic
max announcer tier = 5
fort-captured primary/fallback mapping
duplicate result cue protection if testable
```

Do not run unrelated asset generators.

Do not run:

```text
npm run sprites:build
npm run fields:build
npm run ui:build
```

unless a real dependency requires them.

---

# 32. Runtime Checklist

## Existing / Replacement SFX

- [ ] boost custom sample plays
- [ ] captured sample plays once
- [ ] rescue-start plays
- [ ] release plays
- [ ] enemy-base-enter plays
- [ ] special BENTENG objective capture plays once
- [ ] generic Objective Success works as fallback
- [ ] countdown plays once
- [ ] Ultimate plays once per activation
- [ ] victory plays once
- [ ] defeat plays once

## Tag Impact

- [ ] every valid Tag plays one tag1–4 variation
- [ ] variation avoids immediate repetition
- [ ] never plays all four together

## Tag Counter

- [ ] first player Tag -> first tag
- [ ] second consecutive -> double tag
- [ ] third -> tripple tag
- [ ] fourth -> gas terus
- [ ] fifth -> tag rampage
- [ ] sixth+ does not repeatedly replay rampage
- [ ] streak resets after 10 seconds
- [ ] streak resets when player is captured
- [ ] streak resets on match end
- [ ] bot Tags do not increment local player's streak

## Existing Procedural Fallback

- [ ] step still works
- [ ] prison still works
- [ ] missing custom sample does not break gameplay

## Volume

- [ ] SFX slider controls custom samples
- [ ] SFX slider controls announcer
- [ ] SFX mute works
- [ ] music remains independent

## Platform

- [ ] GitHub Pages base path works
- [ ] no console errors
- [ ] no unnecessary network reload on each sound

---

# 33. Explicit Non-Goals

Do not implement:

```text
new footsteps
new prison ambience
character voice lines
announcer beyond Tag 1–5
3D positional audio
distance attenuation
dynamic music
audio editor
admin audio panel
audio conversion pipeline
UI click replacement
new progression sounds
new gameplay mechanics
```

---

# 34. Definition of Done

Complete when:

- [ ] supplied gameplay MP3 files are integrated
- [ ] `tag1–4` are a random impact pool
- [ ] Tag Counter 1–5 works
- [ ] Tag Counter is player-only
- [ ] Tag Counter resets correctly
- [ ] Tag Counter never spams tier 5 indefinitely
- [ ] `Objective Success plus BENTENG.mp3` is primary successful-base-capture sound
- [ ] generic `Objective Success.MP3` is fallback
- [ ] procedural fallback remains available
- [ ] step remains procedural
- [ ] prison remains procedural
- [ ] existing SFX volume system controls all new sounds
- [ ] missing audio does not block gameplay
- [ ] TypeScript passes
- [ ] production build passes
- [ ] runtime smoke test passes
- [ ] `CHECKPOINT.md` updated
- [ ] no unrelated systems changed

---

# 35. Codex Final Instruction

Implement **this sound modification task only**.

Priorities:

```text
minimal diff
→ reuse GameplayAudio
→ custom samples
→ Tag impact variation
→ Tag Counter announcer
→ special BENTENG capture cue
→ safe fallback
→ no gameplay regression
```

After validation:

```text
update CHECKPOINT.md
STOP
```

Do not publish unless explicitly requested.
