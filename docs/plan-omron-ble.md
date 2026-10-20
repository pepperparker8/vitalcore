# Plan: read the blood pressure monitor over Bluetooth

Status: approved by the owner on 20 Oct 2026. Built in v135 (`docs/release-v135.md`).

Owner's decisions:
- The cuff pulse stays out of resting heart rate (`hr` stays null). It is shown in the toast only.
- Omron Connect stays in use alongside. Each reading goes to whichever app reads it first; the button hint says so.

## 1. What decides it: the model number

The answer depends on the model printed on the back of the monitor (`HEM-xxxxT`). Omron's Bluetooth monitors fall into three groups:

| Group | How it talks | Examples (from public open-source projects) | What VitalCore can do |
|---|---|---|---|
| A. Standard service | Bluetooth SIG Blood Pressure Service `0x1810`, measurement `0x2A35` (indications) | HEM-7361T (M7 Intelli IT / M500) is listed by UBPM as working with its generic Blood Pressure Profile plugin; other models need checking | Read it directly in Chrome on Android (this plan) |
| B. Omron's own service only | Vendor service `ecbe3980-c9a2-11e1-b1bd-0002a5d5c51b` (older models, need a pairing key written to the monitor) or `0000fe4a-…` (newer, e.g. HEM-7380T1, no key) and a memory-read protocol | HEM-7322T, HEM-7600T, HEM-7530T, HEM-6232T, HEM-7150T, HEM-7342T, HEM-7380T1 (omblepy driver list) | Possible only by re-implementing a reverse-engineered protocol. Not recommended; see section 9 |
| C. Encrypted | Encrypted traffic | HEM-7188T (M2+ Connect), HEM-7196T (M4/X4 Connect AFib) per omblepy | Not possible. Manual entry stays |

A model can be in A and B at once (the standard service for new readings, the vendor service for the full memory). Group A is what this plan builds.

**The test monitor: a two-user Intelli IT model.**
- omblepy reads it through the vendor service (group B), with pairing and readout both working, so group B is confirmed.
- No public source says whether it also exposes `0x1810`. It is the same Intelli IT generation as the HEM-7361T, which does, so group A is likely but not confirmed.
- nRF Connect (20 Oct 2026): the monitor advertises the 16-bit service list `10 18` (little endian), which is `0x1810` Blood Pressure, along with Omron's manufacturer data (company `0x020E`). So it is group A, and the `services:[0x1810]` filter will find it. Still to confirm after connecting: the `0x2A35` characteristic inside it.
- Because it has two users, the user choice in 4.5 is needed from the start.

**Check before building (5 minutes, no code):** install nRF Connect on the phone, put the monitor in pairing mode (hold the Bluetooth button until `-P-` blinks), scan, connect and look for "Blood Pressure" `0x1810` with "Blood Pressure Measurement" `0x2A35`. If both are there, the plan below applies. If only an unknown 128-bit service shows, the model is group B.

## 2. Web Bluetooth on Android Chrome

- Chrome on Android supports Web Bluetooth (GATT client). It needs HTTPS (GitHub Pages is) and a user gesture: `navigator.bluetooth.requestDevice()` must run inside the button's click handler.
- Each read opens Chrome's device chooser. Reconnecting without the chooser (`getDevices()`) is not reliably available on Android, so the plan assumes the chooser every time (one tap on the monitor's name).
- Android asks for the "Nearby devices" permission the first time. If the monitor needs bonding, Android shows its own pairing dialog when the encrypted characteristic is first used.
- The CSP does not cover Bluetooth (it is not a fetch), so no `index.html` CSP change. The `bluetooth` permissions policy is allowed by default for a top-level page.
- `0x1810` and `0x2A35` are not on Chrome's Web Bluetooth blocklist.
- Request filter: `{filters:[{services:[0x1810]}, {namePrefix:'BLEsmart_'}], optionalServices:[0x1810, 0x1805]}`. Omron monitors advertise as `BLEsmart_…`; `0x1805` (Current Time) is optional, see 4.4.

### Known monitor behaviour to design around

1. **One host at a time.** Omron monitors keep one pairing. Pairing with Chrome on the same phone shares the Android bond, but Omron Connect may then lose its link (and the reverse). The owner should decide whether VitalCore replaces Omron Connect for this monitor.
2. **New readings only.** Over the standard service the monitor sends the readings not yet sent, then marks them as sent. A reading already collected by Omron Connect will not come to VitalCore, and the reverse. Older stored readings cannot be fetched this way (that needs the vendor protocol).
3. **Sends on connect, then disconnects.** The monitor indicates its unsent readings right after notifications are enabled, then drops the link after a few seconds. The app collects until the link drops or `BP_BLE_IDLE` seconds pass with no reading.
4. **Pairing mode vs transfer.** First time: hold the button until `-P-` blinks. After that a short press (or taking a reading) wakes it for transfer.
5. **Two users.** Dual-user models put a user id (1 or 2) in each reading.

