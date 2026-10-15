# Evidence review for the v132 coach summary

Version 132, October 2026. In v132 the Insights tab opens with a coach summary computed by code, followed by a short AI briefing and questions. This review collects the published evidence behind each rule the summary could use. It is written for the person who implements the rules and for the model that explains them.

The athlete in scope is an amateur endurance athlete. They run, cycle (e-bike rides included), hike, lift weights, do yoga and swim, and they live and train in a hot, humid tropical climate. Rules use only data the app already has: nightly HRV (rMSSD), resting heart rate, breathing rate, sometimes SpO2, steps, active minutes, 24/7 heart rate, sleep times and stages, CTL/ATL/TSB, the watch's VO2max, workout details (type, duration, distance, effort, heart rate, zones, threshold, drift, heart rate recovery, power, cadence, pace, climb, pain), the daily check-in, weight, blood pressure, morning heart rate, blood markers in mg/dL, injuries and optional food logs.

## How to read this

Each topic has four parts:

- **Evidence**: what the research found, with the numbers that can go into code.
- **Strength and caveats**: how much weight the evidence can bear.
- **Rules the app could use**: numbered rules (R1.1, R1.2 and so on). Each gives a threshold, the data field it reads and its source.
- **Do not claim**: what the screen and the briefing must never say.

Strength of evidence uses three words:

- **Strong**: a consensus statement or position stand backed by systematic reviews, or several consistent randomised trials.
- **Moderate**: one good meta-analysis, a large cohort, or a few consistent smaller trials.
- **Weak**: a single small study, observational data only, expert opinion, or a coaching convention.

A rule can rest on strong evidence for the idea while its exact cut-off is the app's own choice. Where that happens the rule says so.

Field names follow the state shape in `CLAUDE.md`, for example `wellness[date].hrv`, `checkins[].symptoms` and `workouts[].sub.icu.dec`.

## 0. Rules that apply everywhere

These are measurement rules rather than findings from one topic.

> **Rules the app could use**
>
> - **C1. Personal baselines.** Compare a person with their own 28-day band and use it only once 14 values exist. The HRV studies in topic 1 all use individual baselines of about 4 weeks. *Reads:* any wellness series. *Source:* Plews 2013; Vesterinen 2016. Moderate.
> - **C2. One source per baseline.** Never mix two devices in one resting heart rate or HRV baseline unless the mix is stable. Different devices read different values. *Source:* measurement principle; Buchheit 2014. Moderate.
> - **C3. Correlations need size, not only sample count.** With 14 paired days a Pearson r must be at least 0.53 (or at most -0.53) to pass p < 0.05. With 30 days the bar is 0.36. Below that, say nothing. Always word a correlation as "tends to go with", never "causes". *Reads:* `insightCorrelations`. *Source:* standard critical values of r. Strong.
> - **C4. Words.** Use "may", "linked with" and "worth checking". Never name a disease and never give a personal risk percentage.

## 1. Hard, easy or rest today

### Evidence

**HRV-guided training.** Athletes train hard on days when their recent HRV sits inside or above their normal range, and go easy or rest when it falls below. Kiviniemi and colleagues (2007) first tested this in recreational runners. Later trials followed:

- Vesterinen 2016: recreational runners, 8 weeks.
- Javaloyes 2019: cyclists.
- Nuuttila 2022: recreational runners, combining HRV with heart rate at a given speed and the runner's own sense of recovery.

**How "normal" is defined.** Most trials compare a rolling 7-day average of the log of rMSSD with a band. The band is the baseline mean plus or minus 0.5 standard deviations (the "smallest worthwhile change"), taken over about 4 weeks.

- The 7-day average matters because single mornings bounce around (Plews 2012, 2013).
- About 3 to 5 valid readings a week give an average close to the full 7 (Plews 2014).

**How this maps onto the app.** The app's Body score computes z = (7-day mean minus 28-day mean) / (SD / √7). If the SD in the band is the SD of daily values, a 7-day mean that falls 0.5 SD below baseline gives z of about -1.3 on the app's scale. The app's illness line of z ≤ -1.5 is therefore slightly stricter than the usual training cut. The papers differ on whether the SD comes from daily values or from the rolling average, so the match is approximate.

**Results.** Guided training worked at least as well as fixed plans, usually with fewer hard sessions:

- Vesterinen 2016: 3000 m running speed improved 2.1% with guidance and 1.1% on a fixed plan.
- Nuuttila 2022: 10 km time improved 6.2% against 2.9%. That trial was funded by a wearable maker.
- Javaloyes 2019: no significant difference between groups.
- Two meta-analyses (Düking 2021; Manresa-Rocamora 2021) found small benefits that were mostly not significant.

The honest summary is that the main gain is skipping hard sessions on bad days, not a large boost in performance.

**How Nuuttila 2022 made decisions.** The trial watched three markers and raised training a little (about 5%) when all were normal, held it when they were mixed, and cut it by about a quarter when they warned:

- HRV below its band.
- An index of heart rate at a given running speed more than 0.5 below normal, which is roughly 3 to 4 beats a minute higher at the same pace.
- A poor perceived recovery.

**Self-report beats sensors.** A systematic review of 56 studies (Saw 2016) found that self-reported wellbeing (mood, fatigue, soreness, stress) responded to training load more consistently than objective markers such as heart rate or blood tests. Buchheit (2014) adds that heart rate measures only make sense read together and in context. Heat, poor sleep, alcohol and illness all move them.

### Strength and caveats

- HRV guidance is moderate evidence that it is safe and at least as good as a plan. It is weak evidence that it is better.
- Trials were short (8 to 12 weeks), small (20 to 40 people), and used morning chest-strap readings, not overnight readings from a wrist or arm band.
- Overnight rMSSD from a band is a related but different measure.
- Using self-report for these decisions is moderate to strong evidence.

### Rules the app could use

> **Rules the app could use**
>
> - **R1.1 Baseline.** Compare the mean of the last 7 nights of rMSSD (at least 4 of 7 present) with the 28 days before (at least 14 values). *Reads:* `wellness[].hrv`. *Source:* Plews 2013, 2014; Vesterinen 2016. Moderate.
> - **R1.2 Easy-day trigger.** If the 7-day HRV mean is 0.5 SD or more below baseline (app z ≤ -1.3), a planned hard day becomes easy. *Reads:* `wellness[].hrv`. *Source:* Vesterinen 2016; Javaloyes 2019; Nuuttila 2022. Moderate.
> - **R1.3 Self-report first.** No hard session when today's check-in is Strained, or when energy is 1 to 2 together with soreness 3 or more, whatever HRV says. *Reads:* `checkins[].energy`, `mood`, `stress`, `soreness`. *Source:* Saw 2016. Moderate for the principle; the cut-offs are the app's.
> - **R1.4 Heart rate at pace.** If average heart rate in a steady session is 3 or more beats a minute above your last 5 similar sessions (same sport, duration within 25%) on two sessions in a row, that counts as a fatigue sign. Skip the check for e-bike rides. Hot days raise heart rate too, so this is a sign, not a verdict. *Reads:* `sub.icu.hr`, `spd`, `pw`. *Source:* Nuuttila 2022; Buchheit 2014. Weak to moderate.
> - **R1.5 Weekly response.** With two or more warnings in a week (R1.2, R1.3, R1.4, R6.3), cut next week's planned time by about 25%. With none, allow normal growth (R2.4). *Source:* Nuuttila 2022. Weak (one trial).
> - **R1.6 High HRV is not always good.** An HRV above its band together with low mood or energy and sessions that feel harder than planned is a warning, not a green light (see R5.3). *Source:* Le Meur 2013. Weak to moderate.

> **Do not claim**
>
> - That training by HRV makes you much faster.
> - That a single night's HRV decides the day.
> - That band HRV equals a lab measurement.
> - Anything about "your nervous system" being balanced or unbalanced.

## 2. Training load

### Evidence

**Session RPE.** Foster (2001) multiplied a session's effort on a 0 to 10 scale by its minutes to get a load in arbitrary units. A review by Haddad (2017) found it valid against heart-rate-based methods, cheap, and usable across sports, strength sessions included. The app's 1 to 5 effort roughly doubles to that 0 to 10 scale, and the watch's 1 to 10 value can be used directly.

**Monotony and strain.**

- Monotony is the mean daily load divided by its standard deviation over a week, with rest days counted as zero.
- Strain is the weekly load multiplied by monotony.
- In Foster's 1998 work most illnesses followed peaks in strain, and a monotony above about 2 was flagged as high.

**Fitness and fatigue.** The fitness-fatigue model goes back to Calvert (1976), building on a 1975 paper by Banister and colleagues, with time constants of about 50 days for fitness and 15 for fatigue. Training software uses the same idea with 42 and 7 days, which gives CTL, ATL and TSB; those constants are a convention. Hellard (2006) showed the model's parameters are unstable and predict poorly for one person.

**The acute:chronic ratio and its critics.** Gabbett (2016) proposed a "sweet spot" of 0.8 to 1.3, with injury risk rising above 1.5, based on team sports. Two critiques followed:

- Lolli (2019): when the acute week sits inside the chronic window, the two are mathematically coupled and produce correlations that are not real.
- Impellizzeri (2020): the ratio has deeper flaws and no causal support, and should be dropped.

**The 10% rule.** Buist (2008) randomised novice runners to a programme that grew 10% a week or to a faster standard programme. Injuries were the same: 20.8% against 20.3%.

**Weekly ramp.** In Nielsen (2014), novice runners whose weekly distance rose more than 30% over two weeks had a hazard ratio of 1.59 for injury overall. This was not significant (p = 0.07); the link held only for some injury types.

**Single-session spikes.** Frandsen (2025) followed about 5,200 runners for 18 months using GPS watch data. A single run more than 10% longer than the longest run of the previous 30 days raised injury risk:

| How much longer than the 30-day longest | Hazard ratio |
|---|---|
| 10% to 30% | 1.64 |
| 30% to 100% | 1.52 |
| More than 100% | 2.28 |

The week-to-week ratio showed no link. This is the strongest recent evidence on how fast to build.

**IOC consensus.** The IOC load consensus (Soligard 2016) concludes that rapid changes in load are linked with injury, and that load should be managed per person.

### Strength and caveats

| Claim | Strength |
|---|---|
| Session RPE as a method | Strong |
| Monotony cut-off of 2 | Weak |
| Fitness-fatigue model as a predictor for one person | Weak (fine as a description) |
| Acute:chronic ratio thresholds | Weak and disputed |
| 10% rule | Tested and not supported |
| Single-session spike | Moderate for running distance; extending it to other sports is the app's assumption |

