# Progression Core — regression 01–15

Local-only implementation. No sprite/map/audio rebuild is required for this suite.

## Repeat validation

```powershell
npm run test:progression
npx tsc --noEmit
npm run build:pages
```

Tests use isolated in-memory storage; they never edit a player's browser profile.
Rendering the result/notification components must not award or persist rewards.

## Automated coverage

- Fresh profile: XP0, level1, only Raja + Kaka and Kampung unlocked.
- One integrated campaign journey saves and reloads after every match, satisfies
  all six arena tiers and reaches level13/all14 characters. Arena counters and
  existing aggregate wins/losses/KDA remain consistent.
- XP completion/victory/action caps, every configured level threshold, maximum
  level, next-character goals and exact result breakdown.
- One reward/save per completed match. Immediate duplicates, stale callers and
  duplicates after reload give zero XP/no notifications/no extra saves.
- Incomplete matches do not earn rewards or consume a match ID.
- Legacy, malformed/partial progression and future-version profile migration;
  identity/history/historical unlocks preserved, no invented per-arena wins.
- Locked character/arena/faction/unknown IDs and missing profiles reject launch.
  Random choices and arena rotation use unlocked content only.
- Runtime wiring retains full bot roster and stable per-match IDs, one reward
  writer, no profile-change dependency restarting the gameplay effect.
- One nonblocking notification panel for multiple character+arena unlocks;
  dismissal hides the notice, duplicate/unapplied results never announce content.
- Notice events are transient, not reconstructed from persistent profile unlock
  lists. Reload drops the result/event, not the unlocked content.

## Manual browser smoke

Use a separate localhost origin/profile, not the user's Studio tabs or live profile.
Inspect both team starters, keyboard selection, disabled locked cards, all-map
requirement inspection, match completion, result/notification dismissal, rematch,
profile reload and desktop/mobile layout. Keep the existing gameplay controls and
result actions. Reset temporary browser viewport overrides after testing.

Verified 2026-10-03: isolated localhost3006 profile Regress15 starts with Raja/Kaka,
locked keyboard/card gates and Kampung only. A real completed loss records100XP,
one loss/one prison; rematch clears the old result; reload retains profile stats.
Second real match wins with1tag: +168XP, cumulative268XP/Lv2, Bebe and Pasar
unlock in one panel. Dismiss preserves XP/result; reload drops the notice event.
After reload, Bebe is selectable and the arena arrow selects Pasar; no replayed
notice. These are normal player UI actions, not direct storage/state injection.
Local ignored UI fixture uses the production resolver/components to verify one
panel with Bebe+Pasar, dismiss without changing284XP, duplicate0XP/no notice, no
notice after reload, desktop and390x844 mobile with no horizontal overflow.
Fixture is not a live match and never reads/writes a user's profile. Earlier
modules10–13 also verified real final result/rematch and desktop/mobile runtime.
Map/Sprite Studio config SHA256 hashes unchanged during14–15; no sprite/audio/
font/map asset rebuild or modifications. Existing build warnings documented below.

## Boundaries / known limitations

- Local-browser progression, not authenticated or tamper-proof; no server/cloud
  sync, multi-tab transactional reward lock or account linkage.
- Duplicate ID history retains the latest50 matches. It is not an infinite replay
  ledger; concurrent independent tabs are outside this protection contract.
- Clearing browser storage loses local progression. A failed reward save reports
  an error rather than pretending the reward/unlock is durable.
- Notification dismissal needs no separate durable queue: old events are never
  restored on reload. Reload may skip a notice not yet read; its unlock remains.
- Legacy migration estimates aggregate XP, not unknowable historical arena wins.
- Unconfigured new/custom arenas need explicit progression rules (unless already
  historically unlocked); they are not automatically treated as free-play.
- Arena rotation retains the existing three-completed-match counter semantics.
- Existing production CSS at-rule/chunk-size warnings are unrelated to progression.

Future candidates (not implemented): achievement, daily mission, cloud save.
