import { drawFrame, sceneDuration, FONT_FACES } from './drawFrame';

const FPS = 30;
const BITRATE = 8_000_000;
// H.264 High / Main / Baseline at level 4.0, which covers 1080 × 1920 at 30fps.
// H.264 MP4 is the one format Facebook, Instagram, X and TikTok all accept.
export const H264_CODECS = [
  { codec: 'avc1.640028', muxer: 'avc' },
  { codec: 'avc1.4d0028', muxer: 'avc' },
  { codec: 'avc1.42e028', muxer: 'avc' },
];
const NOT_H264_NOTE = 'This browser can only make WebM video. For an MP4 that every app accepts, export from Chrome, Edge or Safari.';

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function makeCanvas(layout) {
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  return canvas;
}

// Fonts and images have to be ready before the first frame is drawn.
export async function loadAssets(badgeUrl, players) {
  await Promise.all(FONT_FACES.map((f) => document.fonts.load(f).catch(() => null)));

  const loadImage = (src) => new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    // Without CORS the canvas becomes "tainted" and can't be exported, so a
    // photo that won't load cross-origin falls back to the shirt number.
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 8000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });

  const badge = await loadImage(badgeUrl);
  const entries = await Promise.all(players.map(async (p) => [p.id, await loadImage(p.profileImage)]));
  return { badge, players: new Map(entries.filter(([, img]) => img)) };
}

export async function renderStill(layout, scene) {
  const canvas = makeCanvas(layout);
  drawFrame(canvas.getContext('2d'), layout, scene, sceneDuration(scene));
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function pickEncoderConfig(layout, codecs) {
  if (typeof window.VideoEncoder === 'undefined') return null;
  for (const { codec, muxer } of codecs) {
    const config = { codec, width: layout.width, height: layout.height, bitrate: BITRATE, framerate: FPS };
    try {
      // eslint-disable-next-line no-await-in-loop
      const { supported } = await window.VideoEncoder.isConfigSupported(config);
      if (supported) return { config, muxer };
    } catch {
      // try the next profile
    }
  }
  return null;
}

// Preferred path: WebCodecs encodes each frame as fast as the machine allows
// and mp4-muxer wraps the result in an .mp4 that every social site accepts.
async function encodeWithWebCodecs(layout, scene, { config, muxer: muxerCodec }, onProgress) {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const canvas = makeCanvas(layout);
  const ctx = canvas.getContext('2d');
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: muxerCodec, width: layout.width, height: layout.height, frameRate: FPS },
    fastStart: 'in-memory',
  });
  let failure = null;
  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { failure = e; },
  });
  encoder.configure(config);

  const total = Math.ceil((sceneDuration(scene) / 1000) * FPS);
  for (let f = 0; f < total; f += 1) {
    if (failure) throw failure;
    drawFrame(ctx, layout, scene, (f * 1000) / FPS);
    const frame = new window.VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 6) await sleep(2); // eslint-disable-line no-await-in-loop
    if (f % 10 === 0) {
      onProgress?.(f / total);
      await sleep(0); // eslint-disable-line no-await-in-loop
    }
  }
  await encoder.flush();
  if (failure) throw failure;
  muxer.finalize();
  onProgress?.(1);
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4', note: null };
}

// Fallback for browsers without WebCodecs H.264: record the canvas in real
// time. Gives MP4 where MediaRecorder supports it, otherwise WebM.
async function recordInRealTime(layout, scene, onProgress) {
  // Plain 'video/mp4' is skipped on purpose: some browsers put VP9 inside it,
  // which Instagram rejects even though the file says .mp4.
  const type = ['video/mp4;codecs=avc1', 'video/mp4;codecs=avc1.42E01E', 'video/webm;codecs=vp9', 'video/webm']
    .find((t) => window.MediaRecorder?.isTypeSupported?.(t));
  if (!type) throw new Error('This browser cannot record video. Try a recent Chrome, Edge or Safari.');

  const canvas = makeCanvas(layout);
  const ctx = canvas.getContext('2d');
  const recorder = new MediaRecorder(canvas.captureStream(FPS), { mimeType: type, videoBitsPerSecond: BITRATE });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

  const duration = sceneDuration(scene);
  drawFrame(ctx, layout, scene, 0);
  recorder.start();
  const start = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now() - start;
      drawFrame(ctx, layout, scene, Math.min(t, duration));
      onProgress?.(Math.min(1, t / duration));
      if (t < duration) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;
  const mime = type.split(';')[0];
  const isMp4 = mime === 'video/mp4';
  return { blob: new Blob(chunks, { type: mime }), ext: isMp4 ? 'mp4' : 'webm', note: isMp4 ? null : NOT_H264_NOTE };
}

// `codecs` is only overridden by tests; the site always asks for H.264.
export async function renderVideo(layout, scene, onProgress, codecs = H264_CODECS) {
  const picked = await pickEncoderConfig(layout, codecs);
  if (picked) return encodeWithWebCodecs(layout, scene, picked, onProgress);
  return recordInRealTime(layout, scene, onProgress);
}
