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
| `src/components/lineup/timeline.js` | Step timings shared by the page animation and the video export. |
| `src/components/lineup/export/layouts.js` | The four social sizes and where each piece sits on them. |
| `src/components/lineup/export/drawFrame.js` | Canvas copy of the reveal, drawn as a function of time. |
| `src/components/lineup/export/exportVideo.js` | Turns frames into an MP4 (or WebM fallback) and a PNG. |
| `src/components/lineup/export/ExportPanel.js` | The "Export for social" panel with previews and download links. |

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

## Export for social

Under the animation, **Export all sizes** renders the current lineup at four sizes,
one after another, and offers each as a video and a PNG of the finished teamsheet:

| Size | Pixels | Best for |
| --- | --- | --- |
| Landscape 16:9 | 1920 × 1080 | Facebook and X posts, YouTube |
| Square 1:1 | 1080 × 1080 | Instagram and Facebook feed |
| Portrait 4:5 | 1080 × 1350 | Instagram feed (the biggest feed post) |
| Story 9:16 | 1080 × 1920 | Stories, Reels, TikTok. Keeps clear of the app's own buttons at the top and bottom |

Everything happens in the browser, so nothing is uploaded and no server is needed.

- The page animation is HTML and CSS, which a browser can't record directly, so
  `drawFrame.js` redraws the same graphic on a `<canvas>`. Each frame is drawn
  from a time value, using the same timings (`timeline.js`), colours and
  easing curves as the CSS.
- **Chrome, Edge and Safari** encode each frame with WebCodecs as H.264, and
  [`mp4-muxer`](https://github.com/Vanilagy/mp4-muxer) packs the frames into an
  MP4 file. This runs faster than real time and doesn't drop frames. The
  library is only loaded when you export.
- **Other browsers** fall back to recording the canvas in real time with
  `MediaRecorder`. If that can only make WebM, the panel says so, because
  Instagram wants MP4.
- Player photos are drawn when their server allows cross-origin requests.
  Otherwise the shirt number is shown, because an image without that
  permission would block the export.

To change a layout, edit its boxes in `layouts.js`. All sizes are in pixels on
that layout's canvas.

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
home page's next-match card. `<ExportPanel lineup={…} fixture={…} />` would move
into Admin, next to the lineup picker.
