# Experiment 01 verification

- All 22 original production files match the saved version 15 checksums.
- No production hosting ID or publishing connection exists in this experiment. GitHub stores the experimental source separately.
- The traffic.js file is identical to production.
- The full simulation reaches 16 admissions, 8 completed rooms and 15 occupied beds after the referral, across all 16 transfers.
- Baseline population remains 172; eight rooms and sixteen beds remain in place.
- All local PBR maps and the HDR environment load successfully.
- Desktop and mobile controls, the settings dialog and the comparison action pass browser checks.
- Baseline comparison uses the same camera position and target as the experiment.
- No JavaScript page errors or missing asset responses occurred in the checked runs.

Evidence: visual-lab-qa.json, camera-qa.json and the saved lab screenshots.

## Polish pass, 29 October 2026

Layout, population, triage, routes, timings and dashboard are unchanged; the end state still reads 16 admissions, 15 occupied, 16/16 ambulance trips, 2 black, 172 people.

- Logo served at 512 px (107 KB) instead of the 4K file (3.25 MB); small favicon and touch icon added. Page weight 8.45 MB → 5.2 MB.
- Crowd figures use lighter sphere and cylinder tessellation: scene triangles 4.34 M → 2.84 M.
- Static mesh merging normalizes geometry attributes, removing five console errors and merging those buckets.
- Minimap redraws at ~15 fps instead of every frame.
- Loading screen shows real asset progress.
- Playback bar shows a live readout (stage, triage, green, yellow waiting, black, beds, trips) and a filled timeline.
- Keyboard: Space play/pause, ←/→ ±10 s, Shift for ±60 s; Escape closes menus.
- Walk mode shows the HDR sky instead of a flat backdrop (daylight only).
- Theme follows the device setting on first visit; dark-mode contrast fixed for time and small labels.
- Mobile: credit no longer hidden behind the lab toolbar; theme toggle icon-only.
- Focus outlines on all controls, reduced-motion support, Open Graph tags, WebGL context-loss notice.

## Realism pass (experiment 02), 29 October 2026

Same layout and scenario; end state re-verified (16 admissions, 15 occupied, 16/16 trips, 30 classified, 12 green, 2 black, 172 people). Curtains still hide during the drill and return after it.

- Materials: painted-plaster interior walls, terrazzo-relief clinical floors, interior tiles in the lobby and annex, real asphalt on the court and loop, grass inside the loop, woven-fabric chairs (Poly Haven CC0).
- People (static crowd and simulation actors): woven cloth with sheen for uniforms and trousers, skin with warm sheen, five skin tones, hijab framing the face for women, short beards on some men.
- Beds: vinyl mattress, sheet, pillow, folded blanket with hem; inpatients wear gowns instead of bare skin-coloured bodies.
- Tents: canvas walls and canopy. Curtains: hospital fabric.
- Ambulances and helicopter: clear-coated paint; roof beacons glow.
- Ambient occlusion (three.js GTAO) on desktop at high quality; toggle in «الضبط البصري». Off on mobile and on light quality. Labels, smoke and curtains are excluded from occlusion. Measured cost on the test machine: 168 → 161 fps.
- No console errors on desktop or mobile emulation.

Limits: the human models remain procedural; no photographic human scan or performance benchmark on a physical GPU is claimed. Visual quality remains experimental and is not deployed to the existing site.
