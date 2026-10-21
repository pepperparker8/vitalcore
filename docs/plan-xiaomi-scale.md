# Plan: read the body composition scale over Bluetooth

Status: waiting for the owner's approval (21 Oct 2026). Nothing is built yet.

## 1. What decides it: the model number

The answer depends on the model printed under the scale (`XMTZCxxHM`) and on which app it is paired with. Xiaomi's scales fall into three groups:

| Group | How it talks | Models (from public open-source projects) | What VitalCore can do |
|---|---|---|---|
| A. Weight only, open | Service `0x181D` (Weight Scale) with the vendor history characteristic `00002a2f-0000-3512-2118-0009af100700`; 10-byte records | XMTZC01HM (Mi Smart Scale), XMTZC04HM (Mi Smart Scale 2, advertises as `MI SCALE2` but has no `0x181B`) | Read weight directly in Chrome on Android (this plan) |
| B. Body composition, open | Service `0x181B` (Body Composition) with the same vendor history characteristic; 13-byte frames with weight and impedance | XMTZC02HM (Mi Body Composition Scale, `MIBCS`), XMTZC05HM (Mi Body Composition Scale 2, `MIBFS`) | Read weight and impedance directly (this plan) |
| C. Encrypted | Broadcast only, AES-CCM encrypted service data; needs a bind key held in the Xiaomi account plus the scale's MAC address | XMTZC14HM (Xiaomi Body Composition Scale S400) and the newer scales paired with Xiaomi Home / Mi Home | Not possible from a browser: Chrome gives a page neither the bind key nor the MAC address. The Intervals.icu import stays |

**Which one the owner has.** The scale is paired with Zepp Life. Zepp Life pairs the Mi Smart Scale 2 and the Mi Body Composition Scale 2; the S400 and later scales pair with Xiaomi Home. So it is most likely group A or B, but this cannot be told for certain from here.

**Check before building (5 minutes, no code):**
1. Read the model under the scale (`XMTZC04HM`, `XMTZC05HM`, …).
2. Install nRF Connect, step on the scale to wake it, and scan.
3. Look for `MIBFS`, `MIBCS` or `MI SCALE2`. Connect it and check for "Body Composition" `0x181B` (group B) or only "Weight Scale" `0x181D` (group A). Both should show the 128-bit characteristic ending `…0009af100700`.

If the scale shows up only as an encrypted broadcast, with no name to connect to, it is group C and the plan stops (section 9).

## 2. Web Bluetooth on Android Chrome

