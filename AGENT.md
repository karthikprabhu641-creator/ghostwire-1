# AGENT.md: rules for AI coding agents working on GHOSTWIRE

You are building GHOSTWIRE, an offline browser game. Read this file
fully before touching code. These rules override your defaults.

## 1. Project in one paragraph
A cinematic terminal-style hacking-puzzle game: 7 levels, TRACE
meter, handler VESPER, two endings, three difficulties, Daily Heist.
Theme: "Kernel Noir" (amber phosphor on black, cyan defenses, alarm
red for trace). Everything is fictional.

## 2. Hard rules (never break)
1. Offline only. No CDN, web fonts, remote images, API or analytics.
2. No backend, no build step, no npm, no bundler, no frameworks.
3. Must run by double-clicking index.html (file://).
   - No ES modules (no import/export).
   - No fetch/XHR for local files.
   - Level and story data are .js files, not .json.
4. All audio is synthesized with Web Audio. No audio files, no
   samples, no base64 audio.
5. One global namespace: window.GW. Every file is an IIFE.
6. Never use eval, new Function, document.write.
7. Use textContent, never innerHTML with player-provided text.
8. Wrap localStorage and audio calls in try/catch. The game must
   work with storage blocked and with audio unavailable.
9. No real exploits, scanning, brute-forcing or network access.
   Commands are simulated by the game's own parser only.
10. Fictional content only: no real brands, people or public IPs
    (use 10.x.x.x or 192.0.2.x).
11. This project stands alone. Do not add branding, names, assets or
    content from any other project or personal brand.

## 3. Folder and file contracts
Follow the structure in GHOSTWIRE_FULL_SPEC.txt section 2 exactly.
Do not rename or move files without saying so in your report.
Script order in index.html: core, systems, audio, fx, ui, data,
levels, main.js.
 - GW.events: on, off, emit.   GW.store: get, set, save, load, reset,
   export, import.   GW.parser: register({name, aliases, help, run}).
 - GW.terminal: print, printLines, clear, type.
 - GW.trace: add, reduce, get, reset.   GW.score: startLevel,
   finishLevel, calc, rank.   GW.story: send, choice.
 - GW.audio.sfx.play(name, opts).   GW.music: start, stop,
   setIntensity, stinger, setTempo.
 - Levels register with GW.levels.register({id, title, brief, par,
   setup, commands, onCommand, isComplete, hints, teardown}).
Every level must be self-contained, clean up in teardown(), and have
a seeded generator that PROVES solvability before showing a puzzle.

## 4. Code conventions
 - ES2020, 2-space indent, semicolons, single quotes, const/let.
 - Files under ~400 lines. One responsibility per file.
 - Comment every public contract, not every line.
 - All UI strings and story text only in data/story-text.js.
 - All colors, spacing, durations and easings from tokens.css
   variables. No magic hex values in other CSS files.
 - Animate transform and opacity only in CSS. Canvas for the rest.
 - One requestAnimationFrame loop (core/04-loop.js). No stray
   setInterval except the audio scheduler.
 - Frame-rate independent logic: use dt, not frame counts.

## 5. Design and audio source of truth
 - UI/UX: spec section 4. Animations: section 5.
 - SFX: section 6. Music: section 7. Quality tiers: section 8.
 - Honor prefers-reduced-motion and the Reduce Motion setting.
 - No flashing faster than 3 times per second.
 - Music and SFX are synthesized; follow the recipes and keep the
   mix limits (music under -12 dBFS, master limiter on).

## 6. Workflow
 1. Read the task. Restate it in two lines.
 2. Plan the smallest set of files to touch.
 3. Implement in small steps.
 4. Verify: open tests/test.html and run the manual checks for the
    area you touched (see Definition of Done).
 5. Report (format below) and wait for the next instruction.
Do not jump ahead to later phases. Do not refactor unrelated code.

## 7. Definition of done (for any change)
 [ ] index.html opens from file:// with zero console errors.
 [ ] No network requests (DevTools Network tab is empty).
 [ ] tests/test.html passes (200 seeds per level solvable).
 [ ] Works with localStorage disabled and with audio unsupported.
 [ ] Mobile 360px wide: no horizontal scroll, chips usable.
 [ ] Reduce Motion and High Contrast modes still look right.
 [ ] No debug logs, TODOs or placeholder text left behind.
 [ ] Frame rate holds on LOW quality tier.

## 8. Report format (end of every task)
 - What I built/changed (bullets, file names).
 - How I verified it (what I ran/checked).
 - Known issues or risks.
 - Suggested next step.
Keep it short. Be honest: if something is not tested, say so.

## 9. When unsure
Ask one short question instead of guessing, unless a rule above
already answers it. Never silently change a hard rule, a contract,
or the folder structure.

## 10. Kickoff prompts
 Phase 1: "Read AGENT.md and GHOSTWIRE_FULL_SPEC.txt. Scaffold the
  folder structure, index.html with script order, tokens.css,
  base.css, core files 00 to 08. Result: a working terminal with
  help, ls, clear, history and autocomplete."
 Phase 2: "Build the Kernel Noir HUD and layout: trace gauge, three
  panes, mobile tabs, chips, CRT/fx.css, boot sequence and menu."
 Phase 3: "Build audio: engine, SFX recipes (section 6), mixer, then
  the procedural music (section 7) with intensity from trace."
 Phase 4: "Build systems (trace, score, story, daily) and levels
  L0 to L3 with seeded solvable generators."
 Phase 5: "Build L4 to L6, both endings, Daily Heist."
 Phase 6: "Run the Definition of Done. Fix every failure. Optimize."
