# Loading Studio (local only)

Run `npm run admin:loading` from the game repository; open http://127.0.0.1:4322/.
No game navigation link exposes the panel. Bind loopback only; never tunnel it.

Character wallpaper-only mode: preserveProgress:true keeps the original
team-loading-frame art, positioning, and real asset progress milestones;
the custom media changes only the background. Optional checkbox in the editor
previews this behavior and saves it alongside fit. Legacy overrides without
the flag continue replacing the full loading display.
Installed red loading2_animasi.gif and green loading1_animasi.gif are original
1280x720, 64-frame GIFs, unchanged bytes/timing, in public/loading-media.

Slots: initial Pages boot, red/green character asset loading, default match
loading, individual arena overrides, lazy multiplayer/profile panels and
multiplayer transport/host confirmation. Closing/leave controls remain usable
during connection loading.
Per-map override wins over match default. Reset removes only the override,
does not delete media. Empty configuration retains existing game loading art.
Boot applies to the Vite Pages entry. Media for React slots works in the game.

Upload picker accepts images and videos. Browser-native PNG/JPEG/WebP/GIF/AVIF
are stored without re-encoding, preserving animation. Other Sharp-readable
static images (e.g. SVG/TIFF) are rasterized to PNG, preventing active SVG
content from being served. Video container MP4/WebM/Ogg is preserved; the
panel verifies browser decode before allowing video save. Not every codec or
format is browser-supported; AVI/unsupported codecs need conversion externally.
Limits: 60 MB, 8192 px sides, 1000 frames / 250M total image pixels.

Preview supports cover/contain and desktop/phone.
Live comparison shows saved local media on the left, unsaved replacement/fit
on the right. Default character posters/progress art and arena poster/video
are served through narrow public asset routes. Shared progress simulation
uses the same 20% milestones (100% only at completion), plus error simulation.
Generic match preview includes an arena selector. No upload is saved merely
by previewing. Video/GIF playback continues while moving progress controls.

Save writes content-hashed
assets to public/loading-media and config/loading-media.json atomically with
revision conflict checks and backups in ignored .preview-admin.
Videos are muted, looping, playsInline; media does not join loading gates or
delay readiness. Failed media falls back to original loading visuals.
Actual progress/error/retry remain controlled by asset loading, not media.

Reload local game after Save (config is bundled); public changes require a
separate GitHub Pages build/deploy. Panel does not push automatically.
Loading videos are not compressed by this tool; prefer short small files.

QA: model/media/HTTP tests, stale write protection, local CSRF/session guard,
range requests, reset retains assets, TypeScript/build, browser admin preview.
