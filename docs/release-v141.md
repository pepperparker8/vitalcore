# VitalCore v141: History for every Health indicator

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 141.

## New
- Every row in Health > Your baselines opens in place, the way blood markers do. Tap a row to see:
  - the latest reading with its change, and the reading before it;
  - a chart that opens on the last 90 days, with no buttons. Drag it to go back, pinch to see all your history, and tap a point to read it;
  - one line on what the trend means;
  - "What moves it".
- Only one row is open at a time, blood markers included. Tap the row again to close it.
- Weight, BMI, Body fat, Fat-free mass, Skeletal muscle, Body water and Resting energy:
  - each weigh-in is a dot and the 7-day average is the line;
  - the line says how much the average moved over the dates in view;
  - the body composition rows add "An estimate, best read as a trend.";
  - Weight draws your goal as a line. A loss faster than 0.7% a week for two weeks adds "A slower loss keeps more muscle and strength."
- BMI shades the general adult range, 18.5 to 24.9. It is never labelled with a word such as "overweight".
- Resting heart rate shades your usual range, and its line reads the same way as on Trends.
- Blood pressure:
  - systolic and diastolic are each drawn as dots coloured by reading, with lines at 120, 130 and 140, and at 80 and 90;
  - the chart's line gives the band of the 28-day average once there are enough readings;
  - two very high readings still say to seek medical advice promptly.
- VO2max is a new row: your watch's estimate. It shows a change only when two readings are 4 weeks or more apart, and it shows no lab norms.
- With a single reading, a row shows that reading and says the chart appears after your second.

## Tests
1097, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
