# Benteng voice and presentation copy

Voice: a quick-thinking teammate, lightly playful, serious when it matters.
Use kamu; short active sentences. No forced slang or jokes in transactions/errors.
Controls say what they do. Character flavor is separate from precise passive stats.
Glossary: benteng, arena, pertandingan, ronde; tag = tangkap; rescue = bebaskan.
Keep established gameplay labels boost, sprint, parkour, ultimate, DOI and XP.

Remove developer/debug terms from player UI, not internal identifiers or admin tools.
Map editor notes remain untouched; playerArenaCopy provides a presentation-only
fallback for technical descriptions. Character role enums remain unchanged;
roleLabel translates only display. No gameplay/stat/reward/price changes.

Scope: name setup, 14 character descriptions/passives, role/stat labels, rules,
tutorial/missions, map descriptions, pause, multiplayer, result rewards/unlocks,
upgrade labels/transaction feedback, profile labels and audio actions.
Retain actual timing, flight restrictions, local-data and anti-cheat disclosures.
Local storage failure never announces successful reward/purchase.

Validation: copy regression checks all 14 numeric/identity definitions against
HEAD; rules retain critical timings and flight restrictions; TypeScript,
core/multiplayer and UI tests. Test selectors follow renamed controls.
Artwork files and admin-only terminology remain unchanged.
# Language

English is the default. Players can switch to Indonesia in Audio Settings or Graphics Settings, before a match or while paused. The preference applies immediately and is stored separately from player progression. Indonesian source copy and the English dictionary stay paired in `lib/player-translations.ts`; presentation uses `t`, never translated entity IDs or network rules. Keep character names, Tim Merah / Tim Hijau, arena names and named abilities original. Keep DOI, XP, tag, rescue, sprint, boost, parkour and ultimate recognizable.