- **Needs a tap.** As with the monitor, `navigator.bluetooth.requestDevice()` runs inside the button's click handler and opens Chrome's chooser every time.
- **Blocklist.** Chrome's Web Bluetooth blocklist (WebBluetoothCG `gatt_blocklist.txt`, checked 21 Oct 2026) lists none of these: `0x181B`, `0x181D`, `0x2A9C`, `0x2A9D`, `0x2A2B`, the vendor history characteristic, or the vendor config service `00001530-0000-3512-2118-0009af100700`. The blocklist does have `00001530-1212-efde-1523-785feabcd123`, Nordic's DFU, which is a different UUID.
- **No passive reading.** `watchAdvertisements()` (reading the scale's broadcast without connecting) is still behind `chrome://flags/#enable-experimental-web-platform-features` on Android, and service data in advertisements is not reliably exposed. The plan does not use it, and the owner never has to change a flag.
- **The history fits inside one tap.** After the chooser, the read is one connection that takes a few seconds:
  1. connect;
  2. set the clock;
  3. ask for the records since our last read;
  4. collect them;
  5. acknowledge;
  6. disconnect.

  The scale must be awake, so the owner steps on it, or has just weighed. It stays connectable for about a minute after the display goes off (from openScale's notes; to be checked on the owner's scale).
- **Request filter:**
  ```
  {filters:[{services:[0x181B]},{services:[0x181D]},{namePrefix:'MIBFS'},{namePrefix:'MIBCS'},{namePrefix:'MI SCALE2'},{namePrefix:'MI_SCALE'}],
   optionalServices:[0x181B,0x181D,0x1805,'00001530-0000-3512-2118-0009af100700']}
  ```
- **No CSP change.** Bluetooth is not a fetch, so the CSP does not cover it.

### How the scale behaves

1. **Several apps can read it.** The history is kept per reader id (a 16-bit user id the reader chooses). VitalCore uses its own id, so its pointer and Zepp Life's are separate. Zepp Life should still get every weigh-in, unlike the monitor. This is likely from openScale's protocol notes, but has to be checked on the phone.
2. **Fills in what it missed.** The scale keeps unread records, so readings from days the app was not opened come in on the next read, with their own times.
3. **A clock with no time zone.** Time stamps are the scale's own local clock. Zepp Life sets it, and so does VitalCore on every read (Current Time `0x2A2B`).

## 3. The button (Log > Body and blood pressure)

- **Placement.** Under the monitor block (`#bpBleW`), add a second block `#scBleW` "From your scale". It holds a secondary button `#scBle` (48px, full width at 360px), with the `UI.scale` icon (Tabler `scale`, source file into `assets/icons/tabler/`) and "Read from your scale".
- **No accent colour.** No `--gold` anywhere in the block.
- **When it shows.** It follows the same Bluetooth checks as `bpBleInit()`: the block shows wherever `navigator.bluetooth` exists, with "Bluetooth is off on this phone. Turn it on, then tap." while the adapter is off. Where there is no Bluetooth, it shows nothing extra, because `#bpBleNo` already tells the owner to type.
- **Hint.** Shown until the first good read: "Step on the scale to wake it, then tap. Readings save on their own."
- **Status line.** `#scBleSt` (`aria-live`) shows "Connecting…" and "Reading…". After a read it keeps a lasting Saved line, as v139 does for the monitor: "Saved: 72.4 kg · 07:05, and 3 earlier weigh-ins. Nothing more to tap."
- **Toast with Undo.** One toast with Undo, which deletes what the read saved (the records stay in `gone`). The wording:
  - "No new weigh-ins on the scale"
  - "1 weigh-in already in"
  - "1 left out: outside the usual range"
- **Errors.**
  - A closed chooser says nothing.
  - No `0x181B`/`0x181D` service: "This scale does not share weigh-ins this way. They still arrive through your scale's app."
  - Unreachable: "Could not reach the scale. Step on it to wake it, then tap again."
- **Screen wording.** Screens say "scale", never a brand. The Log > Body summary already names the latest weight.

## 4. Reading the data

### 4.1 The protocol (from openScale's protocol notes; facts only, see Sources)

**Order of operations:**
1. Connect and discover services. The vendor history characteristic under `0x181B` means group B; under `0x181D` it means group A.
2. Write the current time to `0x2A2B` (in `0x181B` or `0x181D`, whichever has it): year uint16 LE, month, day, hours, minutes, seconds, then `00 00 01`.
3. Start notifications on the history characteristic. Group B starts notifications first and then writes the magic `01 96 8A BD 62`. Group A writes the magic first, then starts notifications.
4. Ask for records since our last read: write `01 FF FF uidHi uidLo`, then `02` to start.
5. The scale answers `01 count …` and then sends records. Group A sends 10-byte records that may be split across notifications, so they are buffered. Group B sends 13-byte frames, one or two per notification. A single `03` byte means done.
6. Acknowledge with `03`, then `04 FF FF uidHi uidLo`, so the next read starts after these records.
7. Disconnect.

If no count comes within `SC_BLE_ACK` seconds, openScale asks once for all records (`01 00 00 uid`). The plan does the same, and the id rules in 4.3 keep repeats out.

**The reader id.** `uid` is VitalCore's own reader id: a fixed 16-bit number made once per phone, stored local only as `scUid` and left out of backups.

**10-byte record (group A).** Byte 0 is the status:
- bit0: pounds;
- bit4: jin;
- bit5: stabilised;
- bit7: removed (stepped off before it settled).

Then weight uint16 LE, then the time: year uint16 LE, month, day, hours, minutes, seconds.

**13-byte frame (group B).**
- Byte 0 bit0: pounds.
- Byte 1 bit1: has impedance.
- Byte 1 bit5: stabilised.
- Byte 1 bit6: jin.
- Byte 1 bit7: removed.
- Bytes 2 to 7: year uint16 LE, month, day, hours, minutes. Seconds are not used.
- Bytes 9 to 10: impedance uint16 LE.
- Bytes 11 to 12: weight uint16 LE.

**Units.** Weight is the raw value / 200 for kilograms, or / 100 for pounds or jin. Pounds × 0.45359237 and jin × 0.5 give kilograms, rounded to 0.1. The factors live in `TH` as `SC_LB` and `SC_JIN`.

**Only settled weigh-ins.** A frame counts only when it is stabilised and not removed. Live frames while standing on the scale are ignored until a settled one arrives.

**Parsers.** `scParse10(dv)` and `scParse13(dv)` return `{kg, imp (null for group A or without the bit), at (Date or null)}`, or null.

### 4.2 Mapping to `measurements[]`

- **One record per weigh-in.** Each is `{id:'sc-<date>-<HHMM>', date, bpSys:null, bpDia:null, weight, hr:null, src:{weight:'scale'}}`.
  - The date and time come from the record's own time stamp.
  - `-2` and `-3` are added for another weigh-in in the same minute. A weigh-in for one of the scale's other users gets no suffix; see 4.5.
- **No Supabase change.** `TBL.meas` stays as it is, as for the monitor.
- **Imported, not typed.** `IMP_SRC` gains `'scale'`, and `del()` adds `sc-` to the imported-id prefixes it records in `gone`.
- **Several a day.** `wtOn`, `fuWeight` and the weight chart sort by date only. Within a day they will sort by the time in the id, so the latest weigh-in counts. This is a small change in `wtOn` and `fuWeight` (`wtT(rec)`, like `bpT`).
- **Impedance.** Only if the owner chooses body fat (section 10.2).

### 4.3 Not counting a weigh-in twice (the `mi-<date>` import)

The same weigh-in can reach VitalCore twice: directly from the scale, and through Zepp Life and Intervals.icu as `mi-<date>` (one a day). The rule:

1. **A typed weight wins.** If a typed weight for that day is within `SC_SAME` (0.3 kg) of the weigh-in, the weigh-in counts as "already in" and is not saved.
2. **The direct reading replaces the import.** If `mi-<date>` exists and its weight is within `SC_SAME` of a direct weigh-in that day, the direct reading is saved. `mi-<date>` is deleted with `del()`, so its id goes into `gone` and the next Intervals.icu pull does not bring it back. Undo restores it.
3. **When the direct reading comes first, nothing is needed.** `icuWeight` already skips a day that has a weight.
4. **Different weigh-ins are both kept.** If the weights differ by more than `SC_SAME`, both records stay. Intervals.icu keeps one weight a day, so it may have taken another weigh-in that day.
5. **Repeats.** The id comes from the weigh-in's own time, so the same weigh-in sent twice (the fallback in 4.1) overwrites itself. An id already in `gone` is skipped.

### 4.4 Time and a wrong clock

The same rules as the monitor, with their own `TH` entries:

| Case | What happens |
|---|---|
| A stamp more than `SC_BLE_FUT` (10 min) in the future, or before `BP_BLE_Y0` | Only the newest such record is kept, at its arrival time |
| Older than `SC_BLE_OLD` (365 days) | Left out |

After reading, the clock is set again (4.1 step 2).

### 4.5 Ranges and users

- **Range.** A weigh-in is kept only inside `SC_KG_RNG` [30, 250], the same range `wtOn` and `fuWeight` use. Anything outside is left out and counted in the toast.
- **Other people's weigh-ins.** The scale does not tell users apart in its records; Zepp Life matches people by weight. A weigh-in more than `SC_OTHER` (5 kg, as a share or kg to be decided in the build) from the owner's latest weight is left out: "1 weigh-in of someone else left out". With no weight yet, all are kept.
- **Partial sanity check.** `saveMeas` already warns at a 4 kg change on a typed weight. The scale read uses the larger `SC_OTHER` only to keep out other people's weigh-ins.

## 5. Code layout

**Files changed:**
- `js/log.js`: all new code goes in a "SCALE" block after the monitor block. Functions: `scRead`, `scParse10`, `scParse13`, `scKeep`, `scMsg`, `scApply`, `scSaved`, `scBleInit`, `wtT`.
- `index.html`: `#scBleW` inside `#lMeas`.
- `css/app.css`: a "v140: Scale" block.
- `js/core.js`: the `TH` entries, `UI.scale`, `IMP_SRC`, and the `del()` prefixes.
- `js/settings.js`: `backupJSON` leaves out `scUid` and `scOk`; restore keeps them.

**What stays the same:** no new script file, no SHELL change, and no backend, SQL or CSP change.

**Release:** `APP_VER` 140, together with the `sw.js` cache name; `docs/release-v140.md`; a CLAUDE.md bullet.

## 6. Tests (`tests/index.html`)

**The fake scale.** A fake `navigator.bluetooth`, installed inside the test block only. It is a scale with a `0x181B` or `0x181D` service and the history characteristic. It answers the magic, the count and `02` with byte frames, then `03`, and records every write so the order can be checked. It disconnects at the end.

**What the tests cover:**

| Area | Cases |
|---|---|
| Parsing | 10 and 13 bytes; kg, lb, jin; stabilised and removed; impedance on and off; records split across notifications; two 13-byte frames in one notification |
| Write order | Group A and group B; the clock; acknowledging with the reader id |
| Mapping | The id from the record's time; the date from the stamp (23:50); a second weigh-in in one minute; the latest weigh-in of a day counting in `wtOn` |
| Matching | Typed within and over `SC_SAME`; an `mi-<date>` replaced and put in `gone`; Undo restores it; a direct reading before the import, after which `icuWeight` adds nothing; `gone` respected |
| Clock | No stamp, a future stamp, too old |
| Ranges | 29.9 / 30 and 250 / 250.1; someone else's weight |
| Errors | Chooser closed; no service; no count (the fallback); a disconnect mid-read keeps what arrived; Bluetooth off |
| Screen | The button with and without `navigator.bluetooth`; the lasting Saved line; Undo clears it; no brand names; no `--gold`; 360px |

**Days.** The suite is run as a Monday, a Thursday and a Sunday through `?day=`, at phone width.

## 7. On the phone (owner)

1. Do the nRF Connect check in section 1.
2. After the build, step on the scale, tap Read from your scale, and check the weight and time. Then check that Zepp Life still gets the same weigh-in.
3. The next day, check that the Intervals.icu import did not add a second weight for that day.

Reports will say it was not tested on the phone itself until this is done.

## 8. Effort

About one release:
- parser, history download and matching: half;
- button and states: a quarter;
- tests: a quarter.

Body fat (10.2, option b) adds about half a release and one SQL file.

## 9. If the scale is encrypted (group C)

There is no browser route. The broadcast is encrypted with a key that only the Xiaomi account holds. Home Assistant and openScale get that key by signing in to Xiaomi's cloud with the owner's password, which VitalCore must not do (no passwords, no third-party sign-in). Weight keeps arriving through Zepp Life and Intervals.icu as today (`icuWeight`, `mi-<date>`).

## 10. Decisions for the owner

1. **Model.** What does the label under the scale say, and what does the nRF Connect check show (section 1)?
2. **Weight only, or body fat too.**
   - **a. Weight only (proposed).** No new field. Impedance is read but not stored.
   - **b. Body fat as well.** Store impedance in a new `measurements` field `imp`, which needs `docs/supabase-v140.sql` and the owner running it. Show "Body fat about N%, an estimate" on Health, worked out from impedance, height, age, sex and weight with published bioimpedance equations, cited in the code. It would never be a diagnosis, never go into any score, and never use the scale maker's own private formula. Consumer bioimpedance varies with hydration and time of day, so the line would be a trend only.
3. **Matching.** Approve the rule in 4.3: a direct weigh-in within 0.3 kg replaces that day's `mi-<date>` import, a typed weight wins, and different weights are both kept. The other option is to keep only one weight a day, the latest.
4. **Other people.** Is the scale shared? If not, the "someone else" rule (4.5) can be left out.

## 11. Body composition on Health (approved: option 10.2b, then "add other metrics")

Built in v140, display only (Health > Your baselines, after Weight). Never in Body, strain, the outline, the fuel targets or the briefing; never a diagnosis; read as a trend against your own earlier weigh-ins (the mean of the `TH.HL_USUAL` days before). Every estimate needs a height in `TH.SC_H_RNG`; everything but BMI needs impedance and an age of `TH.SC_AGE_MIN`+. `profile.sex` unset uses the average of the men's and women's equations.

| Row | Equation (H cm, W kg, R ohms) | Source |
|---|---|---|
| BMI | W / (H/100)² | WHO definition |
| Body fat % | (W − fat-free mass) / W | from the row below |
| Fat-free mass | men −10.678 + 0.652·H²/R + 0.262·W + 0.015·R; women −9.529 + 0.696·H²/R + 0.168·W + 0.016·R | Sun SS et al. 2003, Am J Clin Nutr 77:331-40 |
| Body water % | men 1.203 + 0.449·H²/R + 0.176·W; women 3.747 + 0.450·H²/R + 0.113·W, over W | Sun SS et al. 2003 |
| Skeletal muscle | 0.401·H²/R + 3.825·sex − 0.071·age + 5.102 (sex 1 men, 0 women) | Janssen I et al. 2000, J Appl Physiol 89:465-71 |
| Resting energy | 370 + 21.6·fat-free mass | Katch-McArdle |

Left out: bone mass, visceral fat, protein %, metabolic age, body type and the body score. The maker's formulas for these are not published; the only open versions are reverse-engineered (openScale, GPL-3.0), and copying them would be both a licence problem and a guess presented as a measurement. None has a published equation from foot-to-foot impedance that we could cite.

The published equations were derived with hand-to-foot impedance in a lab; a foot-to-foot bathroom scale reads differently, so the absolute numbers are rough while the change between your own weigh-ins is the useful part. Hence the line "Estimates from your scale, best read as a trend."

## Sources and licences

- openScale, https://github.com/oliexdev/openScale: `MiScaleHandler.kt` (the v1/v2 detection, the history commands, frame layouts and units) and `MiScaleS400Handler.kt` (S400 encryption). GPL-3.0. Read for protocol facts only; no code is copied, and VitalCore's code is written in its own words.
- Bluetooth SIG GATT Specification Supplement (`0x181B`, `0x181D`, `0x2A9C`, `0x2A9D`, `0x2A2B`).
- WebBluetoothCG registries, `gatt_blocklist.txt`, https://github.com/WebBluetoothCG/registries (W3C Community Group). Checked 21 Oct 2026.
- Web Bluetooth implementation status, https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md (`watchAdvertisements` behind a flag on Android).
- If body fat is chosen, the equations will be cited from published bioimpedance studies, not from any app's code.
- The Zepp app was not decompiled or used.
