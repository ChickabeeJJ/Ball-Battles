# Ball Vs Ball

A weapon-ball battle simulator for the web. Pick a weapon or special ball for each side, drop them into the arena and watch them bounce, parry and scale up until one is left standing.

This is plain HTML5 canvas and JavaScript with no build step and no runtime dependencies. It is integrated with the **CrazyGames HTML5 SDK v3**.

## Run locally

```bash
npx http-server -p 8080 -c-1 .     # then open http://localhost:8080
```

The game also runs without the SDK (opened from disk, other hosts, ad blockers). Every SDK call is guarded.

## Content

| | |
|---|---|
| Weapons (45) | Sword, Dagger, Spear, Axe, Unarmed, Bow, Shuriken, Katana, Hammer, Torch, Scythe, Poison Flask, Wrench, Boomerang, Shield, Grimoire, Cannon, Lance, Dummy |
| Specials (21) | Fibonacci, Speedy, Grower, Spiky, Gravitron, Splodey, Orbital, Duplicator, Vampire |
| Iridescent (1) | **Kami (神)**: 25,000 coins. Locked at 1 HP; Divine Grace dodges every attack while charged (4 charges, refills over time). Three divine arts on cooldowns with anime cut-ins (Seraph Beam, Golden Gates, Heaven's Arsenal) and its own finisher cutscene. Logic and art live in `js/kami.js`. |
| Modes | 1v1, 2v2, 3v3, Free For All |
| PvP (CrazyGames) | Async 3-ball series via invite links. Each side picks 3 different balls in order; the receiver picks blind, then lineups are revealed; all 3 rounds play (1v1, 2v2, 3v3 by slot) and most wins takes it. Seeded fights replay identically on both screens; a result link sends the outcome (and a replay) back to the challenger. Elo rating with ranks. |
| Maps | Classic, Large, Bouncy (gravity), Pillars, Saws, Shrinking, Hot Potato, Meteors |
| Per ball | Health, size, and overrides for damage, spin and speed |
| Settings | Sound, dark mode, hit freeze, parry freeze, damage numbers, impact frames, finisher (incl. Kami's), ability text, overtime bonus, reverse Team Two spin, vibration |

Every weapon scales on hit (for example, Sword gains +1 damage, Dagger spins faster, Bow adds an arrow). Weapons that touch **parry**, which flips both spin directions. After 40s, **overtime** raises all damage, so every battle ends. Wins earn coins, which unlock Rare, Epic and Legendary items. Opponent slots can use any item, so players can see locked items in action.

## CrazyGames SDK v3 integration

| Requirement | Where |
|---|---|
| `SDK.init()` before anything else; `loadingStart` / `loadingStop` around boot | `js/main.js` `boot()` |
| `gameplayStart` when a battle starts or resumes; `gameplayStop` on pause, tab hidden, results, menus, ads | `js/main.js` |
| Midgame ad only at a natural break (Continue / Rematch after results), at most once every 3 min | `js/sdk.js` `maybeMidgame()` |
| Rewarded ads: "Double coins" on results, "Try once" for locked items | `js/ui.js` |
| Audio muted and game paused only once `adStarted` fires; restored on `adFinished` / `adError` | `js/sdk.js`, `js/main.js` |
| `settings.muteAudio` respected and overrides the in-game volume (settings listener) | `js/main.js` `applyAudio()` |
| Progress saved through `SDK.data` (falls back to localStorage) | `js/save.js` |
| `happytime()` when a new item is unlocked | `js/ui.js` |
| Arrow keys and Space don't scroll the host page; no right-click menu; no external links; no app download prompts | `js/main.js` |

Check it with the mock-SDK test suite (19 checks):

```bash
npx http-server -p 8080 . &
node tools/sdktest.mjs
```

## Build for upload

```bash
bash tools/build.sh      # -> dist/ball-battles.zip (~56 KB, 13 files, index.html at root)
```

Upload `dist/ball-battles.zip` as an HTML5 game. It meets the ≤ 20 MB initial download needed for the mobile homepage, and the file count is far under 1500.

## Store assets (`marketing/`)

| File | Spec |
|---|---|
| `cover-landscape-1920x1080.png` | 16:9 cover |
| `cover-portrait-800x1200.png` | 2:3 cover |
| `cover-square-800x800.png` | 1:1 cover |
| `preview-landscape-1920x1080.mp4` | 16:9 1080p, ~18s, H.264, no audio |
| `preview-portrait-1080x1620.mp4` | 2:3 1080p, ~17s, H.264, no audio |

The covers show only the game title: no borders, logos or store icons. Each video opens on its static cover, then crossfades into real gameplay at 1x speed. There is no "Play now" text, no cursor, no black bars and no sound.

Regenerate them with:

```bash
npx http-server -p 8080 . &
node tools/covers.mjs     # covers + video title frames (tools/art.html)
node tools/trailer.mjs    # fast-cut cinematic trailers from real 1x gameplay (impact frames on)
node tools/seeds.js       # finds seeds whose battles end with a K.O. inside a clip
```

## Suggested listing text

**Title:** Ball Vs Ball

**Description:** Pick a weapon, drop two balls into the arena and watch them fight! Every weapon gets stronger with each hit. Swords hit harder, daggers spin faster, bows fire more arrows. A ball whose hits follow the Fibonacci sequence can turn a fight around in one slam. Mix 66 weapons and special balls across 1v1, 2v2, 3v3 and Free For All on 8 maps with saws, meteors, gravity and a hot potato bomb. Earn coins and unlock legendary gear.

**Controls:** Mouse / touch for menus. Space or Enter starts a battle. P or Esc pauses.

**Tags:** Physics, Simulation, Ball, Weapon, Battle, Casual, 2 Player, Sandbox

## Credits

Music: "Arcade Groove" (two tracks, `music/`), provided by the game owner. Fonts: Anton, Pixelify Sans and Lilita One, all SIL Open Font License (`fonts/`). All art and sound are generated in code.
