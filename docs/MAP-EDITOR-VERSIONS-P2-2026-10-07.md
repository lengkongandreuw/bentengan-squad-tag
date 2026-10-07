# Map Editor: active vs draft P2 — 7 October 2026

Implemented locally; no publish, map activation or source map document changes.

The map selector now distinguishes three groups: active local configuration,
saved editor drafts/versions to edit, and unused original/archived versions.
Native selection always opens the original template, never an inactive saved
replacement. Active saved maps have a read-only preview entry and a separate
editable entry. Status, source ID, document revision and unsaved edits are shown.
“Active local” does not claim that GitHub Pages already has that revision.

Read-only preview disables canvas mutation, upload, property editing, Save,
Undo/Redo, polygon editing and selected-arena management. Zoom and visual overlays
remain available. “Buka versi editor tersimpan” opens an existing draft without
overwriting it; if none exists, “Buat draft dari versi ini” creates an inactive
unsaved in-memory draft. Restoring the original is not required for inspection.
Cancelling an unsaved-edit switch retains both the edits and the selected entry.
3D remains explicitly list-management-only, with no misleading edit handoff.

Validation: 80 core/multiplayer/map/pixel tests passed. Isolated Chrome verified
Taman active native vs saved draft object counts, readonly controls, safe draft
handoff, cancel/accept dirty switching, custom active maps, 3D guard and creating
an inactive new draft using a detached API fixture. No POST requests occurred;
the real map config bytes were unchanged. Evidence: `outputs/map-versions/`.

Save open drafts before restarting an older Map Studio server:
Ctrl+C in its terminal, then `npm run admin:maps` from the game project. Reload
the editor. Existing user server processes were not stopped automatically.
