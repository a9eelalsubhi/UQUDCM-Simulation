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

## Device quality tiers, 5 November 2026

Reports that most devices could not run the lab. Measured cause: every device received the top settings (about 2.8 M triangles with ~11k per crowd figure, ~1,260 draw calls, 4K shadow map, sheen and clear-coat shaders, continuous 60 fps rendering).

- dist/quality.js picks a tier before the scene is built: phones, software rendering, ≤4 GB memory or ≤2 cores → low; integrated GPUs → medium; discrete GPUs → high. Viewers can override it in «المزيد ← جودة العرض» (saved per browser, or ?quality=low|medium|high).
- Low: 0.84 M triangles, 643 draw calls (overview), no antialiasing, 1024 shadow map, standard materials, no HDR download, lighter trees, no finger/brow/button details. Medium: 1.32 M, 837 calls. High: 1.93 M, 1,099 calls, ambient occlusion.
- Inpatient and deceased figures merged per material (~240 fewer draw calls on every tier); ambulances share one windscreen material.
- Frame cap: 30 fps (20 on low) when the view is still, full rate while moving or playing.
- Dynamic resolution: render scale drops to 0.5–0.75 when frames fall below 60% of target and recovers with headroom. Tested with an artificial 45 ms frame: 1.0 → 0.6 in ~5 s, then back up.
- Zero-size viewports (hidden tabs, embeds) no longer corrupt the camera.
- Mobile: the «المزيد» menu stays on screen and shows the quality choice.
- End state verified on all three tiers: 16/15/16 trips/30/12/2/172.

## Light by default and iPad loading, 5 November 2026

An iPad stayed at 0% on the loading screen; the owner asked for every visitor to start on the light tier.

- Every visitor now starts on low. The quality menu offers low (default), medium and high; a raised choice is remembered per browser. The GPU detection probe (an extra WebGL context at startup) is gone.
- No importmap dependency: all modules import Three.js by relative path, so Safari before 16.4 can load the lab. The importmap stays for visitors holding cached older files. Verified on a clean cache with the importmap removed.
- iPad canvas memory: on low, label and decal canvases render at half resolution (a quarter of the memory), and relief/roughness maps are skipped. Texture memory on the default view: 59 MB on low against 200 MB on medium, the tier an iPad received before.
- dashboard.js and traffic.js imports are versioned so browsers drop stale copies.
- Load guard: a classic script turns any load error, failed script download or 45 s stall into an on-screen message with the technical detail and a retry button, instead of a frozen 0%. Tested with a missing module and with the importmap removed.
- End state on low: 16/15/16 trips/30/12/2/172; no console errors.

Not verified on a physical iPad.

Limits: the human models remain procedural; no photographic human scan or performance benchmark on a physical GPU is claimed. Visual quality remains experimental and is not deployed to the existing site.
