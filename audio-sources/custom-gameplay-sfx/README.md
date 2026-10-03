# Custom gameplay SFX — preparation only

UPDATE2026-10-04: user authorized Module16 implementation and then explicitly
requested GitHub publication. Original preparation notes below are historical.
Runtime normalized copies now live in public/audio/gameplay/ (all source hashes
preserved). GameplayAudio routes cached decoded samples through existing master;
3x procedural boost compensated for samples.20 actual MP3s decoded in real browser,
durations/peaks/RMS inspected; mute tested.9 focused tests and37 progression tests
pass. Countdown5.98s playback rate fits existing2.8s countdown, no timer change.
See newest CHECKPOINT for deployment status. No subjective listening sign-off is
claimed: final gain balance should be reviewed by the user during play.

Received 2026-10-04. User requested saving and studying for a future feature,
NOT implementation or publication. The implementation instructions inside
IMPLEMENTATION-BRIEF.txt are a future specification, not current authorization.

20 original-named MP3 masters copied from
`C:/Users/lenovo/Documents/benteng/sound/new sfx/`.
Total 1,570,611 bytes (~1.50 MiB); all20 source/copy SHA256 hashes match.
Original external files remain untouched. This directory is outside public/:
no new runtime assets, gameplay changes, commit, or deployment performed.

## Proposed mapping from supplied brief

| Source master | Future event / purpose |
| --- | --- |
| boost2.MP3 | dash / boost start |
| Player Captured.MP3 | caught |
| Rescue Start.MP3 | rescue action start |
| release.MP3 | rescued / successful release |
| enter enemy base.MP3 | fort-enter |
| Objective Success plus BENTENG.mp3 | fort-captured primary |
| Objective Success.MP3 | fort-captured sample fallback |
| tag1.MP3, tag2.MP3, tag3.MP3, tag4.MP3 | one random tag impact; avoid immediate repeat |
| total coundown.MP3 | countdown once at start; whole-sequence assumption needs listening |
| ultimate.MP3 | Raja/Kaka activation once |
| victory.MP3, defeat.MP3 | resolved final outcome once |
| first tag.mp3 | streak1 |
| double tag.mp3 | streak2 |
| tripple tag.mp3 | streak3; preserve original spelling |
| gas terus.mp3 | streak4 |
| tag rampage.mp3 | streak5; do not repeat for6+ |

Use actual `Objective Success plus BENTENG.mp3`, not the alternative filename
mentioned in the brief. Normalize runtime copies only when implementation starts.

## Future behavior and boundaries

- Local controlled player's valid tags only advance streak. Impact and announcer
  are separate layers.10-second named streak window;100–250ms announcer delay.
- Reset after timeout, captured, match end/restart/exit. Bot tags, rescue, dash,
  and base entry do not advance/reset it. Cancel stale queued announcers on reset.
- Base success: special sample -> generic sample -> procedural fallback, never
  stack the three. Fire once on confirmed capture, not entry/progress.
- Reuse GameplayAudio AudioContext/cache/output and existing SFX master. Preserve
  procedural step/prison and procedural fallback for current effects. Failed
  sample loading must not block gameplay. Respect GitHub Pages base path.
- Do not change music, gameplay/balance, sprites/editors/progression/UI layout.
- Focused audio tests, TypeScript, Pages build and runtime audio smoke checks;
  no unrelated asset generators. Future implementation brief says stop locally
  after validation unless user explicitly requests publication.

## Current code findings for next task

- lib/gameplay-audio.ts has9 procedural IDs, one AudioContext, GainNode ->
  compressor, per-ID cooldowns (.13s step,3.5s prison,.18s others).
- Existing master multiplies SFX by SFX_BOOST=3; custom sample gain/loudness and
  clipping must be checked, not assumed safe from suggested gain values.
- lib/audio-settings.ts owns music/SFX storage and live volume event. Reuse it.
- app/prototype.tsx existing event sites (line numbers may shift): rescue3903,
  fort capture4067, dash4243/5329, tag/caught4730–4732, rescue success4839–4841,
  footsteps/prison/base entry5326–5333, cleanup6879–6881.
- Successful rescue currently uses `rescued` for the freed controlled player,
  but `rescue` for a controlled rescuer; reconcile these semantics carefully.
- Countdown/ultimate/outcome need explicit transition hooks and duplicate guards;
  no playback from React render. Do not implement merely from these line numbers.

Audio content has NOT been auditioned or decoder-validated yet; duration, trim,
loudness, whole-countdown content, and mixing are pending implementation checks.
Hash verification confirms faithful copies, not audible quality/decodability.
