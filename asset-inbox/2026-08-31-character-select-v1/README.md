# Character Select Asset Drop v1

Status: **stored only — not integrated**  
Received: 2026-08-31  
Original files: 19 PNG, 11,093,442 bytes (10.58 MiB)

The files in this folder are byte-identical copies of the uploaded assets. No resize, compression, crop, runtime conversion, game-code change, build, commit, or push was performed for this drop.

## Classification

- `characters/`: 10 transparent full-body roster portraits.
  - Red: Raja, Robot, Jago, Lala, Kumis.
  - Green: Kaka, Ciici, Buto, Maria, Boke.
- `ui-states/`: character-specific active/inactive state references.
  - Red examples use Raja.
  - Green examples use Kaka.
- `buttons/`: Back/Esc, team-selection button sheets, and primary-button normal/hover frames.

## Analysis notes

1. Red Tui and Green Lui portraits are not included, so both six-character rosters are currently incomplete.
2. `button tim merah.png` and `button tim hijau.png` each contain two vertically stacked states and should later be cropped into separate frames or an atlas.
3. Active and inactive character-state images use different canvas sizes and framing. They must be normalized to a shared anchor box before state switching to prevent layout jitter.
4. Primary normal and hover frames are also different sizes (437×132 vs 462×162). A shared nine-slice or fixed canvas is recommended during later integration.
5. The source spellings `hiijau ciici.png` and `hiijau buto.png` are preserved exactly. Their canonical team is Green.
6. Character visuals share a coherent stylized 3D direction, while the UI uses a graffiti/comic motif. All files include alpha transparency and are suitable as masters, not direct runtime payloads.
7. The four large state portraits account for most of the package size. Later runtime integration should derive WebP/AVIF thumbnails while retaining these PNG masters.

See `inventory.json` for dimensions, byte sizes, canonical roles, and SHA-256 fingerprints.
