# Plan: body composition from Health Connect through a self-hosted HCGateway

Status: approved with the recommended answers to section 10 (27 Oct 2026). Building waits for the check in section 1 and the shape in section 7, step 3.

## 1. Why, and the check that decides it

v140 reads weight and impedance from the scale over Bluetooth and estimates body composition from published equations. The scale app computes its own figures (body fat, lean mass, bone mass, resting energy) and, on Android, may write them to Health Connect. A browser cannot read Health Connect. HCGateway (github.com/ShuchirJ/HCGateway) is an Android app that sends Health Connect records to a server every 2 hours, and the server offers them over a REST API. With the server self-hosted, vitalcore-backend can read the owner's weigh-ins from it.

This also covers scales a browser cannot read (the encrypted S400 and later, section 9 of `plan-xiaomi-scale.md`), as long as their app writes to Health Connect.

**Check before building (10 minutes, no code):**
1. On the phone: Settings > Health Connect > Data and access > Body measurements. Open Weight, then Body fat, Lean body mass, Bone mass and Basal metabolic rate. Note which apps have written each, and when.
2. If the scale app writes only weight, or nothing, stop here. The import would add less than the Intervals.icu weight already does.
3. Note whether the watch's app also writes weight. If it does, the import has to pick one app (section 4.3).

## 2. The pieces

```
scale ──> scale app ──> Health Connect ──> HCGateway app (every 2 h) ──> HCGateway server (owner's) <── vitalcore-backend /api/hc-body <── VitalCore
```

- **HCGateway app.** A sideloaded APK from the project's releases (Android 8+). Sign up on the owner's own server, not the public instance. Grant Health Connect read access to the five body types only (weight, body fat, lean body mass, bone mass, basal metabolic rate) and nothing else, so the server never holds sleep, heart rate or steps.
- **HCGateway server.** The project's Docker image (`ghcr.io/shuchirj/hcgateway`, port 6644) plus MongoDB. It is a long-running Python service, so it cannot run on Vercel. Two choices (decision 10.1):
  - a small container host (Railway or Fly.io) with MongoDB Atlas's free tier;
  - a machine at home behind a tunnel.
  The server encrypts records before storing them. Push to the phone (FCM) is only for writing back to Health Connect, which this plan never does, so `FCM_PROJECT_ID` and the service account are left unset if the server starts without them (to be checked).
- **vitalcore-backend.** One new route, `api/hc-body.js`, and `lib/hc.js`. The HCGateway login lives in three Vercel variables, `HC_URL`, `HC_USER`, `HC_PASS`. Each call logs in (`POST /api/v2/login`, a 12-hour token), then reads (`POST /api/v2/fetch/{type}`). No token table: a login per call costs one request and leaves nothing stored. If HCGateway limits logins, keep the token in a Supabase row like `polar_tokens` instead.
- **VitalCore.** Pulls `/api/hc-body` like the Polar day, with the same app key. No CSP change: the backend's origin is already in `connect-src`.

## 3. The backend route

`GET /api/hc-body?from=YYYY-MM-DD&to=YYYY-MM-DD` (at most 60 days), header `X-App-Key`, origins from `APP_ORIGINS`, as the Polar routes.

1. Log in to `HC_URL`.
2. Fetch `weight`, `bodyFat`, `leanBodyMass`, `boneMass`, `basalMetabolicRate`, each with a `start` range query the route builds itself. The app never sends a query: HCGateway passes `queries` straight to MongoDB, so a query from outside would be an injection.
3. Group records from the same app whose times are within 60 s into one weigh-in.
4. Answer:
   ```
   {weighins:[{t:'2026-10-27T07:05:12+07:00', app:'<package>', kg, fatPct, leanKg, boneKg, bmrKcal}], apps:['<package>', ...]}
   ```
   Fields missing from Health Connect are left out, never zero.
- `?shape=1`, as on `polar-day`: field names and types of the last week's records, never a value. The record layout inside `data` follows Health Connect's own classes (weight in kilograms, body fat as a percentage, energy in kilocalories) but has to be confirmed on the owner's server before the parser is written.
- 409 with `{error:'not set up'}` when `HC_URL` is unset, so the app shows nothing for invited people and before setup.
- The README gets a section with the variables and the setup steps.

## 4. In the app

### 4.1 Pull (sync.js)
- `hcPull()` runs with the Polar day pull, owner only (it needs the app key), back to the newest imported weigh-in less 2 days, at most 60 days on the first pull.
- Each weigh-in becomes a `measurements[]` record `hc-<date>-<HHMM>` with `weight` and the new fields, `src` set to a new import source `'hc'` in `IMP_SRC`. A deleted one stays deleted (`gone`, `del` learns the `hc-` prefix).
- `connLog.hc` keeps the last good pull and the last error, shown in Settings > Connections and cloud.

### 4.2 Not counting a weigh-in twice
The same step on the scale can arrive three ways: the Bluetooth read (`sc-`), the Intervals.icu day weight (`mi-<date>`) and now `hc-`.
- `hc-` and `sc-` within `SC_SAME` kg and `TH.HC_SAME_MIN` minutes are one weigh-in: the `sc-` record keeps its weight and impedance and takes the `hc-` fields; no `hc-` record is made.
- `mi-<date>` gives way to an `hc-` record that day, as it does to `sc-` (v140).
- A typed weight that day within `SC_SAME` is the same weigh-in, as for `sc-`; the typed weight stays and takes the `hc-` fields. Imports never overwrite what was typed (`icuFill`).
- `SC_OTHER` applies: a weigh-in more than 5 kg from the latest weight is someone else's and is left out.