### Rules the app could use

> **Rules the app could use**
>
> - **R2.1 Session load.** Load = effort × minutes. For effort, use the typed value first (1 to 5, × 2 for the 0 to 10 scale), then the watch's value, then one derived from heart rate. *Reads:* `rpe`, `sub.icu.rpe`, `durMin`. *Source:* Foster 2001; Haddad 2017. Strong.
> - **R2.2 Monotony.** Over the last 7 days (rest days as zero), say that the week has little variety when monotony is above 2.0 and weekly load is also above the 4-week mean. *Source:* Foster 1998. Weak.
> - **R2.3 Longest session.** Warn when a planned or logged session is more than 1.10 × the longest of that sport in the last 30 days. Use stronger wording beyond 2 ×. The app's `LONG_GROW` of 1.10 matches this. *Reads:* `distKm` (runs), `durMin` (other sports). *Source:* Frandsen 2025. Moderate for runs, weak for other sports.
> - **R2.4 Weekly ramp as a cue only.** Compare this week with the mean of the 4 weeks before it, leaving this week out so the two are not coupled. Above 1.25 say "a bigger jump than usual". Never give an injury risk. The app's `RAMP_CAUTION` 1.25 and `RAMP_HIGH` 1.5 are conventions. *Source:* Lolli 2019; Impellizzeri 2020; Buist 2008. Weak.
> - **R2.5 Fitness and form as description.** Report CTL as rising, steady or falling and TSB as fresh or tired in the app's bands. Do not promise a TSB that means "ready to race". *Source:* Hellard 2006. Moderate (for the caution).

> **Do not claim**
>
> - That the 10% rule prevents injury.
> - That there is a ratio "sweet spot".
> - That load numbers predict your injury.
> - That a given TSB guarantees a good race.

## 3. How much easy and how much hard

### Evidence

**What elite athletes do.** Seiler (2010) described well-trained endurance athletes doing about 80% of their sessions easy (below the first threshold) and the rest hard, typically about two hard sessions a week.

**Trials and meta-analyses.**

- Stöggl and Sperlich (2014): over 9 weeks, a polarized pattern gave the largest gains, but groups were small.
- Rosenblat 2019 meta-analysis: favoured polarized over threshold training for time trials in well-trained athletes (effect size about 0.66), from few studies.
- Oliveira 2024 meta-analysis: a small advantage in VO2peak (standardised mean difference 0.24) and no clear time-trial advantage.
- Rosenblat 2025, the strongest analysis so far: an individual-participant network meta-analysis of 13 studies and 348 athletes found no difference between polarized and pyramidal patterns for VO2max or time trials.

**How you count changes the answer.** Sylta (2014) showed that counting time in heart rate zones put about 96% of training in the easy zone. Counting sessions by their goal put about 87% there. Minutes in zone and the "80% of sessions" figure are not the same measure.

### Strength and caveats