## 3. The button (Log > Body)

- Under the Blood pressure row, a secondary button (`.btn-out`, 48px, full width at 360px): Tabler `bluetooth` icon + "Read from your monitor". No accent colour. The source SVG goes into `assets/icons/tabler/` and the path into `UI.bt` (core.js).
- Left out entirely when `navigator.bluetooth` is missing (desktop Firefox, iOS Safari, the tests page without the fake). `navigator.bluetooth.getAvailability()` false hides it too (Bluetooth adapter off is not the same: Chrome then answers with a clear error, shown as a toast "Turn on Bluetooth and try again").
- One status line under the button (`#bpBleSt`, `aria-live=polite`), empty when idle: "Connecting…", "Waiting for readings…", then cleared. Result as a toast with Undo:
  - "2 readings added" / "1 reading added, 1 already in" / "No new readings on the monitor".
  - Chooser cancelled (`NotFoundError`): nothing shown.
  - Wrong device (no `0x1810`): "This monitor does not share readings this way. Enter them by hand."
- Setup words stay in the button hint, shown only until the first successful read: "First time: hold the monitor's Bluetooth button until P blinks, then tap." (setup instruction, not a data screen; no brand name.)
- The RECENT row shows the latest reading with its time when it came from the monitor ("128/82 mmHg · 07:12").

## 4. Reading the data

### 4.1 Parsing `0x2A35` (new function `bpParse(dv)` in log.js)

Per the Bluetooth SIG Blood Pressure Service spec:

- Byte 0 flags: bit0 unit (0 mmHg, 1 kPa), bit1 time stamp present, bit2 pulse rate present, bit3 user id present, bit4 measurement status present.
- Then three IEEE-11073 SFLOATs (2 bytes each, little endian): systolic, diastolic, mean arterial pressure.
- If bit1: time stamp, 7 bytes (year uint16, month, day, hours, minutes, seconds).
- If bit2: pulse rate, SFLOAT.
- If bit3: user id, uint8 (255 = unknown).
- If bit4: status uint16: bit0 body movement, bit1 cuff fit loose, bit2 irregular pulse, bits3-4 pulse range, bit5 position.
- SFLOAT (`sfloat(u16)`): 4-bit signed exponent, 12-bit signed mantissa; `0x07FF` NaN, `0x0800` NRes, `0x07FE` +INF, `0x0802` −INF, `0x0801` reserved all read as null.
- kPa converts to mmHg (× `BP_KPA` 7.50062) and rounds.
- Returns `{sys, dia, map, pulse, at (Date or null), user, move, cuff, irr}` or null when sys or dia is null.

### 4.2 Mapping to `measurements[]`

- One record per reading: `{id:'bp-<date>-<HHMM>', date, bpSys, bpDia, weight:null, hr:null}`.
  - `date` = the local date of the reading's time stamp (so a reading at 23:50 belongs to that day, not the day it was synced).
  - The time of day lives in the id (`bp-2026-10-20-0712`), read back by `bpT(rec)`. No new Supabase column, no SQL to run: `TBL.meas` is unchanged.
  - With a second user picked (4.5) the id becomes `bp-<date>-<HHMM>-u2`.
- **Pulse does not go into `hr`.** `measurements[].hr` is the morning resting heart rate and feeds `rhrOn()` and the Body baseline (one-source rule). A seated pulse during a cuff reading would pull that baseline. Proposal: keep the pulse out for now (shown in the toast only). Owner decision, see section 10.
- `src` = `{bpSys:'mon', bpDia:'mon'}`; `IMP_SRC` gains `'mon'`, so a later typed edit is marked 'man' as usual.
- `bpBand`, Health, Insights and the report need no change: they already read every `bpSys`/`bpDia` record on any day. Several readings a day are fine (bpBand averages readings and counts days).
- Status flags: a reading with body movement or a loose cuff is still saved (the monitor showed it), but the toast says "1 taken while moving" / "cuff loose" so the owner can repeat it. Irregular pulse is not shown or interpreted (never diagnose).

### 4.3 Duplicates

- The id is made from the reading's own time, so a resend of the same reading overwrites itself (`put` with the same id, written only when a value changed).
- Deleting a monitor reading must stay deleted: `del()` adds `bp-` to the imported-id prefixes it records in `gone`, and the import checks `isGone(id)`.
- A hand-typed reading on the same date with the same two numbers counts as "already in" (skip, no second record).
- Two readings in the same minute (a repeat) get `-2` on the id.

### 4.4 Time of day and a wrong clock

- No time stamp (flag bit1 off): use the time the reading arrived and say so in the toast ("time from your phone").
- Time stamp more than `BP_BLE_FUT` (10 min) in the future, or before 2015: the monitor clock is wrong. Use the arrival time for the newest reading only, skip older ones without a trustworthy time, toast "The monitor's clock is off; set it on the monitor."
- Older than `BP_BLE_OLD` (365 days): skipped.
- If the monitor offers Current Time (`0x1805`/`0x2A2B`) and it is writable, the app sets the clock after reading (cheap, no prompt). If not, nothing.

