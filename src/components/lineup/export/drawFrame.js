import { FORMATIONS } from '../formations';
import { formatKickoff, splitName } from '../lineupModel';
import { timelineFor } from '../timeline';

// Canvas version of LineupReveal, drawn as a pure function of time so every
// frame can be rendered on demand (and so faster than real time) for video.
// Colours, timings and easings mirror LineupReveal.module.css.

export const HOLD_MS = 3000; // keep the finished teamsheet on screen

const C = {
  navy: '#07152c',
  navy2: '#0d2447',
  blue: '#2D5FA6',
  blueBright: '#4f86d6',
  blueDeep: '#1e4278',
  greenBright: '#2fb457',
  gold: '#f5c518',
  ink: '#ffffff',
  inkDim: 'rgba(255, 255, 255, 0.62)',
  line: 'rgba(255, 255, 255, 0.78)',
};
const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif';
const BODY = 'Barlow, system-ui, sans-serif';

export const FONT_FACES = [
  `800 100px ${DISPLAY}`,
  `700 100px ${DISPLAY}`,
  `600 100px ${DISPLAY}`,
  `400 30px ${BODY}`,
  `600 30px ${BODY}`,
];

// ---------- easing (CSS cubic-bezier) ----------

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1; const bx = 3 * (x2 - x1) - cx; const ax = 1 - cx - bx;
  const cy = 3 * y1; const by = 3 * (y2 - y1) - cy; const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0; let hi = 1; let t = x;
    for (let i = 0; i < 24; i += 1) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

