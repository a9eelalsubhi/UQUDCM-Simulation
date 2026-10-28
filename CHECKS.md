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

Limits: the human models remain procedural; no photographic human scan or performance benchmark on a physical GPU is claimed. Visual quality remains experimental and is not deployed to the existing site.