### 4.5 Range checks (toast, never a silent save)

- Same ranges as the typed form, moved into `TH` so both use them: `BP_SYS_RNG` [60, 250], `BP_DIA_RNG` [40, 180], systolic above diastolic, pulse [30, 200] when present. Out-of-range readings are skipped and counted: "1 reading skipped: outside the usual range".
- Two users: the first time readings for both users arrive, a one-line question under the button "Which user are you on the monitor? 1 · 2" (44px chips); stored local only as `bpUser`, left out of backups. Readings of the other user are ignored. Settings > Data gets a row to change it.

## 5. Code layout

- All new code in the measurements section of `js/log.js` (`bpRead`, `bpParse`, `sfloat`, `bpKeep`, `bpT`), the button in `index.html` `#lMeas`, CSS in a "Monitor" block at the end of `app.css`. No new script file, so `sw.js` SHELL, the script order and the tests page loader do not change (only the cache name bump with `APP_VER`).
- Touches outside Log > Body: `TH` entries and `UI.bt` (core.js), `IMP_SRC` and the `del()` prefix list (core.js), `backupJSON` leaving out `bpUser` (settings.js). None of these are in recovery, strategy, detail or insights, so it does not overlap the v134 readiness work; it should land after v134 is committed.

## 6. Tests (`tests/index.html`)

A fake `navigator.bluetooth` (installed only inside the test block, then removed):

- `requestDevice` returns a device whose `gatt.connect()` → `getPrimaryService(0x1810)` → `getCharacteristic(0x2A35)` → `startNotifications()`, then fires `characteristicvaluechanged` with `DataView`s built from byte arrays, then `gattserverdisconnected`.
- SFLOAT: positive, negative exponent, NaN/NRes/±INF, kPa conversion.
- Flags: every combination of time stamp, pulse, user id and status, in spec order.
- Mapping: id with time, date from the stamp (23:50 case), two readings in one minute, user 2 id, `hr` stays null.
- Duplicates: the same reading sent twice gives one record; a typed match is "already in"; a deleted one stays deleted.
- Clock: no stamp, future stamp, too old.
- Ranges: each edge (59/60, 250/251, 39/40, 180/181, sys equal to dia), toast counts.
- Errors: chooser cancelled (no toast), no `0x1810` service, disconnect mid-transfer keeps what arrived, the idle timeout.
- Button absent without `navigator.bluetooth`; present with the fake.
- `bpBand` reads monitor records like typed ones.
- No brand or source names on the screen strings ("monitor" only), no `--gold` in the new CSS, 360px layout.

## 7. On the phone (owner)

1. nRF Connect check (section 1).
2. After the build: first read with `-P-` blinking, then a normal read the next morning. Check the times and that Omron Connect still works (or decide to drop it).

Reports will say it was not tested on the phone itself until this is done.

## 8. Effort

About one release: parser and import (half), button and states (a quarter), tests (a quarter). No backend, no SQL, no CSP change.

## 9. If the model is vendor-only (group B) or encrypted (group C)

- **Group B:** reading it means re-implementing Omron's private protocol as documented by omblepy and hass-omron: unlock or write a 16-byte pairing key, then read the monitor's memory by address with a per-model memory map. Costs and risks: per-model maps to maintain; writing our own pairing key unpairs Omron Connect for good; a protocol that can change with firmware; a reverse-engineered protocol in a public repo. Recommendation: do not build it; keep manual entry (two numbers, under 10 seconds). An alternative worth checking on the phone: if Omron Connect can export readings as CSV, a "Import a file" option in Log > Body would cover past readings without any Bluetooth (needs a sample export first).
- **Group C:** no route. Manual entry stays.

## 10. Decisions for the owner

1. Model: the test monitor. The nRF Connect result showed `0x1810` (group A, section 1).
2. Pulse from the cuff: leave out (proposed), or store it in a new field `bpHr` (needs `docs/supabase-v13x.sql` and the owner running it) and show it beside the reading, never in resting heart rate.
3. Keep using Omron Connect alongside, accepting that each reading goes to whichever app reads it first, or let VitalCore be the only one.

## Sources

- Bluetooth SIG, Blood Pressure Service 1.1 and GATT Specification Supplement (`0x1810`, `0x2A35`, SFLOAT).
- omblepy, https://github.com/userx14/omblepy (supported models, vendor UUIDs, encrypted models).
- UBPM plugins wiki, https://zff.dev/LazyT/ubpm/wiki/Plugins (HEM-7361T on the generic Blood Pressure Profile; "only new" readings; newer models on a different UUID).
- hass-omron, https://github.com/eigger/hass-omron (pairing mode, one host at a time).