const EASE = {
  std: bezier(0.25, 0.1, 0.25, 1),
  in: bezier(0.42, 0, 1, 1),
  out: bezier(0, 0, 0.58, 1),
  inOut: bezier(0.42, 0, 0.58, 1),
  snap: bezier(0.2, 0.8, 0.2, 1),
  drop: bezier(0.25, 1.4, 0.5, 1),
  pop: bezier(0.3, 1.6, 0.5, 1),
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const prog = (t, start, dur) => clamp01((t - start) / dur);
const lerp = (a, b, e) => a + (b - a) * e;

// ---------- text helpers ----------

function setFont(ctx, weight, size, family = DISPLAY, spacing = 0) {
  ctx.font = `${weight} ${size}px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * size}px`;
}

// Draws text and returns its width; shrinks the font to fit maxWidth.
function text(ctx, str, x, y, opts) {
  const { weight = 700, size, family = DISPLAY, color = C.ink, align = 'left', spacing = 0, maxWidth, upper = true } = opts;
  const value = upper ? String(str).toUpperCase() : String(str);
  let s = size;
  setFont(ctx, weight, s, family, spacing);
  if (maxWidth) {
    const w = ctx.measureText(value).width;
    if (w > maxWidth) {
      s = Math.max(8, s * (maxWidth / w));
      setFont(ctx, weight, s, family, spacing);
    }
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
  return ctx.measureText(value).width;
}

function measure(ctx, str, weight, size, family = DISPLAY, spacing = 0, upper = true) {
  setFont(ctx, weight, size, family, spacing);
  return ctx.measureText(upper ? String(str).toUpperCase() : String(str)).width;
}

function slantRect(ctx, x, y, w, h, slant) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

// ---------- pitch projection ----------

// Real pitch in metres (68 × 105) plus 2 m of grass around the lines.
// mx runs left → right, my from our goal line (0) to theirs (105).
const TILT = (38 * Math.PI) / 180;
const PITCH_LEN = 109;

function rawProject(mx, my, tilt) {
  const d = my + 2;
  const s = (1.6 * PITCH_LEN) / (1.6 * PITCH_LEN + d * Math.sin(tilt));
  const y = d * Math.cos(tilt);
  return { x: (mx - 34) * s, y: -PITCH_LEN + (PITCH_LEN - y) * s, s };
}

// Fits the finished (38°) pitch into a box and returns a projector.
function pitchProjector(box) {
  const far = rawProject(-2, 107, TILT);
  const bboxW = 72;
  const bboxH = -far.y;
  const fit = Math.min(box.w / bboxW, box.h / bboxH);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + (bboxH / 2) * fit;
  return {
    fit,
    project(mx, my, tilt = TILT, lift = 0) {
      const p = rawProject(mx, my, tilt);
      return { x: cx + p.x * fit, y: cy + p.y * fit + lift, s: p.s };
    },
  };
}

function arcPoints(cx, cy, r, from, to, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = from + ((to - from) * i) / steps;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
const deg = (d) => (d * Math.PI) / 180;

const PITCH_PATHS = [
  rect(0, 0, 68, 105),
  [[0, 52.5], [68, 52.5]],
  arcPoints(34, 52.5, 9.15, 0, Math.PI * 2, 72),
  rect(13.84, 0, 54.16, 16.5),
  rect(24.84, 0, 43.16, 5.5),
  rect(13.84, 88.5, 54.16, 105),
  rect(24.84, 99.5, 43.16, 105),
  arcPoints(34, 11, 9.15, deg(36.9), deg(143.1), 24),
  arcPoints(34, 94, 9.15, deg(216.9), deg(323.1), 24),
];

function drawPath(ctx, proj, pts, amount, tilt, lift) {
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  let left = total * amount;
  ctx.beginPath();
  const start = proj.project(pts[0][0], pts[0][1], tilt, lift);
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < pts.length && left > 0; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    const f = Math.min(1, left / seg);
    const p = proj.project(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, tilt, lift);
    ctx.lineTo(p.x, p.y);
    left -= seg;
  }
  ctx.stroke();
}

// ---------- scene pieces ----------

function drawBackground(ctx, W, H, t) {
  const a = deg(160);
  const dx = Math.sin(a); const dy = -Math.cos(a);
  const len = Math.abs(W * dx) + Math.abs(H * dy);
  const g = ctx.createLinearGradient(W / 2 - (dx * len) / 2, H / 2 - (dy * len) / 2, W / 2 + (dx * len) / 2, H / 2 + (dy * len) / 2);
  g.addColorStop(0, C.navy2);
  g.addColorStop(1, C.navy);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = (cx, cy, rx, ry, color, stop) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const r = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    r.addColorStop(0, color);
    r.addColorStop(stop, 'rgba(0,0,0,0)');
    ctx.fillStyle = r;
    ctx.fillRect(-cx / rx, -cy / ry, W / rx, H / ry);
    ctx.restore();
  };
  glow(W * 0.3, H * 1.1, W * 1.2, H * 0.9, 'rgba(30, 138, 60, 0.28)', 0.6);
  glow(W, 0, W * 0.9, H * 0.8, 'rgba(45, 95, 166, 0.45)', 0.65);

  // Light sweep: 6 s loop, crossing between 15% and 60% of each loop.
  const loop = (t % 6000) / 6000;
  const e = EASE.inOut(clamp01((loop - 0.15) / 0.45));
  const left = lerp(-0.4, 1.3, e) * W;
  const bw = 0.3 * W;
  ctx.save();
  ctx.transform(1, 0, Math.tan(deg(-18)), 1, Math.tan(deg(18)) * (H / 2), 0);
  const sg = ctx.createLinearGradient(left, 0, left + bw, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(left, -H * 0.2, bw, H * 1.4);
  ctx.restore();
}

function drawIntro(ctx, L, t, scene) {
  const W = L.width; const H = L.height;
  const band = (top, height, color, delay, outAt) => {
    const inE = EASE.snap(prog(t, delay, 550));
    const outE = EASE.in(prog(t, outAt, 400));
    const bw = W * 1.4;
    const shift = t < outAt ? lerp(-1.1, 0, inE) : lerp(0, 1.1, outE);
    ctx.save();
    ctx.translate(W / 2, H * top + (H * height) / 2);
    ctx.transform(1, Math.tan(deg(-8)), 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(-bw / 2 + shift * bw, (-H * height) / 2, bw, H * height);
    ctx.restore();
  };
  const blue = ctx.createLinearGradient(0, 0, W, 0);
  blue.addColorStop(0, C.blue);
  blue.addColorStop(1, C.blueBright);
  band(0.3, 0.34, blue, 0, 1450);
  band(0.62, 0.07, C.greenBright, 120, 1500);

  const I = L.intro;
  const fadeIn = EASE.out(prog(t, 300, 450));
  const fadeOut = EASE.in(prog(t, 1400, 300));
  const alpha = fadeIn * (1 - fadeOut);
  if (alpha <= 0) return;

  const badgeW = W * I.badge;
  const badgeH = scene.images.badge
    ? badgeW * (scene.images.badge.height / scene.images.badge.width)
    : badgeW;
  const kicker = W * I.kicker; const title = W * I.title; const meta = W * I.meta;
  const metaText = `v ${scene.opponent}${scene.fixture?.competition ? ` · ${scene.fixture.competition}` : ''}`;
  const titleW = measure(ctx, 'Starting XI', 800, title, DISPLAY, 0.01);
  const textH = kicker * 1.3 + title * 0.92 + meta * 1.3;
  const gap = W * 0.03;

  ctx.save();
  ctx.globalAlpha = alpha;
  const scale = 1 + 0.06 * fadeOut;
  const rise = (1 - fadeIn) * W * 0.02;
  ctx.translate(W / 2, H / 2 + rise);
  ctx.scale(scale, scale);

  let badgeX; let badgeY; let textX; let textTop; let align;
  if (I.stacked) {
    const total = badgeH + gap + textH;
    badgeX = -badgeW / 2; badgeY = -total / 2;
    textX = 0; textTop = badgeY + badgeH + gap; align = 'center';
  } else {
    const total = badgeW + gap + titleW;
    badgeX = -total / 2; badgeY = -badgeH / 2;
    textX = badgeX + badgeW + gap; textTop = -textH / 2; align = 'left';
  }

  if (scene.images.badge) {
    const pe = EASE.pop(prog(t, 300, 600));
    ctx.save();
    ctx.globalAlpha = alpha * clamp01(pe);
    ctx.translate(badgeX + badgeW / 2, badgeY + badgeH / 2);
    ctx.rotate(deg(-12) * (1 - pe));
    ctx.scale(lerp(0.3, 1, pe), lerp(0.3, 1, pe));
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = W * 0.02;
    ctx.shadowOffsetY = W * 0.01;
    ctx.drawImage(scene.images.badge, -badgeW / 2, -badgeH / 2, badgeW, badgeH);
    ctx.restore();
  }

  let y = textTop + kicker;
  text(ctx, 'Team news', textX, y, { weight: 700, size: kicker, color: C.inkDim, align, spacing: 0.4 });
  y += title * 0.92 + kicker * 0.3;
  text(ctx, 'Starting XI', textX, y, { weight: 800, size: title, align, spacing: 0.01 });
  y += meta * 1.3;
  text(ctx, metaText, textX, y, { weight: 600, size: meta, align, spacing: 0.08, maxWidth: W * 0.9 });
  ctx.restore();
}

function drawTopBar(ctx, L, t, scene, pitchStart) {
  const b = L.topBar;
  const local = t - pitchStart;
  if (local < 0) return;
  const alpha = EASE.std(prog(local, 0, 400));
  const drop = (1 - EASE.snap(prog(local, 0, 500))) * -1.2 * b.h;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, drop);
  const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const border = Math.max(6, b.h * 0.1);
  ctx.fillStyle = C.greenBright;
  ctx.fillRect(b.x, b.y, border, b.h);

  const pad = b.h * 0.16;
  let x = b.x + border + pad;
  const badge = scene.images.badge;
  if (badge) {
    const bh = b.h * (b.lines === 1 ? 0.8 : 0.62);
    const bw = bh * (badge.width / badge.height);
    ctx.drawImage(badge, x, b.y + (b.h - bh) / 2, bw, bh);
    x += bw + pad;
  }

  // Formation chip on the right
  const chipFont = b.h * (b.lines === 1 ? 0.39 : 0.3);
  const chipW = measure(ctx, scene.formation, 800, chipFont, DISPLAY, 0.06) + chipFont * 1.3;
  const chipH = chipFont * 1.35;
  const chipX = b.x + b.w - pad - chipW;
  const chipY = b.y + (b.h - chipH) / 2;
  ctx.fillStyle = C.blue;
  ctx.beginPath();
  ctx.moveTo(chipX + chipW * 0.08, chipY);
  ctx.lineTo(chipX + chipW, chipY);
  ctx.lineTo(chipX + chipW * 0.92, chipY + chipH);
  ctx.lineTo(chipX, chipY + chipH);
  ctx.closePath();
  ctx.fill();
  text(ctx, scene.formation, chipX + chipW / 2, chipY + chipH * 0.78, { weight: 800, size: chipFont, align: 'center', spacing: 0.06 });

  const left = scene.homeFirst ? scene.clubName : scene.opponent;
  const right = scene.homeFirst ? scene.opponent : scene.clubName;
  const metaText = [scene.fixture?.competition, formatKickoff(scene.fixture)].filter(Boolean).join(' · ');
  const avail = chipX - pad - x;
  const team = b.h * (b.lines === 1 ? 0.45 : 0.34);
  const matchup = (yBase, size) => {
    const vsSize = size * 0.7;
    const wl = measure(ctx, left, 700, size, DISPLAY, 0.03);
    const wv = measure(ctx, 'v', 700, vsSize);
    const wr = measure(ctx, right, 700, size, DISPLAY, 0.03);
    const space = size * 0.35;
    const fit = Math.min(1, (b.lines === 1 ? avail * 0.6 : avail) / (wl + wv + wr + space * 2));
    const s = size * fit;
    let cx = x;
    cx += text(ctx, left, cx, yBase, { weight: 700, size: s, color: scene.homeFirst ? C.ink : C.inkDim, spacing: 0.03 }) + space * fit;
    cx += text(ctx, 'v', cx, yBase, { weight: 700, size: s * 0.7, color: C.greenBright, upper: false }) + space * fit;
    cx += text(ctx, right, cx, yBase, { weight: 700, size: s, color: scene.homeFirst ? C.inkDim : C.ink, spacing: 0.03 });
    return cx;
  };

  if (b.lines === 1) {
    const end = matchup(b.y + b.h / 2 + team * 0.36, team);
    const metaSize = b.h * 0.25;
    text(ctx, metaText, end + pad * 1.4, b.y + b.h / 2 + metaSize * 0.36, {
      weight: 400, size: metaSize, family: BODY, color: C.inkDim, spacing: 0.12, maxWidth: Math.max(10, chipX - pad - end - pad * 1.4),
    });
  } else {
    matchup(b.y + b.h * 0.47, team);
    const metaSize = b.h * 0.19;
    text(ctx, metaText, x, b.y + b.h * 0.8, { weight: 400, size: metaSize, family: BODY, color: C.inkDim, spacing: 0.12, maxWidth: avail });
  }
  ctx.restore();
}

function drawPitch(ctx, L, t, scene, tl) {
  const local = t - tl.pitchStart;
  if (local < 0) return null;
  const proj = pitchProjector(L.pitch);
  const e = EASE.snap(prog(local, 0, 900));
  const tilt = lerp(deg(75), TILT, e);
  const lift = (1 - e) * 0.1 * PITCH_LEN * proj.fit;
  const alpha = EASE.std(prog(local, 0, 500));

  ctx.save();
  ctx.globalAlpha = alpha;
  const corner = (mx, my) => proj.project(mx, my, tilt, lift);
  const quad = (y0, y1) => {
    const a = corner(-2, y0); const b = corner(70, y0); const c = corner(70, y1); const d = corner(-2, y1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
  };

  const near = corner(0, -2); const far = corner(0, 107);
  const grass = ctx.createLinearGradient(0, far.y, 0, near.y);
  grass.addColorStop(0, '#1b6e34');
  grass.addColorStop(0.6, '#22843f');
  grass.addColorStop(1, '#1f7a3a');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 5 * proj.fit;
  ctx.shadowOffsetY = 3 * proj.fit;
  quad(-2, 107);
  ctx.fillStyle = grass;
  ctx.fill();
  ctx.restore();

  // Mowing stripes, light band first from the far end like the CSS
  const stripe = PITCH_LEN * 0.091;
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let k = 0; k * stripe < PITCH_LEN; k += 2) {
    const top = 107 - k * stripe;
    quad(Math.max(-2, top - stripe), top);
    ctx.fill();
  }

  const lineAmount = EASE.out(prog(local, 250, 1100));
  if (lineAmount > 0) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = Math.max(1.5, 0.42 * proj.fit);
    ctx.lineJoin = 'round';
    PITCH_PATHS.forEach((pts) => drawPath(ctx, proj, pts, lineAmount, tilt, lift));
  }
  ctx.restore();
  return proj;
}

function drawDisc(ctx, cx, cy, r, player, img, highlight) {
  ctx.save();
  if (highlight) {
    ctx.shadowColor = 'rgba(47, 180, 87, 0.8)';
    ctx.shadowBlur = r * 1.2;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = r * 0.5;
    ctx.shadowOffsetY = r * 0.25;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(cx - r * 0.4, cy - r, cx + r * 0.4, cy + r);
  g.addColorStop(0, C.blueBright);
  g.addColorStop(0.6, C.blue);
  g.addColorStop(1, C.blueDeep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const side = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else {
    text(ctx, player.number ?? '', cx, cy + r * 0.33, { weight: 800, size: r * 0.95, align: 'center' });
  }

  if (highlight) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + r * 0.17, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(47, 180, 87, 0.55)';
    ctx.lineWidth = r * 0.17;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = r * 0.13;
  ctx.stroke();

  if (player.captain) {
    const ar = r * 0.41;
    const ax = cx + r * 0.78; const ay = cy - r * 0.7;
    ctx.beginPath();
    ctx.arc(ax, ay, ar, 0, Math.PI * 2);
    ctx.fillStyle = C.gold;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.07;
    ctx.stroke();
    text(ctx, 'C', ax, ay + ar * 0.42, { weight: 800, size: ar * 1.2, color: C.navy, align: 'center' });
  }
}

function drawTokens(ctx, L, t, scene, tl, proj, current) {
  if (!proj) return;
  const nearWidth = 68 * proj.fit;
  const baseR = ((nearWidth * 0.115) / 2) * (L.tokenScale || 1);
  const order = scene.starters
    .map((s, i) => ({ ...s, i }))
    .filter(({ i }) => t >= tl.playerStart(i))
    .sort((a, b) => b.pos.y - a.pos.y); // far players first so near ones overlap them

  order.forEach(({ player, pos, i }) => {
    const local = t - tl.playerStart(i);
    const p = proj.project(pos.x * 0.68, pos.y * 1.05);
    const depth = Math.sqrt(p.s);
    const r = baseR * depth;
    const nameSize = r * 0.62;
    const { last } = splitName(player.name);
    const nameW = measure(ctx, last, 700, nameSize, DISPLAY, 0.05) + nameSize * 1;
    const nameH = nameSize * 1.25;
    const gap = r * 0.18;
    const groupH = r * 2 + gap + nameH;

    const pd = prog(local, 0, 500);
    const e = EASE.drop(pd);
    const scale = lerp(2.2, 1, e);
    const ty = -2.6 * groupH * (1 - e);
    const alpha = clamp01(EASE.drop(clamp01(pd / 0.6)));
    const isCurrent = i === current;

    ctx.save();
    ctx.globalAlpha = alpha;
    const centreY = p.y - groupH / 2 + ty;
    ctx.translate(p.x, centreY);
    ctx.scale(scale, scale);
    ctx.translate(-p.x, -centreY);

    const discY = p.y - groupH + r + ty;
    drawDisc(ctx, p.x, discY, r, player, scene.images.players.get(player.id), isCurrent);

    // Landing ring
    const rp = prog(local, 350, 700);
    if (rp > 0 && rp < 1) {
      const re = EASE.out(rp);
      ctx.save();
      ctx.globalAlpha = alpha * (1 - re);
      ctx.beginPath();
      ctx.arc(p.x, discY, (r + r * 0.07) * lerp(1, 2.1, re), 0, Math.PI * 2);
      ctx.strokeStyle = C.greenBright;
      ctx.lineWidth = r * 0.13;
      ctx.stroke();
      ctx.restore();
    }

    const labelY = p.y - nameH + ty;
    ctx.fillStyle = isCurrent ? '#1E8A3C' : 'rgba(7, 21, 44, 0.85)';
    ctx.fillRect(p.x - nameW / 2, labelY, nameW, nameH);
    text(ctx, last, p.x, labelY + nameH * 0.78, { weight: 700, size: nameSize, align: 'center', spacing: 0.05 });
    ctx.restore();
  });
}

function drawSpotlight(ctx, L, t, scene, tl, current) {
  if (current < 0) return;
  const f = L.feature;
  const { player, slot } = scene.starters[current];
  const local = t - tl.playerStart(current);
  const h = f.h;
  const slant = f.w * 0.04;

  const wipe = EASE.snap(prog(local, 0, 350));
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.x, f.y, f.w * wipe, h);
  ctx.clip();

  slantRect(ctx, f.x, f.y, f.w, h, slant);
  const g = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y + h * 0.2);
  g.addColorStop(0, C.blue);
  g.addColorStop(0.7, C.blueDeep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  slantRect(ctx, f.x, f.y, f.w, h, slant);
  ctx.clip();

  // Outlined shirt number
  const numSize = h * 0.73;
  const numBox = Math.max(h * 0.62, measure(ctx, player.number ?? '', 800, numSize) + h * 0.12);
  const ne = EASE.snap(prog(local, 0, 500));
  ctx.save();
  ctx.globalAlpha = ne;
  const ncx = f.x + h * 0.1 + numBox / 2;
  const ncy = f.y + h / 2;
  ctx.translate(ncx - numBox * 0.4 * (1 - ne), ncy);
  ctx.scale(lerp(1.3, 1, ne), lerp(1.3, 1, ne));
  setFont(ctx, 800, numSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = h * 0.017;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeText(String(player.number ?? ''), 0, numSize * 0.04);
  ctx.restore();

  // Name block
  const te = EASE.out(prog(local, 100, 350));
  const tx = f.x + h * 0.1 + numBox + h * 0.08;
  const maxW = f.x + f.w - slant - tx - h * 0.1;
  const { first, last } = splitName(player.name);
  const firstSize = h * 0.146; const lastSize = h * 0.347; const metaSize = h * 0.087; const statSize = h * 0.08;
  const blockH = firstSize * 1.1 + lastSize * 0.95 + metaSize * 1.9 + statSize * 1.7;
  ctx.save();
  ctx.globalAlpha = te;
  ctx.translate(0, (1 - te) * h * 0.13);
  let y = f.y + (h - blockH) / 2 + firstSize;
  if (first) text(ctx, first, tx, y, { weight: 600, size: firstSize, color: C.inkDim, spacing: 0.12, maxWidth: maxW });
  y += lastSize * 0.95;
  text(ctx, last, tx, y, { weight: 800, size: lastSize, maxWidth: maxW });

  y += metaSize * 1.9;
  const chipPad = metaSize * 0.5;
  const slotW = measure(ctx, slot, 800, metaSize * 1.05) + chipPad * 2;
  ctx.fillStyle = C.greenBright;
  ctx.fillRect(tx, y - metaSize * 1.05, slotW, metaSize * 1.4);
  text(ctx, slot, tx + chipPad, y, { weight: 800, size: metaSize * 1.05 });
  let mx = tx + slotW + metaSize * 0.7;
  mx += text(ctx, player.position || '', mx, y, { weight: 400, size: metaSize, family: BODY, spacing: 0.12 });
  if (player.captain) {
    mx += metaSize * 0.7;
    const cw = measure(ctx, 'Captain', 600, metaSize, BODY, 0.12) + chipPad * 2;
    ctx.fillStyle = C.gold;
    ctx.fillRect(mx, y - metaSize * 1.05, cw, metaSize * 1.4);
    text(ctx, 'Captain', mx + chipPad, y, { weight: 600, size: metaSize, family: BODY, color: C.navy, spacing: 0.12 });
  }

  y += statSize * 1.7;
  let sx = tx;
  [[player.appearances ?? 0, 'app'], [player.goals ?? 0, 'goal']].forEach(([value, noun]) => {
    const label = value === 1 ? noun : `${noun}s`;
    sx += text(ctx, value, sx, y, { weight: 600, size: statSize * 1.15, family: BODY }) + statSize * 0.35;
    sx += text(ctx, label, sx, y, { weight: 400, size: statSize, family: BODY, color: C.inkDim, spacing: 0.1 }) + statSize * 1.4;
  });
  ctx.restore();

  ctx.restore(); // slant clip
  ctx.fillStyle = C.greenBright;
  ctx.fillRect(f.x, f.y + h - h * 0.033, f.w - slant * 0.033, h * 0.033);
  ctx.restore(); // wipe clip
}

function drawBench(ctx, L, t, scene, tl) {
  const local = t - tl.benchStart;
  if (local < 0) return;
  const f = L.feature;
  const h = f.h;
  const wipe = EASE.snap(prog(local, 0, 400));
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.x, f.y, f.w * wipe, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(f.x, f.y, f.w, h);
  ctx.fillStyle = C.greenBright;
  ctx.fillRect(f.x, f.y, Math.max(6, h * 0.033), h);

  const padX = h * 0.1;
  const labelSize = h * 0.146;
  text(ctx, 'Substitutes', f.x + padX, f.y + padX * 0.6 + labelSize, { weight: 800, size: labelSize, spacing: 0.1 });

  const subs = scene.substitutes;
  const cols = 2;
  const rows = Math.ceil(subs.length / cols) || 1;
  const top = f.y + padX * 0.6 + labelSize * 1.6;
  const rowH = Math.min(h * 0.15, (f.y + h - padX * 0.5 - top) / rows);
  const colW = (f.w - padX * 2) / cols;
  const size = rowH * 0.72;
  subs.forEach((player, i) => {
    const e = EASE.out(prog(local, 200 + i * 90, 300));
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = f.x + padX + col * colW;
    const y = top + row * rowH + size + (1 - e) * h * 0.06;
    ctx.save();
    ctx.globalAlpha = e;
    const nw = Math.max(size * 1.1, measure(ctx, player.number ?? '', 700, size));
    text(ctx, player.number ?? '', x, y, { weight: 700, size, color: C.greenBright });
    text(ctx, player.name, x + nw + size * 0.4, y, { weight: 400, size, maxWidth: colW - nw - size });
    ctx.restore();
  });
  ctx.restore();
}

function drawList(ctx, L, t, scene, tl, current) {
  const box = L.list;
  const n = scene.starters.length;
  const perCol = Math.ceil(n / box.cols);
  const colGap = box.w * 0.03;
  const colW = (box.w - colGap * (box.cols - 1)) / box.cols;
  const gap = Math.max(4, box.h * 0.012);
  const rowH = (box.h - gap * (perCol - 1)) / perCol;
  const size = Math.min(rowH * 0.62, colW * 0.065);
  const numW = rowH * 1.3;

  scene.starters.forEach(({ player, slot }, i) => {
    const local = t - tl.playerStart(i);
    if (local < 0) return;
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = box.x + col * (colW + colGap) + (1 - EASE.snap(prog(local, 0, 400))) * colW * 0.19;
    const y = box.y + row * (rowH + gap);
    ctx.save();
    ctx.globalAlpha = EASE.std(prog(local, 0, 300));
    ctx.fillStyle = i === current ? 'rgba(47, 180, 87, 0.35)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, y, colW, rowH);
    ctx.fillStyle = C.blue;
    ctx.fillRect(x, y, numW, rowH);
    const base = y + rowH / 2 + size * 0.36;
    text(ctx, player.number ?? '–', x + numW / 2, base, { weight: 800, size, align: 'center' });
    const slotW = text(ctx, slot, x + colW - rowH * 0.3, base, { weight: 600, size: size * 0.85, color: C.inkDim, align: 'right', spacing: 0.04 });
    const nameX = x + numW + rowH * 0.3;
    const nameMax = colW - numW - slotW - rowH * 0.9 - (player.captain ? size * 1.4 : 0);
    const nameW = text(ctx, player.name, nameX, base, { weight: 700, size, spacing: 0.04, maxWidth: nameMax });
    if (player.captain) {
      const cr = size * 0.5;
      const ccx = nameX + nameW + size * 0.4 + cr;
      const ccy = y + rowH / 2;
      ctx.beginPath();
      ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
      ctx.fillStyle = C.gold;
      ctx.fill();
      text(ctx, 'C', ccx, ccy + cr * 0.42, { weight: 800, size: cr * 1.25, color: C.navy, align: 'center' });
    }
    ctx.restore();
  });
}

// ---------- public API ----------

// Turns a resolved lineup into what the renderer needs, once per export.
export function buildScene({ lineup, fixture, clubName = 'Denny Warriors', images }) {
  const slots = new Map((FORMATIONS[lineup.formation] || []).map((s) => [s.slot, s]));
  const starters = lineup.starters
    .filter((s) => slots.has(s.slot))
    .map((s) => ({ ...s, pos: slots.get(s.slot) }));
  return {
    formation: lineup.formation,
    starters,
    substitutes: lineup.substitutes || [],
    fixture,
    clubName,
    opponent: fixture?.opponent || 'Opposition',
    homeFirst: fixture?.home !== false,
    images: { badge: images?.badge || null, players: images?.players || new Map() },
    timeline: timelineFor(starters.length),
  };
}

export function sceneDuration(scene) {
  return scene.timeline.finish + HOLD_MS;
}

export function drawFrame(ctx, layout, scene, t) {
  const tl = scene.timeline;
  const n = scene.starters.length;
  let current = -1;
  for (let i = 0; i < n; i += 1) {
    const end = i === n - 1 ? tl.benchStart : tl.playerStart(i + 1);
    if (t >= tl.playerStart(i) && t < end) current = i;
  }

  ctx.save();
  drawBackground(ctx, layout.width, layout.height, t);
  drawTopBar(ctx, layout, t, scene, tl.pitchStart);
  const proj = drawPitch(ctx, layout, t, scene, tl);
  drawTokens(ctx, layout, t, scene, tl, proj, current);
  drawList(ctx, layout, t, scene, tl, current);
  if (t >= tl.benchStart) drawBench(ctx, layout, t, scene, tl);
  else drawSpotlight(ctx, layout, t, scene, tl, current);
  if (t < tl.pitchStart) drawIntro(ctx, layout, t, scene);
  ctx.restore();
}