### 4.3 Which app
Settings > Connections and cloud > Health Connect lists the apps the backend saw (`apps`) and keeps one (`hcApp`, synced in the profile through `markProfile()`). Before one is picked, the app that wrote body fat is used. Package names show only in Settings.

### 4.4 Fields and storage
New `measurements` columns, in `docs/supabase-vN.sql` and a `CONN_SQL` line, all in `SKIP_NULL`:

| Field | Column | Unit | Range kept |
|---|---|---|---|
| `fatPct` | `fat_pct` | % | `TH.HC_FAT_RNG` 3 to 60 |
| `leanKg` | `lean_kg` | kg | above 0 and below the weight |
| `boneKg` | `bone_kg` | kg | `TH.HC_BONE_RNG` 1 to 6 |
| `bmr` | `bmr` | kcal/day | `TH.HC_BMR_RNG` 800 to 3500 |

### 4.5 Where they show
- **Health > Your baselines.** Body fat, Fat-free mass and Resting energy use the scale's own figures when the latest weigh-in has them, and the v140 equations otherwise (decision 10.2). Skeletal muscle and Body water stay from the equations, since Health Connect gives neither through HCGateway. Bone mass is a new row if approved (decision 10.3). The line under them stays "Estimates from your scale, best read as a trend."
- **Trends > Body fat** (v151). One method per line: the scale's figures when the range has any, else the equations. Never both on one line.
- **Briefing.** `insComp()` reads the same figures, with the same keys; `boneKg` only if 10.3 is approved.
- **Never** in Body, Load, the outline, the fuel targets or a score, as for v140 and v151.
- No source or brand names on any of these screens.

## 5. Code layout
- vitalcore-backend: `api/hc-body.js`, `lib/hc.js`, README section.
- js/core.js: `TBL.meas.f` new fields, `IMP_SRC` 'hc', `del` prefix, `TH.HC_*`.
- js/sync.js: `hcPull`, `SKIP_NULL`, `CONN_SQL`, `connLog.hc`.
- js/log.js: the merge in 4.2 shares the `scKeep` rules.
- js/health.js: `scComp` takes the record's own figures first; bone row.
- js/settings.js: the Health Connect block, backup and restore of the new fields.
- docs: `supabase-vN.sql`, `release-vN.md`, a CLAUDE.md line under Sync and the state shape.

## 6. Tests (`tests/index.html`)
- Backend answer parsed into records; missing fields stay missing; out-of-range values dropped.
- `hc-` and `sc-` of the same weigh-in become one record with both sets of fields; 2 minutes apart and 1 kg apart do not.
- `mi-` gives way; a typed weight keeps its value and takes the figures; a deleted `hc-` stays deleted.
- Only the chosen app's weigh-ins are kept.
- Health rows and the Trends line use one method; the briefing data stays under 16,000 characters.
- Body, Load, the outline and the fuel targets are unchanged with and without the new fields.
- No package or brand name in any data screen's text.
- 360px, and the suite as a Monday, a Thursday and a Sunday.

## 7. On the phone and the server (owner)
1. Run the check in section 1.
2. Set up the server (decision 10.1), sign up from the HCGateway app, grant the five body types, force a sync.
3. Add `HC_URL`, `HC_USER`, `HC_PASS` in Vercel, deploy, open `/api/hc-body?shape=1` with the app key and send me the shape (no values).
4. Run `docs/supabase-vN.sql`.
5. Weigh in, wait for the sync (up to 2 hours), open the app.

## 8. Effort
- Server setup: the owner, about an hour.
- Backend route: half a day, after the shape is known.
- App and tests: one release.

## 9. Risks
- HCGateway calls itself in development; its API may change without notice. Pin the image to a version tag, not `latest`.
- A sideloaded app with Health Connect access; Android may stop it syncing in the background (battery settings).
- Up to 2 hours late; the Bluetooth read stays the way to see a weigh-in at once.
- The scale's own figures come from formulas its maker does not publish. They are shown as estimates and read as a trend, like the v140 figures.
- Another always-on service to keep running and patched.

## 10. Decisions for the owner (approved as recommended, 27 Oct 2026)
1. **Where the server runs.** Recommended: a small container host with MongoDB Atlas's free tier. Alternative: a machine at home behind a tunnel.
2. **Which figure wins when a weigh-in has both.** Recommended: the scale's own for body fat, fat-free mass and resting energy, the equations only where it has none. Alternative: keep the equations and show the scale's figures beside them.
3. **Bone mass.** Recommended: a row on Health only, not in the briefing. Alternative: leave it out.
4. **Weight from Health Connect.** Recommended: yes, each weigh-in with its own time, replacing the day weight from Intervals.icu as `sc-` does.

## Sources and licences
- HCGateway is GPL-3.0. VitalCore and vitalcore-backend only call its HTTP API from a separate, unmodified server; no code is copied. Facts come from its README and `doc/api-documentation.yml` (OpenAPI 2.2.0, checked 27 Oct 2026).
- Health Connect record types: developer.android.com, androidx.health.connect.client.records.
