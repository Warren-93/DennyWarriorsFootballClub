# Lineup reveal (prototype)

A Sky / Match of the Day style animated teamsheet. Nothing in the API stores
lineups yet, so this is a front-end prototype only: it auto-picks an XI from
the squad so the animation can be previewed.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000/lineup-demo (the page isn't linked from the
navbar).

- If the API is running on `localhost:8080` (or `VITE_API_URL` is set), the demo
  uses the live squad from `/api/v1/squad` and the next fixture from
  `/api/v1/fixtures/next`.
- If not, it falls back to the sample squad in
  `src/components/lineup/sampleData.js`. The note under the graphic says which
  one it used.

## What's where

| File | Purpose |
| --- | --- |
| `src/components/lineup/LineupReveal.js` | The animated graphic. Takes a resolved lineup and a fixture. |
| `src/components/lineup/LineupReveal.module.css` | All of the motion and broadcast styling. |
| `src/components/lineup/formations.js` | Slot coordinates for 4-4-2, 4-3-3, 4-2-3-1 and 3-5-2. |
| `src/components/lineup/lineupModel.js` | `resolveLineup()` for a saved lineup, `autoPickLineup()` for the demo. |
| `src/components/lineup/LineupPlayground.js` | Demo controls: formation, speed, replay, skip. |
| `src/pages/LineupDemo.js` | The `/lineup-demo` page. |

## How the animation works

`LineupReveal` steps through a timeline with a single `step` counter and one
`setTimeout` per step (divided by the speed setting):

1. **Intro card** (1.8s): club badge, "Starting XI", opponent and competition.
2. **Pitch** (0.9s): the pitch tilts into 3D (`rotateX`) and its markings draw
   in using `stroke-dashoffset`. The markings are to scale in metres (68 × 105).
3. **Players** (0.65s each): keeper first, then each line left to right. Each
   player drops onto their slot, the spotlight panel shows their number, name,
   position, apps and goals, and their row slides into the teamsheet.
4. **Subs**: the spotlight panel is replaced by the bench.

Player tokens sit on the tilted pitch and are counter-rotated so they stand
upright. The stage uses container query units (`cqw`), so it scales like a
video frame and stacks the pitch over the teamsheet below 640px wide. With
"reduce motion" turned on, it skips straight to the finished teamsheet.

## What a real version would need

**API.** A lineup saved against a fixture, referencing players by id:

```json
{
  "fixtureId": "6710f…",
  "formation": "4-3-3",
  "starters": [{ "playerId": "66f2…", "slot": "GK" }],
  "substitutes": ["66f9…"],
  "publishedAt": "2026-10-24T13:45:00Z"
}
```

- `GET /api/v1/fixtures/{id}/lineup` should return it only when `publishedAt`
  is set, so a draft can't leak early.
- `PUT /api/v1/admin/fixtures/{id}/lineup` saves it from Admin.
- Slot names should match the keys in `formations.js`.

**Admin.** A picker: choose the fixture and formation, then assign a player to
each slot and choose the subs.

**Site.** Pass the saved lineup through `resolveLineup(lineup, squad)` and
render `<LineupReveal lineup={…} fixture={…} />` on the fixture page and the
home page's next-match card.