- Moderate evidence that mostly easy training with a little hard work is a sound pattern.
- Strong evidence that polarized and pyramidal patterns do about equally well (one high-quality pooled analysis).
- Most data come from trained athletes training 6 or more hours a week.
- Zone percentages of threshold heart rate (the app's `ZN_STEADY` 0.89 and `ZN_HARD` 0.94) are conventions.

### Rules the app could use

> **Rules the app could use**
>
> - **R3.1 Session mix.** Over 28 days, count sessions as hard (effort 4 or more, or 10 or more minutes in hard zones). Aim for about 75 to 80% easy sessions. Mention it when the easy share is below 70%, or when there are more than 2 hard sessions in any 7 days. *Reads:* `wkHard`, `wkMix`. *Source:* Seiler 2010. Moderate for the pattern; the 70% cut is the app's.
> - **R3.2 Minutes are description.** Show easy, steady and hard minutes, but never judge minutes against the 80% session figure. *Source:* Sylta 2014. Moderate.
> - **R3.3 No single best pattern.** Do not push polarized over pyramidal. *Source:* Rosenblat 2025. Strong.
> - **R3.4 Zones from heart rate move in the heat.** On hot days, easy pace sits at a higher heart rate than usual, so read zones with that in mind (see R10.5). *Source:* Périard 2021. Strong.

> **Do not claim**
>
> - That polarized training is proven best.
> - That you must follow 80/20 exactly.
> - That a given zone "burns the most fat".

## 4. Recovery time between hard sessions

### Evidence

**Heart rate variability after exercise.** Stanley, Peake and Buchheit (2013) reviewed how the heart's rest-and-recover activity returns after exercise:

| Session | Recovery |
|---|---|
| Low intensity | Within about 24 hours |
| Threshold work | 24 to 48 hours |
| High intensity | At least 48 hours |

Other findings from the same review:

- Fitter people recover faster.
- Intensity matters more than duration.
- Recovery is very individual.
- The data cover aerobic exercise only.

**In the first minutes.** Seiler (2007) found that in trained athletes HRV returned within minutes after work below the first threshold, and took much longer after work at or above threshold. Less-trained people needed longer still.

**What the studies do not cover.** Strength sessions and muscle damage, such as long downhill running.

### Strength and caveats

- Moderate evidence. It is a narrative review of mainly small studies.
- It measures heart recovery, not muscle or tendon recovery.

### Rules the app could use

> **Rules the app could use**
>
> - **R4.1 Spacing.** After an easy session, no limit. After an effort-4 session, the next hard one fits after 2 days. After effort 5 or a long hard session, 3 days. The app's `REC_HARD_D` 2 and `REC_BIG_D` 3 fit these ranges or are slightly more cautious. *Reads:* `wkEffOf`. *Source:* Stanley 2013. Moderate.
> - **R4.2 Personal bounce-back.** Once 5 or more clean hard sessions exist, use your own days back to baseline, kept between 1 and 4 days. *Reads:* `bounceDays`. *Source:* Stanley 2013 (recovery is individual). Weak to moderate; the method is the app's.
> - **R4.3 Long and easy is not hard.** A long session at easy heart rate does not by itself call for several recovery days. *Reads:* `wkMix`, `durMin`. *Source:* Stanley 2013; Seiler 2007. Moderate.

> **Do not claim**
>
> - A recovery time in hours.
> - That heart recovery means muscles are recovered.
> - Recovery times for strength sessions taken from these data.

## 5. Overreaching and overtraining

### Evidence

**The joint consensus.** The ECSS and ACSM statement (Meeusen 2013) describes a continuum:

| Stage | How long recovery takes | Outcome |
|---|---|---|
| Functional overreaching | Days to about 2 weeks | Often followed by a gain |
| Non-functional overreaching | Weeks to months | No gain |
| Overtraining syndrome | Months or longer | Diagnosed only once illness, low energy intake and other causes have been ruled out |

No single marker identifies any stage. A drop in performance together with mood questionnaires is the most practical signal.

**HRV can rise, not fall.** In Le Meur (2013), triathletes who were functionally overreached after a 3-week overload showed a rise in HRV while performance fell by about 9%.

**Illness.** The IOC consensus on load and illness (Schwellnus 2016) links sharp load changes and poor recovery with illness.

**Self-report.** Self-reported measures track load better than sensors (Saw 2016).

### Strength and caveats

- Strong for the continuum and for the absence of a single test.
- Weak to moderate for the HRV finding (one study).

### Rules the app could use

> **Rules the app could use**
>
> - **R5.1 Watch pattern.** Show "Watch for overreaching" when all of the following hold over 7 or more days:
>   - Mind sits below your usual;
>   - two or more sessions were harder than planned, or heart rate at pace rose (R1.4);
>   - load is above the 4-week mean.
>
>   Then suggest an easier week, about 25% less time. *Reads:* `calcMind`, `stMatch`, `sub.icu.hr`. *Source:* Meeusen 2013; Saw 2016; Nuuttila 2022. Moderate for the signals; the cuts are the app's.
> - **R5.2 Escalate.** If the pattern lasts beyond 2 weeks despite an easier week, suggest talking to a doctor, since illness or low energy intake can look the same. *Source:* Meeusen 2013. Moderate.
> - **R5.3 Rising HRV with falling mood.** HRV above its band, together with low mood or energy and falling performance, counts as a warning. *Source:* Le Meur 2013. Weak to moderate.
> - **R5.4 Burnout stays descriptive.** The check-in burnout risk is a description of mood, not a diagnosis.

> **Do not claim**
>
> - Overtraining syndrome or non-functional overreaching as a label.
> - "Your nervous system is overtrained".
> - That any single number shows overtraining.

## 6. Illness: the neck check, wearable signs, return

### Evidence

**The neck check.** The rule says: train lightly with symptoms above the neck (runny nose, sore throat), rest with symptoms below it (fever, aches, chest, stomach). The IOC consensus (Schwellnus 2022, part 1) traces it to expert opinion by Eichner (1993) and Primos (1996).

- No trial has tested the rule. The IOC consensus says these were expert opinions with no data behind them.
- Ruuskanen and colleagues (a 2022 review and a 2024 opinion piece) argue it has no evidence base. Viral respiratory infections can affect the whole body, so they call for more caution.

**IOC 2022.** The IOC consensus on acute respiratory illness in athletes (Schwellnus 2022, part 1, read in its accepted author version) sets out a stepwise return for every respiratory infection, whatever the virus:

- **Severity first.** Asymptomatic, mild, moderate or severe, by symptoms. Most infections (over 80%) are mild and short; symptoms usually clear in 1 to 3 days.
- **Mild.** Normal daily activity is allowed. A daily symptom checklist comes before any training.
- **Exercise challenge.** Once local symptoms have cleared or are very mild and the checklist is clear, a test session: moderate effort (60 to 70% of normal), checked after 10 to 20 minutes, stopped for excessive tiredness, breathlessness, chest pain, dizziness, a racing heart, muscle or joint pain, a higher effort than usual for the same load, or just not feeling well; checked again straight after and 24 hours later.
- **Then build.** With no abnormal response, training load (frequency, intensity, duration) rises session by session, with the same checks after each one until back to the usual level.
- **Moderate or severe.** Under a doctor's care. Severe illness means bed rest until regional and whole-body symptoms have cleared.

The consensus gives no fixed number of days. It is expert consensus, not trial results. Graded protocols published for COVID-19 suggest a stepped return over about a week after symptoms clear, and longer after fever or chest symptoms; these are expert practice too.

**How long illness lasts.** A meta-analysis from the same IOC group (Snyders 2022; 54 studies, 31,065 athletes) found symptoms last about 7 days on average, and about 20% of illnesses cost more than a day of training. Only 4 studies reported the days until return to sport: 0 to about 8.

**Wearable signs.** Several studies found that wearables pick up illness through a rise in resting heart rate and breathing rate and a fall in HRV, sometimes before symptoms:

| Study | What it found |
|---|---|
| Radin 2020 | Resting heart rate and sleep from about 200,000 users improved population-level tracking of flu-like illness. A population result, not an individual one. |
| Mishra 2020 | About 63% of COVID-19 cases showed heart rate changes before symptoms, looking back. Alerts also fired for travel, alcohol, altitude and other stressors. |
| Natarajan 2020 | Breathing rate, heart rate and HRV together separated sick days from well days with an area under the curve of 0.77. |
| Miller 2020 | Overnight breathing rate flagged about 20% of cases 2 days before symptoms and about 80% by day 3. The authors worked for a wearable maker. |

### Strength and caveats

- Neck check: weak (practice only).
- Wearable signs: moderate evidence that the signals move during illness, weak for any exact cut-off, with many false alarms. Heat, alcohol, a late meal, a hard session, travel and the menstrual cycle all move the same signals.
- Return protocols: expert consensus (IOC 2022), with no fixed number of days.

### Rules the app could use

> **Rules the app could use**
>
> - **R6.1 Below the neck means rest.** Symptoms below the neck give Rest, with no training until symptom-free. *Reads:* `checkins[].symptoms` = 2. *Source:* practice; Ruuskanen 2022, 2024. Weak.
> - **R6.2 Above the neck means easy only.** Symptoms above the neck allow short easy sessions only, and no hard ones until symptoms clear. *Reads:* `symptoms` = 1. *Source:* practice. Weak. Word it as caution, not permission.
> - **R6.3 Body signs.** Say "Your body may be fighting something" when breathing rate is 1 or more breaths a minute above the top of its 28-day band, together with resting heart rate z ≥ 1.5 or 7-day HRV z ≤ -1.5. Suggest easy or rest and a check of how you feel.
>
>   The app now acts on one night. Consider requiring the signs on two nights in a row, or one night plus symptoms, before calling it systemic, because a single night is easily moved by heat or alcohol.
>
>   *Reads:* `wellness[].resp`, `rhr`, `hrv`. *Source:* Natarajan 2020; Mishra 2020; Miller 2020. Moderate for the signals, weak for the cut-offs.
> - **R6.4 Return.**
>   - The first session after symptoms clear is a test: moderate effort (60 to 70% of usual), short, stopped if it feels wrong.
>   - Load rises only after a session with no bad response then or the next morning (check-in and resting heart rate back inside its band).
>   - Hard sessions come back last, after 2 to 3 symptom-free days. The 2 to 3 days are this review's practice choice; the IOC gives no number.
>   - After symptoms below the neck, use a graded return of about a week.
>
>   *Reads:* `symptoms`, `wellness[].rhr`, the next check-in. *Source:* IOC 2022 part 1 (stepwise return, exercise challenge at 60 to 70%, the after-session checklist); COVID-19 return protocols for the week. Weak (expert consensus).
> - **R6.5 See a doctor.** Chest pain, breathlessness out of proportion, a racing or irregular heartbeat, dizziness, fever, or symptoms beyond about 10 days mean seeing a doctor before training. *Source:* IOC 2022 part 1 checklists for the symptoms; Snyders 2022 for the usual length. Weak (expert consensus).

> **Do not claim**
>
> - That you have an infection, COVID-19 or flu.
> - That the neck check is proven safe.
> - That the band "detected" an illness.

## 7. Sleep

### Evidence

**How much.**

- Adults need at least 7 hours a night (Watson 2015, a joint AASM and SRS consensus). More than 9 hours may help someone recovering from sleep debt.
- The 2021 expert consensus on athletes (Walsh 2021) notes that many athletes sleep less than 7 hours. It recommends a personal target rather than one figure for everyone.

**Sleep loss and performance.** A meta-analysis (Craven 2022) found that acute sleep loss lowered performance by about 7.6% on average. The loss grew with time awake, about 0.4% for each hour.

**Extension and naps.**

- Extending sleep by about 2 hours a night helped a small group of basketball players (Mah 2011, 11 people).
- A systematic review of naps (Lastella 2021) supports naps of 20 to 90 minutes taken between about 13:00 and 16:00.

**Sleep debt over time.**

- Debt keeps building while nights stay short. Over 14 days at 4 or 6 hours in bed, performance fell steadily with no plateau, while how sleepy people felt levelled off (Van Dongen 2003). Feeling used to it is not a sign the debt has gone.
- One recovery night is not enough. One night of up to 10 hours in bed after five short nights did not bring performance back (Banks 2010). After four recovery nights of 12 hours in bed, some deficits were still there (Yamazaki 2021).
- Extra sleep comes mostly on the first recovery night and then falls off (Klerman & Dijk 2005). In Kitamura 2016 the first long night ran about 2 hours over the person's need and sleep was back near need by the fourth night; the authors put recovery from about 1 hour of debt at about 4 days.
- A week of extra time in bed before a stretch of short nights softened the drop (Rupp 2009, a small lab study). No study shows it cancels later short nights.
- Naps restored some of the body's stress markers after a short night (Faraut 2015, a small lab study).
- How long an old shortfall keeps mattering is not known. Models of sleep loss work in days to weeks with no time constant fit for an individual (McCauley 2013). One ring maker counts 14 days, weights recent days more and needs 5 of them (Oura help pages, not peer reviewed).

**Caffeine.**

- A meta-analysis (Gardiner 2023) found caffeine cut total sleep by about 45 minutes and deep sleep by about 11 minutes. To avoid that, a cup of coffee should come at least 8.8 hours before bed, and a high-dose pre-workout product at least 13.2 hours before.
- Drake (2013) found that 400 mg taken even 6 hours before bed cut sleep by more than an hour.

**Regularity.** In a large cohort (Windred 2024), regular sleep timing predicted mortality better than sleep duration did. No cut-off for "regular enough" was set for use by individuals.

**Device accuracy.** Consumer sleep devices detect sleep well but detect wake poorly, with specificity of about 0.18 to 0.54. Stage accuracy is mixed (Chinoy 2021).

**Naps from daytime heart rate.**

- Heart rate falls at each move into sleep and rises again after a waking (Burgess 1999, 6 people). Part of the evening fall is sleep itself and part is the body clock (Carrington 2003), so a daytime nap does not reach the night's sleeping level. Neither paper gives a size in beats a minute that an app could use as a cut.
- In athletes, a daytime nap shifts heart rate variability toward the resting (vagal) side (Souabni 2024). Older adults show less of this shift than young adults (Chen 2021).
- Stillness alone over-counts sleep: wrist movement found sleep well but only about a third of the wake (specificity 0.33, Marino 2013). Adding heart rate and the time of day raised wake detection to about 60% (Walch 2019, 31 people).
- A wrist tracker found 24 of 30 nights but only 6 of 20 naps in young athletes (Sargent 2018). No study validates nap detection from a consumer band against a sleep lab, so any rule here is the app's own and must be checked on the person's data.

### Strength and caveats

| Claim | Strength |
|---|---|
| At least 7 hours | Strong |
| Sleep loss hurts performance | Moderate |
| Nap window | Moderate |
| Caffeine timing | Moderate (lab studies) |
| Regularity | Weak for any threshold |
| Device sleep stages | Low accuracy, so stage minutes are description only |
| Heart rate falls in sleep, also by day | Moderate for the direction, no usable size |
| Naps found from stillness and heart rate | Weak: no validation for consumer bands, so the app neither counts nor asks; naps are added by hand |
| Debt keeps building on short nights | Moderate (lab studies) |
| Paying back takes several nights | Moderate (lab studies) |
| How long old debt matters | Not known: the half-life is the app's choice |

### Rules the app could use

> **Rules the app could use**
>
> - **R7.1 Sleep need.** Never set the goal below 7 hours asleep. The default target is 7 to 9 hours, adjusted by the person. *Reads:* `profile.sleepGoal`, `sleepLogs[].durMin`. *Source:* Watson 2015; Walsh 2021. Strong for the floor, weak for any one target.
> - **R7.2 Short night.** After a night 2 or more hours under need, suggest moving a hard session later in the day or swapping it for easy, and a 20 to 90 minute nap between 13:00 and 16:00. *Source:* Craven 2022; Lastella 2021. Moderate for the effect; the 2-hour cut is the app's.
> - **R7.3 Caffeine cut-off.** Last coffee at least 8.8 hours before the usual bedtime (median `bed` over 14 nights). For pre-workout products, at least 13 hours. The app's "after 14:00" matches a bedtime near 23:00; working it out from the person's own bedtime is better. *Reads:* `checkins[].coffeeLate`, `sleepLogs[].bed`. *Source:* Gardiner 2023; Drake 2013. Moderate.
> - **R7.4 Regularity is description.** Show how much bed and wake times vary over 14 nights, and mention it only when it is clearly above your usual. No fixed cut-off. *Source:* Windred 2024. Weak.
> - **R7.5 Stages are description.** Describe deep and dreaming sleep but never judge them as too low. *Source:* Chinoy 2021. Strong (for the caution).
> - **R7.6 Sleep debt informs, it does not score.** Count debt only over nights that count (`slCounts`), against the person's sleep goal. It fades: what was there before halves every 7 nights, read over the last 42 nights, so no night drops out all at once. A short night adds its shortfall. A longer night or a nap pays back at most 2 hours. It never goes below zero. A missing night adds and pays nothing, and the old debt only fades. Show it from 5 counted nights of the last 14. It shapes advice and never lowers Body, as already decided for v132. The half-life is the app's choice; no study gives one. *Reads:* `sleepLogs[]`, `profile.sleepGoal`, naps from `napsOn`. *Source:* Van Dongen 2003 (no plateau); Banks 2010, Yamazaki 2021, Kitamura 2016, Klerman & Dijk 2005 (payback over several nights, most on the first); Rupp 2009 (no banking); Faraut 2015 (naps); McCauley 2013 (no time constant); Walsh 2021 (individual need). Moderate for building and slow payback, weak for the fade.
> - **R7.7 Naps from daytime heart rate.** A daytime stretch of 20 to 90 minutes away from the nights, with no steps, movement no higher than the band records while you sleep that night, and no workout across it, is a candidate. Its heart rate is placed between your quiet-awake level (the middle of still, awake 5-minute readings within 3 hours either side) and that night's sleeping level: closer to sleep counts, in between asks "Looks like a nap. Count it?", nearer awake is nothing. A rise at the end, the band's own sleep mark and the 13:00 to 16:00 window add weight; none counts alone. A nap you add or answer always wins. Naps pay back sleep debt and show in Your day only. *Reads:* the band's 5-minute steps, movement and heart rate, `polarNights`, `wkOn()`. *Source:* Burgess 1999; Carrington 2003; Souabni 2024; Marino 2013; Walch 2019; Sargent 2018 (6 of 20 naps found); Lastella 2021 (length and window). Weak: the cut-offs are the app's, set on the person's own days.
>   *v133:* not built as a question. On the person's own days, heart rate alone could not tell a known nap from sitting still: any cut-off that found the nap also asked on quiet afternoons without one, and the 5-minute steps were not stored yet. The app does not ask. A nap is added by hand in Log > Sleep, and the band's own sleep mark still counts only under the strict v131 rule. Look again once 5-minute steps have been stored for a few weeks.

> **Do not claim**
>
> - A sleep disorder, insomnia or apnoea, including from SpO2 dips.
> - That the band measures deep sleep accurately.
> - An exact performance loss for last night.
> - That a nap was measured: its start, end and length are estimates, and it has no stages.

## 8. Fitness and performance markers

### Evidence

**Watch VO2max.** A systematic review (Molina-Garcia 2022) found that estimates from exercise data have wide limits of agreement with the lab, about ±9.9 ml/kg/min. Estimates from rest are worse.

**Race prediction.** Riegel's formula (1981) predicts time 2 = time 1 × (distance 2 / distance 1)^1.06. Vickers and Vertosick (2016) found it too fast in the marathon by 10 minutes or more for half of recreational runners. Adding training volume helped.

**Critical power and critical speed.** These mark the boundary between the heavy and severe domains (Poole 2016). Estimating them needs 2 to 4 maximal efforts lasting roughly 2 to 15 minutes.

**Heart rate drift.** Heart rate rises during long steady exercise even at the same power, more so with heat and fluid loss (Coyle 2001). Maunder (2021) calls the ability to resist this kind of decline "durability". The common bands of under 5% as good and over 10% as high drift are a coaching convention, not a validated cut-off.

**Heart rate recovery.**

- Cole (1999) found that a fall of 12 beats or less in the first minute after a clinical treadmill test predicted mortality. That is a clinical test in patients, not a field measure for athletes.
- In athletes (Daanen 2012), heart rate recovery changes with both fitness and fatigue, so its meaning is ambiguous.

**Cadence.** Raising running step rate by 5 to 10% lowers loading at the knee and hip (Heiderscheit 2011). That is a biomechanics finding; it does not show fewer injuries.

**Maximum heart rate.** When no observed maximum exists, 208 - 0.7 × age estimates it, with an error of about ±10 beats (Tanaka 2001).

### Strength and caveats

| Claim | Strength |
|---|---|
| Watch VO2max is imprecise | Strong |
| Riegel's limits | Moderate |
| Critical power concept | Strong |
| Drift bands | Weak |
| Heart rate recovery is ambiguous | Moderate |
| Cadence and loading | Moderate for mechanics, weak for injury |

### Rules the app could use

> **Rules the app could use**
>
> - **R8.1 Watch VO2max is a trend.** Mention a change only when it holds in two readings 28 or more days apart. Call it "your watch's estimate". Never compare it with lab norms. *Reads:* `wellness[].vo2`. *Source:* Molina-Garcia 2022. Strong for the caution.
> - **R8.2 Race prediction.** Use Riegel with exponent 1.06 from a recent hard effort, up to the half marathon. For a marathon, say the prediction is likely optimistic, or do not give one. *Reads:* `intervalsData.prs`, `distKm`, `durMin`. *Source:* Riegel 1981; Vickers 2016. Moderate.
> - **R8.3 Hardest efforts are not critical power.** Hardest 5 and 20 minutes from normal sessions are lower bounds, not critical power. *Reads:* workout streams. *Source:* Poole 2016. Strong.
> - **R8.4 Drift against yourself.** Compare drift with your own similar sessions, and say that heat raises it. Keep `DRIFT_OK` 5 and `DRIFT_HIGH` 10 as labels, not judgements. *Reads:* `sub.icu.dec`. *Source:* Coyle 2001; Maunder 2021. Weak.
> - **R8.5 Heart rate recovery against yourself.** Compare only with your last 10 sessions of the same sport. Never use the clinical 12-beat cut. *Reads:* `sub.icu.hrr`. *Source:* Daanen 2012; Cole 1999. Moderate.
> - **R8.6 Cadence option.** For a runner with an active knee or hip injury and cadence data, offer a step rate 5 to 10% higher as one option, not a target such as 180. *Reads:* `injuries[].part`, `sub.icu.cad`. *Source:* Heiderscheit 2011. Weak to moderate.
> - **R8.7 Maximum heart rate.** Use the observed maximum. Fall back on 208 - 0.7 × age, marked as an estimate. *Reads:* `sub.icu.mx`, `profile.age`. *Source:* Tanaka 2001. Moderate.

> **Do not claim**
>
> - A precise VO2max.
> - A guaranteed race time.
> - That drift above 5% means poor fitness.
> - That slow heart rate recovery means heart disease.

## 9. Weight and low energy availability (REDs)

### Evidence

**Rate of loss.** In elite athletes, losing about 0.7% of body weight a week kept lean mass and strength better than losing about 1.4% (Garthe 2011, about 24 athletes).

**REDs.** The 2023 IOC consensus on Relative Energy Deficiency in Sport (Mountjoy 2023) treats low energy availability as a spectrum.

- It offers a clinical screening tool, CAT2, with a traffic-light result.
- The old figure of 30 kcal per kg of fat-free mass came from short lab studies. There is no single threshold.
- Signs include falling weight, low energy and mood, repeated illness, bone stress injuries and stalled performance.

### Strength and caveats

- Rate of loss: weak to moderate (one small trial in elite athletes).
- The REDs concept: strong.
- The app cannot compute energy availability: it has no fat-free mass, and food logging is optional and rough.

### Rules the app could use

> **Rules the app could use**
>
> - **R9.1 Rate of loss.** Use the 7-day average weight. Note loss faster than 0.7% of body weight a week sustained over 2 or more weeks. The app's `WT_RATE` of 1% a week is looser than the evidence; consider 0.7%. *Reads:* `measurements[].weight`. *Source:* Garthe 2011. Weak to moderate.
> - **R9.2 REDs prompt.** When two or more of these signs persist for 4 or more weeks, suggest seeing a sports doctor or dietitian, naming REDs screening as the next step:
>   - falling weight;
>   - food logged well under estimated use (`fuelPlan().week.low`);
>   - Mind below usual;
>   - two or more illnesses;
>   - a bone or stress injury;
>   - sessions harder than planned.
>
>   *Source:* Mountjoy 2023. Strong for the concept; the combination is the app's.
> - **R9.3 No energy availability number.** Never compute or show energy availability. *Source:* Mountjoy 2023. Strong.

> **Do not claim**
>
> - REDs, an eating disorder or a hormone problem.
> - "Your energy availability is N".
> - A body fat target.

## 10. Fuel, fluids and heat

### Evidence

**Daily carbohydrate.** The ACSM, Academy and Dietitians of Canada position (Thomas 2016) sets daily carbohydrate by training:

| Training | Carbohydrate a day |
|---|---|
| Light | 3 to 5 g/kg |
| About 1 hour a day, moderate | 5 to 7 g/kg |
| 1 to 3 hours a day | 6 to 10 g/kg |
| 4 or more hours a day | 8 to 12 g/kg |

**Protein.**

- The ISSN position (Jäger 2017) recommends 1.4 to 2.0 g/kg a day, in doses of about 0.25 g/kg every 3 to 4 hours.
- It suggests 2.3 to 3.1 g/kg may help keep lean mass during an energy deficit in resistance-trained people.
- A meta-analysis of 49 trials (Morton 2018) found that gains in lean mass levelled off at about 1.62 g/kg a day.

**Carbohydrate during exercise.** Jeukendrup (2014) gives amounts per hour, not per kg of body weight:

| Session length | Carbohydrate |
|---|---|
| About 1 hour | A mouth rinse or small amounts |
| 2 to 3 hours | Up to 60 g/h |
| Ultra-endurance | Up to 90 g/h, from mixed sugars such as glucose with fructose |

The 30 g/h figure for 1 to 2 hours appears in secondary summaries of this work; it was not found in the primary text. This guidance was funded by a sports drink maker's institute.

**Fluids.** The ACSM fluid position (Sawka 2007) recommends keeping body weight loss during a session under 2%. Sweat rate can be estimated by weighing before and after. Drinking 1.5 litres for each kg lost afterwards is often quoted, but it was found only in secondary sources.

**Heat.**

- Acclimatisation takes 1 to 2 weeks of daily heat exposure (Racinais 2015).
- In the heat, heart rate is higher for the same pace, drift is larger and performance falls (Périard 2021).
- Someone living in the tropics is largely acclimatised but can lose some tolerance after time away.

**Caffeine.** 3 to 6 mg/kg about an hour before improves performance, and doses as low as about 2 mg/kg may help (Guest 2021).

### Strength and caveats

| Claim | Strength |
|---|---|
| Carbohydrate and protein ranges | Strong |
| Rates during exercise | Moderate; the 1 to 2 hour figure is weak |
| Under 2% body weight loss | Strong |
| Heat physiology | Strong |
| Caffeine | Strong |

The app has no air temperature, humidity or before-and-after weights, so heat and fluid rules can only be general advice.

### Rules the app could use

> **Rules the app could use**
>
> - **R10.1 Daily carbohydrate.** Use the ranges above. The app's 3 to 8 g/kg sits inside them; allow up to 10 g/kg on days of 1 to 3 hours of training. *Reads:* `fuelPlan`. *Source:* Thomas 2016. Strong.
> - **R10.2 Protein.** At least 1.6 g/kg a day, up to 2.0 to 2.2. Spread it in doses of about 0.25 g/kg every 3 to 4 hours. Go higher with the "lose" goal. The app's 1.6 to 2.0 matches. *Reads:* `foodLogs[].protein`, `profile.nutGoal`. *Source:* Morton 2018; Jäger 2017. Strong.
> - **R10.3 During exercise.**
>   - Nothing needed under an hour.
>   - Up to 30 g/h for 1 to 2 hours (weak).
>   - Up to 60 g/h for 2 to 3 hours.
>   - Up to 90 g/h beyond, from mixed sugars.
>
>   Do not scale by weight. The app's 30, 45 and 60 g/h by duration fit this. *Source:* Jeukendrup 2014. Moderate.
> - **R10.4 Fluids.** Aim to lose under 2% of body weight in a session. Offer an optional sweat test: sweat per hour ≈ (weight before - weight after in kg + litres drunk) / hours. Warn against drinking enough to gain weight. *Reads:* `measurements[].weight` (needs a paired weigh-in). *Source:* Sawka 2007. Strong.
> - **R10.5 Heat.** Tell the athlete to:
>   - expect higher heart rate and drift on hot, humid days;
>   - pace easy sessions by heart rate or feel;
>   - put hard sessions in the cooler hours;
>   - after 2 or more weeks away from the heat, ease in over 1 to 2 weeks.
>
>   *Source:* Racinais 2015; Périard 2021. Strong for the physiology; there is no weather data.
> - **R10.6 Caffeine before a session.** 3 to 6 mg/kg about an hour before, lower doses are fine, and respect R7.3. *Source:* Guest 2021; Gardiner 2023. Strong.
> - **R10.7 Blood results.** Never change fuel advice because of blood results; this is an existing app rule.

> **Do not claim**
>
> - A sweat rate without weighing.
> - That you are dehydrated.
> - Exact sodium needs.
> - That one food or supplement will improve performance.

## 11. Injury and return to training

### Evidence

**Pain monitoring.** Silbernagel (2007) let people with Achilles tendon pain keep training under a pain-monitoring model. Pain up to 5 out of 10 during and after activity was acceptable as long as it settled by the next morning and did not rise week to week. Outcomes matched rest, and activity was kept up.

**Detraining.** Fitness falls within 2 to 4 weeks of stopping (Mujika and Padilla 2000). VO2max and blood volume drop early, which supports a reduced comeback.

**Load.** Load spikes are linked with injury (Soligard 2016). A single session longer than the recent longest is a specific risk for runners (Frandsen 2025; see topic 2).

### Strength and caveats

- Pain model: moderate (one condition, a randomised trial).
- Detraining: moderate.
- Exact comeback percentages: practice.

### Rules the app could use

> **Rules the app could use**
>
> - **R11.1 Pain bands.** Fine at 3 or less, step back at 5 or more, stop at 7 or more, and check that pain has settled by next morning. The app's `PAIN_OK`, `PAIN_BACK` and `PAIN_STOP` of 3, 5 and 7 are more cautious than the evidence; keep them. *Reads:* `sub.pain`, next day's `checkins[].soreness`. *Source:* Silbernagel 2007. Moderate.
> - **R11.2 Comeback volume.** After 2 or more weeks off, restart below the usual week. The app's comeback percentages are practice. *Reads:* `stReturn`. *Source:* Mujika 2000. Weak for the exact percentages.
> - **R11.3 No spikes on the way back.** During a return, keep every session within 1.10 × the longest of that sport in the last 30 days. *Source:* Frandsen 2025. Moderate for runs.
> - **R11.4 Get it checked.** Severity 3, pain of 7 or more, pain that rises during a session, night pain, swelling or pain on one spot of a bone means stop and see a clinician. *Reads:* `injuries[].sev`, `sub.pain`. *Source:* practice. Weak.

> **Do not claim**
>
> - An injury diagnosis such as a stress fracture or tendinopathy.
> - A return date for an injury.

## 12. Blood markers (mg/dL)

### Evidence

**Fasting glucose** (ADA Standards of Care 2026):

| Range | Category |
|---|---|
| Under 100 mg/dL | Normal |
| 100 to 125 | Prediabetes range |
| 126 or more | Diabetes range; a repeat test is needed to confirm |

**Cholesterol** (NCEP ATP III 2002), with the later AHA/ACC guideline (Grundy 2019) using a risk-based approach and allowing non-fasting samples:

| Marker | Bands |
|---|---|
| LDL | Under 100 optimal; 100 to 129 near optimal; 130 to 159 borderline high; 160 to 189 high; 190 or more very high |
| Total cholesterol | Under 200 desirable; 200 to 239 borderline high; 240 or more high |
| HDL | Under 40 low; 60 or more high |
| Non-HDL (total minus HDL) | Goal is the LDL goal plus 30 |

**Uric acid.** At 6.8 mg/dL or more, urate is above its saturation point (hyperuricemia). The American College of Rheumatology (FitzGerald 2020) advises against starting urate-lowering treatment without gout. Hard exercise and fluid loss may raise uric acid briefly; that was not verified for this review.

### Strength and caveats

- Strong for the categories.
- One test is not a diagnosis.
- The app cannot compute cardiovascular risk properly without smoking status, treatment and other inputs, and should not try.

### Rules the app could use

> **Rules the app could use**
>
> - **R12.1 Glucose.** Fasting values only: under 100 normal; 100 to 125 "in the range doctors call prediabetes"; 126 or more "worth a repeat test and a doctor". *Reads:* `bloodLogs[].glucose`. *Source:* ADA 2026. Strong.
> - **R12.2 LDL.** Use the five bands above. At 190 or more, suggest a doctor. *Reads:* `ldl`. *Source:* ATP III; Grundy 2019. Strong.
> - **R12.3 Total cholesterol and HDL.** Use the bands above, and show non-HDL when both are present. *Reads:* `chol`, `hdl`. *Source:* ATP III. Strong.
> - **R12.4 Uric acid.** At 6.8 or more say "worth mentioning to your doctor", with no treatment advice. *Reads:* `uric`. *Source:* FitzGerald 2020. Moderate.
> - **R12.5 Trends.** Describe the change from the last test, but do not call a small change real. No verified figure for lab variation was found (see Gaps).

> **Do not claim**
>
> - Diabetes, gout or heart disease.
> - Advice on medicines.
> - A personal heart risk percentage.
> - Any value in mmol/L.

## 13. Blood pressure

### Evidence

**US categories.** The ACC/AHA guideline (Whelton 2018) and its 2025 update (Jones 2025) use the same categories:

| Category | Systolic | | Diastolic |
|---|---|---|---|
| Normal | Under 120 | and | under 80 |
| Elevated | 120 to 129 | and | under 80 |
| Stage 1 | 130 to 139 | or | 80 to 89 |
| Stage 2 | 140 or more | or | 90 or more |

**European categories.** The ESC guideline (McEvoy 2024) differs:

| Category | Reading |
|---|---|
| Non-elevated | Under 120/70 |
| Elevated | 120 to 139 / 70 to 89 |
| Hypertension | 140/90 or more, confirmed outside the clinic |

**Readings.** Both guidelines classify on the average of at least 2 readings on at least 2 occasions. The 2017 guideline treats readings above 180/120 as severe; that was not checked against the full text for this review.

**Training effect.** Endurance training lowers blood pressure by about 3.5/2.5 mmHg on average, and about 8.3/5.2 in people with high blood pressure (Cornelissen 2013).

### Strength and caveats

- Strong for the categories.
- The guidelines differ from each other, so the app should pick one and say which.
- Home readings vary; caffeine and recent exercise move them.

### Rules the app could use

> **Rules the app could use**
>
> - **R13.1 Classify from averages.** Classify only from the average of 2 or more readings on 2 or more days, ideally a week of morning readings. A single reading is "one reading", not a category. *Reads:* `measurements[].bpSys`, `bpDia`. *Source:* Whelton 2018; Jones 2025; McEvoy 2024. Strong.
> - **R13.2 One guideline.** Use the AHA/ACC bands above throughout, and name them in the info text. *Source:* Jones 2025. Strong.
> - **R13.3 Very high readings.** Repeated readings of 180 systolic or 120 diastolic or more mean seeking medical advice promptly. *Source:* Whelton 2018 (not checked in full). Moderate.
> - **R13.4 Taking a reading.** Suggest a reading after 5 minutes seated, and not within 30 minutes of exercise or coffee. *Source:* guideline practice (not checked in full). Weak to moderate.
> - **R13.5 Training effect as context.** Regular endurance training can lower blood pressure by a few mmHg. Use this in the briefing only as context. *Source:* Cornelissen 2013. Strong.

> **Do not claim**
>
> - Hypertension as a diagnosis.
> - Advice to start or stop medicine.

## 14. Age

### Evidence

**Maximum heart rate.** 208 - 0.7 × age (Tanaka 2001).

**Fitness and mortality.** A meta-analysis of cohorts (Kodama 2009) linked low fitness with higher mortality: relative risk of about 1.70 for low against high fitness, and about 13% lower risk for each 1 MET of fitness (1 MET is 3.5 ml/kg/min of VO2max). This is observational.

**Recovery with age.** Not reviewed in depth here. The app's personal bounce-back data (R4.2) are a better guide for one person than an age rule.

### Rules the app could use

> **Rules the app could use**
>
> - **R14.1 Maximum heart rate fallback.** Use the formula only when no observed maximum exists (R8.7). *Source:* Tanaka 2001. Moderate.
> - **R14.2 Fitness and health as context.** The briefing may say that better fitness is linked with better long-term health. It must not turn a VO2max change into a personal risk number. *Source:* Kodama 2009. Moderate (observational).

> **Do not claim**
>
> - A "fitness age" or a mortality risk.
> - That age by itself needs longer recovery.

## How the current app constants compare

| Constant | Value | Evidence | Verdict |
|---|---|---|---|
| `LONG_GROW` | 1.10 × 30-day longest | Frandsen 2025 | Supported (runs) |
| `RAMP_CAUTION` / `RAMP_HIGH` | 1.25 / 1.5 | Gabbett 2016, disputed by Impellizzeri 2020 and Lolli 2019 | Keep as wording only; leave this week out of the mean |
| `PAIN_OK` / `PAIN_BACK` / `PAIN_STOP` | 3 / 5 / 7 | Silbernagel 2007 allowed 5 | More cautious; keep |
| Body HRV z with SD/√7, 28-day band | z ≤ -1.5 | SWC of 0.5 SD is about z -1.3 | Close; fine |
| `MIN_BASE_DAYS` | 14 | About 4-week baselines in trials | Reasonable minimum |
| Illness gate | breathing +1 with resting heart rate z ≥ 1.5 or HRV z ≤ -1.5 | Natarajan 2020, Mishra 2020 | Signals right; consider a second night |
| `DRIFT_OK` / `DRIFT_HIGH` | 5 / 10% | Coaching convention | Weak; compare with own sessions |
| `REC_HARD_D` / `REC_BIG_D` | 2 / 3 days | Stanley 2013: 24 to 48 h, 48 h or more | Consistent, slightly cautious |
| `ZN_STEADY` / `ZN_HARD` | 0.89 / 0.94 of threshold heart rate | Convention | Weak |
| Hard days | at most 2 in 7 | Seiler 2010 | Consistent |
| Carbohydrate | 3 to 8 g/kg | Thomas 2016 (3 to 12) | Inside; allow 10 on long days |
| Protein | 1.6 to 2.0 g/kg | Morton 2018; Jäger 2017 | Matches |
| During exercise | 30 / 45 / 60 g/h | Jeukendrup 2014 | Consistent; 90 for very long |
| `WT_RATE` | 1% a week | Garthe 2011: 0.7% | Consider 0.7% |
| Late coffee | after 14:00 | Gardiner 2023: 8.8 h before bed | Fits about 23:00; better from own bedtime |
| `CORR_MIN_N` | 14 days | r must reach 0.53 at n = 14 | Add the r threshold |

## Gaps

Things the evidence does not settle, or that the app cannot measure:

- **No weather data.** Heat rules (topic 10) cannot use temperature or humidity, so heat advice stays general. Drift and heart rate at pace will look worse on hot days with no way to correct for it.
- **No before-and-after weights.** Sweat rate and the 2% rule need a paired weigh-in around a session.
- **Band HRV and sleep stages.** Most HRV trials used morning chest-strap readings. Overnight band rMSSD is a different measure, and its smallest worthwhile change has not been set. Stage minutes from bands are not accurate enough to judge.
- **Strength, yoga, hiking, swimming and e-bike rides.** Almost all the load, intensity and recovery evidence is from running and cycling. Swimming heart rate and e-bike effort have little direct evidence; the app's choice to judge e-bike rides by time and heart rate is reasonable but untested.
- **Illness.** The neck check is untested. The IOC return steps are expert consensus with no fixed number of days, and the cut-offs for wearable signs are not settled for individuals.
- **Thresholds for regularity, weight noise and lab variation.** No verified figure was found for when bedtime variation, a weight change or a change between two blood tests becomes meaningful for one person.
- **Menstrual cycle.** Not logged. It moves resting heart rate, HRV and breathing rate, and is a known cause of false illness alerts.
- **Recovery with age, and in hot climates.** Not reviewed in depth.
- **Effort on a 1 to 5 scale.** Session RPE was validated on 0 to 10. Doubling 1 to 5 is an approximation.
- **One reference stays unverified:** Banister 1975 (not indexed). Rules cite Calvert 1976 for the fitness-fatigue model instead.

## Evidence table

| Topic | Key source | Type | Strength |
|---|---|---|---|
| 1. Hard or easy | Düking 2021; Manresa-Rocamora 2021 | Meta-analyses | Moderate (safe), weak (better) |
| 1. Self-report | Saw 2016 | Systematic review | Strong |
| 2. Session RPE | Foster 2001; Haddad 2017 | Method study; review | Strong |
| 2. Monotony | Foster 1998 | Observational | Weak |
| 2. Ratio and coupling | Impellizzeri 2020; Lolli 2019 | Critiques | Moderate (against the ratio) |
| 2. 10% rule | Buist 2008 | Randomised trial | Moderate (null) |
| 2. Single session | Frandsen 2025 | Cohort (about 5,200) | Moderate |
| 2. Load and injury | Soligard 2016 | IOC consensus | Strong |
| 3. Intensity | Rosenblat 2025 | Individual-participant network meta-analysis | Strong |
| 3. Intensity | Seiler 2010 | Review of elite practice | Moderate |
| 4. Recovery | Stanley 2013 | Narrative review | Moderate |
| 5. Overreaching | Meeusen 2013 | ECSS/ACSM consensus | Strong |
| 5. HRV in overreaching | Le Meur 2013 | Controlled study | Weak to moderate |
| 6. Neck check | Ruuskanen 2022, 2024 | Review; opinion | Weak |
| 6. Illness length | Snyders 2022 | Meta-analysis | Moderate |
| 6. Wearable signs | Natarajan 2020; Mishra 2020; Miller 2020 | Cohorts | Moderate (signals), weak (cut-offs) |
| 7. Sleep need | Watson 2015; Walsh 2021 | Consensus statements | Strong |
| 7. Sleep loss | Craven 2022 | Meta-analysis | Moderate |
| 7. Caffeine | Gardiner 2023 | Meta-analysis | Moderate |
| 7. Devices | Chinoy 2021 | Validation study | Moderate |
| 7. Sleep debt | Van Dongen 2003; Banks 2010; Kitamura 2016 | Lab trials | Moderate (building, slow payback), none (half-life) |
| 8. Watch VO2max | Molina-Garcia 2022 | Meta-analysis | Strong |
| 8. Race prediction | Vickers 2016 | Large observational | Moderate |
| 8. Critical power | Poole 2016 | Review | Strong |
| 8. Drift bands | Coyle 2001 (drift); bands are convention | Review; convention | Weak |
| 8. Heart rate recovery | Daanen 2012 | Systematic review | Moderate |
| 9. REDs | Mountjoy 2023 | IOC consensus | Strong |
| 9. Rate of loss | Garthe 2011 | Small trial | Weak to moderate |
| 10. Carbohydrate | Thomas 2016 | Joint position stand | Strong |
| 10. Protein | Morton 2018; Jäger 2017 | Meta-analysis; position stand | Strong |
| 10. During exercise | Jeukendrup 2014 | Review | Moderate |
| 10. Fluids | Sawka 2007 | ACSM position stand | Strong |
| 10. Heat | Racinais 2015; Périard 2021 | Consensus; review | Strong |
| 10. Caffeine | Guest 2021 | ISSN position stand | Strong |
| 11. Pain model | Silbernagel 2007 | Randomised trial | Moderate |
| 11. Detraining | Mujika 2000 | Review | Moderate |
| 12. Glucose | ADA 2026 | Guideline | Strong |
| 12. Cholesterol | ATP III 2002; Grundy 2019 | Guidelines | Strong |
| 12. Uric acid | FitzGerald 2020 | Guideline | Moderate |
| 13. Blood pressure | Jones 2025; McEvoy 2024 | Guidelines | Strong |
| 13. Training and blood pressure | Cornelissen 2013 | Meta-analysis | Strong |
| 14. Maximum heart rate | Tanaka 2001 | Meta-analysis and lab study | Moderate |
| 14. Fitness and mortality | Kodama 2009 | Meta-analysis of cohorts | Moderate |

## References

Every DOI and PubMed number below was checked against Crossref or PubMed (11 Oct 2026; 93 to 100 on 15 Oct 2026). Items marked **unverified** could not be confirmed. No DOI was guessed; where none is given, none exists or none was found.

1. American Diabetes Association Professional Practice Committee. 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes 2026. *Diabetes Care* 2026;49(Suppl 1):S27-S49. doi:10.2337/dc26-S002
2. Banister EW, Calvert TW, Savage MV, Bach T. A systems model of training for athletic performance. *Aust J Sports Med* 1975;7:57-61. **Unverified**: not indexed in Crossref or PubMed; details from later citations. Rules cite Calvert 1976.
3. Buchheit M. Monitoring training status with HR measures: do all roads lead to Rome? *Front Physiol* 2014;5:73. doi:10.3389/fphys.2014.00073
4. Buist I, Bredeweg SW, van Mechelen W, Lemmink KA, Pepping GJ, Diercks RL. No effect of a graded training program on the number of running-related injuries in novice runners: a randomized controlled trial. *Am J Sports Med* 2008;36(1):33-39. doi:10.1177/0363546507307505. PMID 17940147.
5. Calvert TW, Banister EW, Savage MV, Bach T. A systems model of the effects of training on physical performance. *IEEE Trans Syst Man Cybern* 1976;SMC-6(2):94-102. doi:10.1109/TSMC.1976.5409179 (not in PubMed).
6. Chinoy ED, Cuba JA, Kirkpatrick JW, et al. Performance of seven consumer sleep-tracking devices compared with polysomnography. *Sleep* 2021;44(5):zsaa291. doi:10.1093/sleep/zsaa291
7. Cole CR, Blackstone EH, Pashkow FJ, Snader CE, Lauer MS. Heart-rate recovery immediately after exercise as a predictor of mortality. *N Engl J Med* 1999;341(18):1351-1357. doi:10.1056/NEJM199910283411804. PMID 10536127.
8. Cornelissen VA, Smart NA. Exercise training for blood pressure: a systematic review and meta-analysis. *J Am Heart Assoc* 2013;2(1):e004473. doi:10.1161/JAHA.112.004473
9. Coyle EF, González-Alonso J. Cardiovascular drift during prolonged exercise: new perspectives. *Exerc Sport Sci Rev* 2001;29(2):88-92. doi:10.1097/00003677-200104000-00009. PMID 11337829.
10. Craven J, McCartney D, Desbrow B, et al. Effects of acute sleep loss on physical performance: a systematic and meta-analytical review. *Sports Med* 2022;52(11):2669-2690. doi:10.1007/s40279-022-01706-y
11. Daanen HAM, Lamberts RP, Kallen VL, Jin A, Van Meeteren NLU. A systematic review on heart-rate recovery to monitor changes in training status in athletes. *Int J Sports Physiol Perform* 2012;7(3):251-260. doi:10.1123/ijspp.7.3.251
12. Drake C, Roehrs T, Shambroom J, Roth T. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. *J Clin Sleep Med* 2013;9(11):1195-1200. doi:10.5664/jcsm.3170
13. Düking P, Zinner C, Trabelsi K, et al. Monitoring and adapting endurance training on the basis of heart rate variability monitored by wearable technologies: a systematic review with meta-analysis. *J Sci Med Sport* 2021;24(11):1180-1192. doi:10.1016/j.jsams.2021.04.012
14. Eichner ER. Infection, immunity, and exercise. *Phys Sportsmed* 1993;21(1):125-135. doi:10.1080/00913847.1993.11710319. PMID 27414832. Cited by IOC 2022 part 1 as the origin of the neck check; the paper itself was not read.
14a. Primos WA. Sports and exercise during acute illness. *Phys Sportsmed* 1996;24(1):44-54. Cited by IOC 2022 part 1 with Eichner; not read.
15. FitzGerald JD, Dalbeth N, Mikuls T, et al. 2020 American College of Rheumatology guideline for the management of gout. *Arthritis Care Res* 2020;72(6):744-760. doi:10.1002/acr.24180
16. Foster C. Monitoring training in athletes with reference to overtraining syndrome. *Med Sci Sports Exerc* 1998;30(7):1164-1168. doi:10.1097/00005768-199807000-00023. PMID 9662690.
17. Foster C, Florhaug JA, Franklin J, Gottschall L, Hrovatin LA, Parker S, Doleshal P, Dodge C. A new approach to monitoring exercise training. *J Strength Cond Res* 2001;15(1):109-115. doi:10.1519/00124278-200102000-00019. PMID 11708692.
18. Schuster Brandt Frandsen J, Hulme A, Parner ET, et al. How much running is too much? Identifying high-risk running sessions in a 5200-person cohort study. *Br J Sports Med* 2025;59(17):1203-1210. doi:10.1136/bjsports-2024-109380. PMID 40623829. PMC12421110.
19. Gabbett TJ. The training-injury prevention paradox: should athletes be training smarter and harder? *Br J Sports Med* 2016;50(5):273-280. doi:10.1136/bjsports-2015-095788
20. Gardiner C, Weakley J, Burke LM, et al. The effect of caffeine on subsequent sleep: a systematic review and meta-analysis. *Sleep Med Rev* 2023;69:101764. doi:10.1016/j.smrv.2023.101764
21. Garthe I, Raastad T, Refsnes PE, Koivisto A, Sundgot-Borgen J. Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes. *Int J Sport Nutr Exerc Metab* 2011;21(2):97-104. doi:10.1123/ijsnem.21.2.97. PMID 21558571.
22. Grundy SM, Stone NJ, Bailey AL, et al. 2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA guideline on the management of blood cholesterol. *Circulation* 2019;139(25):e1082-e1143. doi:10.1161/CIR.0000000000000625
23. Guest NS, VanDusseldorp TA, Nelson MT, et al. International Society of Sports Nutrition position stand: caffeine and exercise performance. *J Int Soc Sports Nutr* 2021;18:1. doi:10.1186/s12970-020-00383-4
24. Haddad M, Stylianides G, Djaoui L, Dellal A, Chamari K. Session-RPE method for training load monitoring: validity, ecological usefulness, and influencing factors. *Front Neurosci* 2017;11:612. doi:10.3389/fnins.2017.00612
25. Heiderscheit BC, Chumanov ES, Michalski MP, Wille CM, Ryan MB. Effects of step rate manipulation on joint mechanics during running. *Med Sci Sports Exerc* 2011;43(2):296-302. doi:10.1249/MSS.0b013e3181ebedf4
26. Hellard P, Avalos M, Lacoste L, et al. Assessing the limitations of the Banister model in monitoring training. *J Sports Sci* 2006;24(5):509-520. doi:10.1080/02640410500244697
27. Impellizzeri FM, Tenan MS, Kempton T, Novak A, Coutts AJ. Acute:chronic workload ratio: conceptual issues and fundamental pitfalls. *Int J Sports Physiol Perform* 2020;15(6):907-913. doi:10.1123/ijspp.2019-0864
28. Jäger R, Kerksick CM, Campbell BI, et al. International Society of Sports Nutrition position stand: protein and exercise. *J Int Soc Sports Nutr* 2017;14:20. doi:10.1186/s12970-017-0177-8
29. Javaloyes A, Sarabia JM, Lamberts RP, Moya-Ramon M. Training prescription guided by heart-rate variability in cycling. *Int J Sports Physiol Perform* 2019;14(1):23-32. doi:10.1123/ijspp.2018-0122
30. Jeukendrup A. A step towards personalized sports nutrition: carbohydrate intake during exercise. *Sports Med* 2014;44(Suppl 1):S25-S33. doi:10.1007/s40279-014-0148-z
31. Jones DW, et al. 2025 AHA/ACC guideline for the prevention, detection, evaluation and management of high blood pressure in adults. *Circulation* 2025;152:e114-e218. doi:10.1161/CIR.0000000000001356
32. Kiviniemi AM, Hautala AJ, Kinnunen H, Tulppo MP. Endurance training guided individually by daily heart rate variability measurements. *Eur J Appl Physiol* 2007;101(6):743-751. doi:10.1007/s00421-007-0552-2. PMID 17849143.
33. Kodama S, Saito K, Tanaka S, et al. Cardiorespiratory fitness as a quantitative predictor of all-cause mortality and cardiovascular events in healthy men and women: a meta-analysis. *JAMA* 2009;301(19):2024-2035. doi:10.1001/jama.2009.681
34. Lastella M, Halson SL, Vitale JA, Memon AR, Vincent GE. To nap or not to nap? A systematic review evaluating napping behavior in athletes and the impact on various measures of athletic performance. *Nat Sci Sleep* 2021;13:841-862. doi:10.2147/NSS.S315556
35. Le Meur Y, Pichon A, Schaal K, et al. Evidence of parasympathetic hyperactivity in functionally overreached athletes. *Med Sci Sports Exerc* 2013;45(11):2061-2071. doi:10.1097/MSS.0b013e3182980125
36. Lolli L, Batterham AM, Hawkins R, et al. Mathematical coupling causes spurious correlation within the conventional acute-to-chronic workload ratio calculations. *Br J Sports Med* 2019;53(15):921-922. doi:10.1136/bjsports-2017-098110
37. Mah CD, Mah KE, Kezirian EJ, Dement WC. The effects of sleep extension on the athletic performance of collegiate basketball players. *Sleep* 2011;34(7):943-950. doi:10.5665/SLEEP.1132
38. Manresa-Rocamora A, Sarabia JM, Javaloyes A, Flatt AA, Moya-Ramón M. Heart rate variability-guided training for enhancing cardiac-vagal modulation, aerobic fitness, and endurance performance: a methodological systematic review with meta-analysis. *Int J Environ Res Public Health* 2021;18(19):10299. doi:10.3390/ijerph181910299
39. Maunder E, Seiler S, Mildenhall MJ, Kilding AE, Plews DJ. The importance of 'durability' in the physiological profiling of endurance athletes. *Sports Med* 2021;51(8):1619-1628. doi:10.1007/s40279-021-01459-0. PMID 33886100.
40. McEvoy JW, McCarthy CP, Bruno RM, et al. 2024 ESC guidelines for the management of elevated blood pressure and hypertension. *Eur Heart J* 2024;45(38):3912-4018. doi:10.1093/eurheartj/ehae178
41. Meeusen R, Duclos M, Foster C, et al. Prevention, diagnosis, and treatment of the overtraining syndrome: joint consensus statement of the European College of Sport Science and the American College of Sports Medicine. *Med Sci Sports Exerc* 2013;45(1):186-205. doi:10.1249/MSS.0b013e318279a10a
42. Miller DJ, Capodilupo JV, Lastella M, et al. Analyzing changes in respiratory rate to predict the risk of COVID-19 infection. *PLoS One* 2020;15(12):e0243693. doi:10.1371/journal.pone.0243693
43. Mishra T, Wang M, Metwally AA, et al. Pre-symptomatic detection of COVID-19 from smartwatch data. *Nat Biomed Eng* 2020;4:1208-1220. doi:10.1038/s41551-020-00640-6
44. Molina-Garcia P, Notbohm HL, Schumann M, et al. Validity of estimating the maximal oxygen consumption by consumer wearables: a systematic review with meta-analysis and expert statement of the INTERLIVE network. *Sports Med* 2022;52:1577-1597. doi:10.1007/s40279-021-01639-y
45. Morton RW, Murphy KT, McKellar SR, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. *Br J Sports Med* 2018;52(6):376-384. doi:10.1136/bjsports-2017-097608
46. Mountjoy M, Ackerman KE, Bailey DM, et al. 2023 International Olympic Committee's (IOC) consensus statement on Relative Energy Deficiency in Sport (REDs). *Br J Sports Med* 2023;57(17):1073-1097. doi:10.1136/bjsports-2023-106994
47. Mujika I, Padilla S. Detraining: loss of training-induced physiological and performance adaptations. Part I: short term insufficient training stimulus. *Sports Med* 2000;30(2):79-87. doi:10.2165/00007256-200030020-00002
48. Natarajan A, Su HW, Heneghan C. Assessment of physiological signs associated with COVID-19 measured using wearable devices. *NPJ Digit Med* 2020;3:156. doi:10.1038/s41746-020-00363-7
49. National Cholesterol Education Program Expert Panel. Third report of the NCEP Expert Panel on Detection, Evaluation, and Treatment of High Blood Cholesterol in Adults (Adult Treatment Panel III) final report. *Circulation* 2002;106(25):3143-3421. doi:10.1161/circ.106.25.3143. PMID 12485966.
50. Nielsen RO, Parner ET, Nohr EA, et al. Excessive progression in weekly running distance and risk of running-related injuries: an association which varies according to type of injury. *J Orthop Sports Phys Ther* 2014;44(10):739-747. doi:10.2519/jospt.2014.5164. PMID 25155475.
51. Nuuttila OP, Nummela A, Korhonen E, Häkkinen K, Kyröläinen H. Individualized endurance training based on recovery and training status in recreational runners. *Med Sci Sports Exerc* 2022;54(10):1690-1701. doi:10.1249/MSS.0000000000002968
52. Oliveira PS, Boppre G, Fonseca H. Comparison of polarized versus other types of endurance training intensity distribution on athletes' endurance performance: a systematic review with meta-analysis. *Sports Med* 2024;54(8):2071-2095. doi:10.1007/s40279-024-02034-z
53. Périard JD, Eijsvogels TMH, Daanen HAM. Exercise under heat stress: thermoregulation, hydration, performance implications, and mitigation strategies. *Physiol Rev* 2021;101(4):1873-1979. doi:10.1152/physrev.00038.2020
54. Plews DJ, Laursen PB, Kilding AE, Buchheit M. Heart rate variability in elite triathletes, is variation in variability the key to effective training? A case comparison. *Eur J Appl Physiol* 2012;112(11):3729-3741. PMID 22367011.
55. Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M. Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring. *Sports Med* 2013;43(9):773-781. doi:10.1007/s40279-013-0071-8
56. Plews DJ, Laursen PB, Le Meur Y, Hausswirth C, Kilding AE, Buchheit M. Monitoring training with heart-rate variability: how much compliance is needed for valid assessment? *Int J Sports Physiol Perform* 2014;9(5):783-790. doi:10.1123/ijspp.2013-0455. PMID 24334285.
57. Poole DC, Burnley M, Vanhatalo A, Rossiter HB, Jones AM. Critical power: an important fatigue threshold in exercise physiology. *Med Sci Sports Exerc* 2016;48(11):2320-2334. doi:10.1249/MSS.0000000000000939
58. Racinais S, Alonso JM, Coutts AJ, et al. Consensus recommendations on training and competing in the heat. *Br J Sports Med* 2015;49(18):1164-1173. doi:10.1136/bjsports-2015-094915
59. Radin JM, Wineinger NE, Topol EJ, Steinhubl SR. Harnessing wearable device data to improve state-level real-time surveillance of influenza-like illness in the USA: a population-based study. *Lancet Digit Health* 2020;2(2):e85-e93. doi:10.1016/S2589-7500(19)30222-5
60. Riegel PS. Athletic records and human endurance. *Am Sci* 1981;69(3):285-290. JSTOR 27850427.
61. Rosenblat MA, Perrotta AS, Vicenzino B. Polarized vs. threshold training intensity distribution on endurance sport performance: a systematic review and meta-analysis of randomized controlled trials. *J Strength Cond Res* 2019;33(12):3491-3500. doi:10.1519/JSC.0000000000002618
62. Rosenblat MA, Watt JA, Arnold JI, et al. Which training intensity distribution intervention will produce the greatest improvements in maximal oxygen uptake and time-trial performance in endurance athletes? A systematic review and network meta-analysis of individual participant data. *Sports Med* 2025;55(3):655-673. doi:10.1007/s40279-024-02149-3. PMID 39888556.
63. Ruuskanen O, Luoto R, Valtonen M, Heinonen OJ, Waris M. Respiratory viral infections in athletes: many unanswered questions. *Sports Med* 2022;52(9):2013-2021. doi:10.1007/s40279-022-01660-9
64. Ruuskanen O, Valtonen M, Waris M, Luoto R, Heinonen OJ. Sport and exercise during viral acute respiratory illness: time to revisit. *J Sport Health Sci* 2024;13(5):663-665. doi:10.1016/j.jshs.2023.12.002
65. Saw AE, Main LC, Gastin PB. Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review. *Br J Sports Med* 2016;50(5):281-291. doi:10.1136/bjsports-2015-094758
66. Sawka MN, Burke LM, Eichner ER, Maughan RJ, Montain SJ, Stachenfeld NS. American College of Sports Medicine position stand. Exercise and fluid replacement. *Med Sci Sports Exerc* 2007;39(2):377-390. doi:10.1249/mss.0b013e31802ca597
67. Schwellnus M, Soligard T, Alonso JM, et al. How much is too much? (Part 2) International Olympic Committee consensus statement on load in sport and risk of illness. *Br J Sports Med* 2016;50(17):1043-1052. doi:10.1136/bjsports-2016-096572
68. Schwellnus M, Adami PE, Bougault V, et al. International Olympic Committee (IOC) consensus statement on acute respiratory illness in athletes part 1: acute respiratory infections. *Br J Sports Med* 2022;56:1066-1088. doi:10.1136/bjsports-2022-105759. PMID 35863871. Return-to-sport steps read in the accepted author version (University of Pretoria repository).
69. Schwellnus M, Adami PE, Bougault V, et al. International Olympic Committee (IOC) consensus statement on acute respiratory illness in athletes part 2: non-infective acute respiratory illness. *Br J Sports Med* 2022;56:1089-1103. doi:10.1136/bjsports-2022-105567
70. Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? *Int J Sports Physiol Perform* 2010;5(3):276-291. doi:10.1123/ijspp.5.3.276
71. Seiler S, Haugen O, Kuffel E. Autonomic recovery after exercise in trained athletes: intensity and duration effects. *Med Sci Sports Exerc* 2007;39(8):1366-1373. doi:10.1249/mss.0b013e318060f17d. PMID 17762370.
72. Silbernagel KG, Thomeé R, Eriksson BI, Karlsson J. Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy: a randomized controlled study. *Am J Sports Med* 2007;35(6):897-906. doi:10.1177/0363546506298279
73. Snyders C, Pyne DB, Sewry N, Hull JH, Kaulback K, Schwellnus M. Acute respiratory illness and return to sport: a systematic review and meta-analysis by a subgroup of the IOC consensus on 'acute respiratory illness in the athlete'. *Br J Sports Med* 2022;56(4):223-231. doi:10.1136/bjsports-2021-104719. PMID 34789459.
74. Soligard T, Schwellnus M, Alonso JM, et al. How much is too much? (Part 1) International Olympic Committee consensus statement on load in sport and risk of injury. *Br J Sports Med* 2016;50(17):1030-1041. doi:10.1136/bjsports-2016-096581
75. Stanley J, Peake JM, Buchheit M. Cardiac parasympathetic reactivation following exercise: implications for training prescription. *Sports Med* 2013;43(12):1259-1277. doi:10.1007/s40279-013-0083-4
76. Stöggl T, Sperlich B. Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training. *Front Physiol* 2014;5:33. doi:10.3389/fphys.2014.00033
77. Sylta Ø, Tønnessen E, Seiler S. From heart-rate data to training quantification: a comparison of 3 methods of training-intensity analysis. *Int J Sports Physiol Perform* 2014;9(1):100-107. doi:10.1123/IJSPP.2013-0298
78. Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. *J Am Coll Cardiol* 2001;37(1):153-156. doi:10.1016/s0735-1097(00)01054-8
79. Thomas DT, Erdman KA, Burke LM. American College of Sports Medicine joint position statement. Nutrition and athletic performance. *Med Sci Sports Exerc* 2016;48(3):543-568. doi:10.1249/MSS.0000000000000852
80. Vesterinen V, Nummela A, Heikura I, et al. Individual endurance training prescription with heart rate variability. *Med Sci Sports Exerc* 2016;48(7):1347-1354. doi:10.1249/MSS.0000000000000910
81. Vickers AJ, Vertosick EA. An empirical study of race times in recreational endurance runners. *BMC Sports Sci Med Rehabil* 2016;8:26. doi:10.1186/s13102-016-0052-y
82. Walsh NP, Halson SL, Sargent C, et al. Sleep and the athlete: narrative review and 2021 expert consensus recommendations. *Br J Sports Med* 2021;55(7):356-368. doi:10.1136/bjsports-2020-102025
83. Watson NF, Badr MS, Belenky G, et al. Recommended amount of sleep for a healthy adult: a joint consensus statement of the American Academy of Sleep Medicine and Sleep Research Society. *J Clin Sleep Med* 2015;11(6):591-592. doi:10.5664/jcsm.4758
84. Whelton PK, Carey RM, Aronow WS, et al. 2017 ACC/AHA/AAPA/ABC/ACPM/AGS/APhA/ASH/ASPC/NMA/PCNA guideline for the prevention, detection, evaluation, and management of high blood pressure in adults. *Hypertension* 2018;71(6):e13-e115. doi:10.1161/HYP.0000000000000065
85. Windred DP, Burns AC, Lane JM, et al. Sleep regularity is a stronger predictor of mortality risk than sleep duration: a prospective cohort study. *Sleep* 2024;47(1):zsad253. doi:10.1093/sleep/zsad253
86. Burgess HJ, Kleiman J, Trinder J. Cardiac activity during sleep onset. *Psychophysiology* 1999;36(3):298-306. doi:10.1017/s0048577299980198
87. Carrington M, Walsh M, Stambas T, Kleiman J, Trinder J. The influence of sleep onset on the diurnal variation in cardiac activity and cardiac control. *J Sleep Res* 2003;12(3):213-221. doi:10.1046/j.1365-2869.2003.00364.x
88. Chen PC, Sattari N, Whitehurst LN, Mednick SC. Age-related losses in cardiac autonomic activity during a daytime nap. *Psychophysiology* 2021;58(7):e13701. doi:10.1111/psyp.13701
89. Marino M, Li Y, Rueschman MN, et al. Measuring sleep: accuracy, sensitivity, and specificity of wrist actigraphy compared to polysomnography. *Sleep* 2013;36(11):1747-1755. doi:10.5665/sleep.3142
90. Sargent C, Lastella M, Romyn G, Versey N, Miller DJ, Roach GD. How well does a commercially available wearable device measure sleep in young athletes? *Chronobiol Int* 2018;35(6):754-758. doi:10.1080/07420528.2018.1466800
91. Souabni M, Souabni MJ, Hidouri S, et al. Napping and heart rate variability in elite athletes. *Biol Sport* 2024;41(3):213-221. doi:10.5114/biolsport.2024.132983. PMID 38952899.
92. Walch O, Huang Y, Forger D, Goldstein C. Sleep stage prediction with raw acceleration and photoplethysmography heart rate data derived from a consumer wearable device. *Sleep* 2019;42(12):zsz180. doi:10.1093/sleep/zsz180
93. Van Dongen HPA, Maislin G, Mullington JM, Dinges DF. The cumulative cost of additional wakefulness: dose-response effects on neurobehavioral functions and sleep physiology from chronic sleep restriction and total sleep deprivation. *Sleep* 2003;26(2):117-126. doi:10.1093/sleep/26.2.117. PMID 12683469.
94. Banks S, Van Dongen HPA, Maislin G, Dinges DF. Neurobehavioral dynamics following chronic sleep restriction: dose-response effects of one night for recovery. *Sleep* 2010;33(8):1013-1026. doi:10.1093/sleep/33.8.1013
95. Kitamura S, Katayose Y, Nakazaki K, et al. Estimating individual optimal sleep duration and potential sleep debt. *Sci Rep* 2016;6:35812. doi:10.1038/srep35812
96. Klerman EB, Dijk DJ. Interindividual variation in sleep duration and its association with sleep debt in young adults. *Sleep* 2005;28(10):1253-1259. doi:10.1093/sleep/28.10.1253
97. Yamazaki EM, Antler CA, Lasek CR, Goel N. Residual, differential neurobehavioral deficits linger after multiple recovery nights following chronic sleep restriction or acute total sleep deprivation. *Sleep* 2021;44(4):zsaa224. doi:10.1093/sleep/zsaa224
98. Rupp TL, Wesensten NJ, Bliese PD, Balkin TJ. Banking sleep: realization of benefits during subsequent sleep restriction and recovery. *Sleep* 2009;32(3):311-321. doi:10.1093/sleep/32.3.311. PMID 19294951.
99. Faraut B, Nakib S, Drogou C, et al. Napping reverses the salivary interleukin-6 and urinary norepinephrine changes induced by sleep restriction. *J Clin Endocrinol Metab* 2015;100(3):E416-E426. doi:10.1210/jc.2014-2566
100. McCauley P, Kalachev LV, Mollicone DJ, Banks S, Dinges DF, Van Dongen HPA. Dynamic circadian modulation in a biomathematical model for the effects of sleep and sleep loss on waking neurobehavioral performance. *Sleep* 2013;36(12):1987-1997. doi:10.5665/sleep.3246
101. Oura Health. Sleep debt. Help article, read 15 Oct 2026. Product documentation, not peer reviewed; no DOI.
