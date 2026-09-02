**1 Crore Planner**

This should become the app’s main product, not a side widget. The structure should be:

1. `Goal Setup`
Ask the user once:
- total goal: default `1,00,00,000`
- target date: optional
- daily commitment: optional
- counting style: `tap`, `tasbeeh batches`, or `manual entry`

Logic:
- if user gives target date, app calculates required daily count
- if user gives daily count, app calculates estimated finish date

2. `Home Dashboard`
This replaces the current simple counter-first screen with a goal-first screen.

Top section:
- lifetime total completed
- remaining count
- percent complete
- estimated completion date

Middle section:
- today’s target
- today’s completed
- today’s remaining
- streak

Bottom section:
- quick actions: `+10`, `+33`, `+100`, `+313`, `+1000`
- `Start session`
- `Manual add`
- `Adjust target`

3. `Session Flow`
A session should feel focused and minimal.

Inside session:
- large tap area
- vibration/audio optional
- live session count
- quick batch buttons
- pause/end session

After session:
- save session total
- update daily total
- update lifetime total
- show small summary

4. `Progress Screen`
This is where long-term motivation comes from.

Show:
- daily chart
- weekly total
- monthly total
- best day
- current streak
- longest streak
- average per day
- “at current pace, finish by `date`”

5. `Planning Screen`
This is the differentiator.

Tools:
- “If I do `X` per day, when will I finish?”
- “If I want to finish by `date`, how much per day?”
- milestone planner:
  - `1 lakh`
  - `10 lakh`
  - `25 lakh`
  - `50 lakh`
  - `1 crore`

6. `Reminder System`
Keep it simple:
- fixed reminder times
- “you still have `N` left today”
- missed-day gentle recovery reminder next morning

7. `History and Corrections`
You need trustable data.

Allow:
- session history
- edit mistaken entries
- add offline recitation manually
- optional notes like `after fajr`, `after isha`

**Data model**

You’ll need more than the current `count` and `target`.

Core local entities:
- `goal`
  - totalGoal
  - startDate
  - targetDate
  - dailyTarget
  - currentTotal
- `dailyProgress`
  - date
  - completed
  - target
- `session`
  - id
  - dateTime
  - count
  - duration
  - source: tap/manual/batch
- `settings`
  - reminders
  - vibration
  - preferred batch sizes

**Best MVP**

Build this first:

1. Goal setup
2. Dashboard
3. Session counter
4. Daily/lifetime totals
5. Estimated finish date
6. Streaks
7. Local storage only

Do not build group features yet. Do not build cloud sync yet. First prove the daily habit loop.

**Recommended UI change**

Your current [app/home.tsx](c:/Users/MD%20SAHIL%20HASNAIN/desktop/projects/durood-app/app/home.tsx) should become:
- top: `1 Crore Journey` summary
- center: large session counter
- bottom: daily target and quick-add chips

Then add:
- new `app/progress.tsx`
- new `app/planner.tsx`

**Practical product rule**

Every screen should answer one of these:
- `What is my total progress?`
- `What do I need to do today?`
- `How fast am I moving?`
- `What should I do right now?`

If you want, I’ll next map this into actual screens, storage schema, and component-level implementation for your Expo app.