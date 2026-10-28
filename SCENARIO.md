# Exercise scenario alignment

The two-page exercise brief supplied on 17 October 2026 is the scenario reference. Existing room positions, eight rooms, sixteen beds, access ramp and the approved green parking court remain in place.

| Element | Previous simulation | Aligned simulation |
| --- | --- | --- |
| Origin and destination | Fire at the college side door | Separate schematic fire building representing the morgue as pilgrims' lodging; college receives casualties |
| Primary casualties | 16 yellow, 12 green, 2 deceased classified red | 1 critical red, 15 yellow, 12 green, 2 black deceased; total 30 |
| Evacuation | Unescorted crowd | Unescorted crowd with five evacuation organizers directing the exit |
| Field assessment | Five doctors | Four assessors as in the supplied brief |
| Green care | Eight tents, four field staff per tent | Same physical arrangement and twelve cases; four medical students per team |
| Ambulances | Two vehicles doing repeated trips | Eight vehicles doing two trips each; red transferred first |
| Hospital | Sixteen admissions | Same sixteen admissions, reception handoff and one physician plus five students at each bed |
| Deceased | Two-person team carries to red | Two-person team carries to a separate black area |
| Secondary event | None | Field workers develop heat exhaustion while the last yellow case reaches the hospital; colleagues assist |
| Finale | All rooms received two cases | Red case referred from B4 by ambulance to a helicopter for transfer to the reference hospital |
| Dashboard | Admissions only | Admissions, completed reception in eight rooms, current occupancy, and vacant B4 after referral |

## Presentation assumptions

- Four secondary heat cases illustrate the brief's unspecified series of fainting incidents. They are field staff from the existing teams, not additional primary patients.
- Timings, annex dimensions, site separation and helipad location are schematic. No surveyed dimensions or confirmed helipad plan were supplied.
- B4 remains the first destination and C2 the second, preserving the user's previous bed order. R01 replaces the first yellow case, and the fifteen yellow cases fill the remaining beds.
- Eight ambulances need transport crews. The visualization supplies two accompanying clinicians per ambulance as operational staff outside the previously approved baseline population. The sixteen room physicians remain at their beds throughout.
- Baseline population remains 172: 30 primary cases and 142 participants, excluding organizational and additional transport/field personnel.
- Playback, pause/resume, reset and arbitrary timeline seeking all derive positions and counts from the same clock. Completed room reception remains 8/8 after the referral; physical occupancy becomes 15/16.

This is a representation of the supplied exercise, not a validated operational or clinical protocol.


## User corrections after version 9

- The fire annex joins the clinical wing at x=43. The exit faces east towards triage, as in the original layout. The right court is expanded to fit the connected annex and evacuation lanes.
- Confirmed final casualty distribution: **one red, fifteen yellow, twelve green, two deceased black**. The temporary request for two red and fourteen yellow was superseded by the user's correction.
- R01 goes to B4 in the first clinical room on the left. Y01 follows into C2 in the first clinical room on the right. The other fourteen yellow cases fill the remaining fourteen beds.
- Four field doctors start inside the college reception, exit through the main door and access ramp, and walk at 1.8 m/s along the paved facade corridor to triage carrying first aid bags. Assessment cannot start before the assigned doctor arrives.
- Four evacuation organizers start inside carrying R01 and Y01 on hand held litters. A fifth assists Y02 on foot. There are no wheeled carts emerging from the fire.
- Green escorts run from their assigned tents to meet each case after triage, then accompany the case back to the tent.
- Exterior triage waiting chairs are removed, including patient chairs in the green tents. Casualties sit or lie on the ground until ambulance crews lift them onto wheeled stretchers. Hospital reception and teaching room seating remain.


## Front ambulance circuit

The user's annotated front area is now a large stadium shaped road loop. Its center is (22,86), straight half length 62, road radius 26 and width 9 world meters. The annotated route supplied on 19 October 2026 supersedes the previous loaded full-lap routing. Loaded ambulances go west from field triage along the college frontage directly to the hospital entrance. After admission and crew return, the empty ambulance enters the outer road from the hospital-side spur (x=-8), travels west to the left bend, east along the far side, then north around the right bend and exits beside triage (x=86). Entry and exit bends are rounded; road arrows and the minimap follow this direction.

Eight ambulances make two separate field transfers each, one patient on board in each trip: sixteen direct loaded journeys and sixteen empty outer return legs. The existing final referral from the hospital to the helicopter remains a separate stage. Vehicle counters and timeline events distinguish trip 1 and trip 2 and support rewinding.


## Traffic correction: continuous court and opposite-side queue

The frontage court extends to the upper circuit edge without an intervening strip or kerb. Eight ambulances wait in marked slots on the opposite straight at z=110, facing east. Moving traffic uses z=114. One shared loading bay at (77,33) admits vehicles in order. The hospital stop is a westbound drive-through position at (0,19); arrivals and departures share the same forward heading. After crew return the vehicle continues west, around the left bend and back to its opposite-side waiting slot; its next dispatch completes the right bend back to yellow. The queue lane is separate from the moving lane, and vehicles keep their heading at every stop. The final helicopter referral uses the same forward route from the opposite queue.
