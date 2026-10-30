// The shareable career card (playtest round 7): the final page drawn onto a canvas, so it can
// be saved as a PNG or sent through the phone's share sheet.

import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { CareerRecord } from '../engine/career/record';
import { PlayerArt } from './art/Player';
import { seasonLabel } from './format';
import { MODES } from '../engine/balance';
import { NAMES } from '../content/strings';
import { NBA_TEAMS } from '../content/teams';

const W = 1080;
const H = 1350;
const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif";
const BODY = "'Archivo', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', Menlo, monospace";

/** His sprite, as on the pages, drawn off-screen and turned into an image for the canvas. */
async function portrait(r: CareerRecord, color: string, teamName: string): Promise<HTMLImageElement | null> {
  try {
    const host = document.createElement('div');
    const root = createRoot(host);
    flushSync(() => root.render(createElement(PlayerArt, { name: r.name, number: r.number, pos: r.pos, color, team: teamName, abbr: NBA_TEAMS.find((t) => teamName.includes(t.nick))?.abbr ?? '', size: 240 })));
    // an SVG image can't reach the page's fonts: the jersey number falls back to a system face
    const svg = host.innerHTML.replace(/var\(--f-display\)/g, 'Impact, Arial Narrow, sans-serif');
    root.unmount();
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): number {
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      ctx.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

/** The career card, drawn from a career record (round 24: the log keeps records, not saves). */
export async function drawCareerCard(rec: CareerRecord): Promise<HTMLCanvasElement> {
  try {
    await document.fonts?.ready;
  } catch {
    // fonts are a nicety
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const accent = '#ff6b2c';
  const team = rec.team;
  const tc = team?.color ?? accent;

  // background, with his main team's colour along the top and down the side of the name box
  ctx.fillStyle = '#121418';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = tc;
  ctx.fillRect(0, 0, W, 14);
  ctx.fillStyle = '#1b1e24';
  ctx.fillRect(60, 120, W - 120, 330);
  ctx.fillStyle = tc;
  ctx.fillRect(60, 120, 10, 330);
  const face = await portrait(rec, tc, team?.name ?? '');
  if (face) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(face, 100, 136, (face.width * 172) / face.height, 172);
    ctx.imageSmoothingEnabled = true;
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f4f1ea';
  ctx.font = `900 34px ${DISPLAY}`;
  ctx.fillText('BENCH TO ', 60, 82);
  const bw = ctx.measureText('BENCH TO ').width;
  ctx.fillStyle = accent;
  ctx.fillText('RAFTERS', 60 + bw, 82);
  ctx.fillStyle = '#9aa0a6';
  ctx.font = `500 22px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${MODES[rec.mode].name.toUpperCase()}`, W - 60, 82);
  ctx.textAlign = 'left';

  // identity and peak OVR
  ctx.fillStyle = '#9aa0a6';
  ctx.font = `500 24px ${MONO}`;
  ctx.fillText(`${NAMES.pos[rec.pos].toUpperCase()} · ${rec.role.toUpperCase()}${rec.anomaly ? ` · ${rec.anomaly.toUpperCase()}` : ''}`, 262, 180);
  ctx.fillStyle = '#f4f1ea';
  ctx.font = `800 84px ${DISPLAY}`;
  const nameBottom = wrap(ctx, rec.name.toUpperCase(), 262, 262, 500, 80);
  ctx.fillStyle = '#c9c4ba';
  ctx.font = `400 26px ${BODY}`;
  // round 25: what the media called him, under his name
  const nick = rec.nickname ? `\u201c${rec.nickname.name}\u201d · ` : '';
  ctx.fillText(`${nick}${rec.country} · retired at ${rec.retiredAt}${team ? ` · ${team.name}` : ''}`, 262, Math.min(420, nameBottom + 6));
  if (rec.ringChaser) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = `600 22px ${MONO}`;
    ctx.fillText(`RING CHASER: ${rec.ringChaser.toUpperCase()}`, 96, 428);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `900 150px ${DISPLAY}`;
  ctx.fillText(String(Math.round(rec.peak)), W - 190, 320);
  ctx.fillStyle = '#9aa0a6';
  ctx.font = `500 24px ${MONO}`;
  ctx.fillText('PEAK OVR', W - 190, 360);
  ctx.textAlign = 'left';

  // verdict and legacy rank
  let y = 540;
  ctx.fillStyle = '#f4f1ea';
  ctx.font = `800 66px ${DISPLAY}`;
  ctx.fillText(rec.tier.toUpperCase(), 60, y);
  y += 50;
  ctx.fillStyle = '#c9c4ba';
  ctx.font = `400 28px ${BODY}`;
  y = wrap(ctx, rec.verdict, 60, y, W - 120, 36);
  y += 14;
  ctx.fillStyle = accent;
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.fillText(rec.rank <= 100 ? `ALL-TIME LEGACY RANK: NO. ${rec.rank}` : 'OUTSIDE THE ALL-TIME TOP 100', 60, y);
  y += 40;
  ctx.fillStyle = '#9aa0a6';
  ctx.font = `500 24px ${MONO}`;
  ctx.fillText(`${rec.legacy} LEGACY POINTS${rec.rankBehind ? ` · BEHIND ${rec.rankBehind.toUpperCase()}` : ''}`, 60, y);
  y += 40;

  // the numbers, in tiles (round 15)
  const tiles: [string, string][] = [
    ['NBA SEASONS', String(rec.nbaSeasons)],
    ['NBA POINTS', rec.nbaPoints.toLocaleString()],
    ['TITLES', String(rec.titles)],
    ['MVPS', String(rec.mvps)],
    ['ALL-STAR', String(rec.allStars)],
  ];
  const tw = (W - 120 - 4 * 12) / 5;
  tiles.forEach(([k, val], i) => {
    const tx = 60 + i * (tw + 12);
    ctx.fillStyle = '#1b1e24';
    ctx.fillRect(tx, y, tw, 104);
    ctx.fillStyle = i === 2 && val !== '0' ? '#ffd76a' : '#f4f1ea';
    ctx.font = `900 54px ${DISPLAY}`;
    ctx.fillText(val, tx + 16, y + 60);
    ctx.fillStyle = '#9aa0a6';
    ctx.font = `500 18px ${MONO}`;
    ctx.fillText(k, tx + 16, y + 90);
  });
  y += 104 + 64;

  // honours: S and A tier first
  const chips = rec.honours;
  ctx.font = `700 28px ${BODY}`;
  let x = 60;
  for (const ch of chips.slice(0, 14)) {
    const w = ctx.measureText(ch.text).width + 36;
    if (x + w > W - 60) {
      x = 60;
      y += 62;
    }
    if (y > H - 220) break;
    ctx.fillStyle = ch.color;
    ctx.beginPath();
    ctx.roundRect?.(x, y - 36, w, 50, 10);
    if (!ctx.roundRect) ctx.rect(x, y - 36, w, 50);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch.text, x + 18, y);
    x += w + 12;
  }
  if (chips.length === 0) {
    ctx.fillStyle = '#9aa0a6';
    ctx.font = `400 28px ${BODY}`;
    ctx.fillText('No major honours. The love of the game was enough.', 60, y);
  }

  // championships and the teams he won them with
  y += chips.length ? 92 : 70;
  const titles = rec.rings.reduce((n, r) => n + r.years.length, 0);
  if (titles) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = `800 34px ${DISPLAY}`;
    ctx.fillText(`${titles}× NBA CHAMPION`, 60, y);
    y += 44;
    ctx.font = `500 26px ${BODY}`;
    for (const ring of rec.rings) {
      ctx.fillStyle = ring.color;
      ctx.fillRect(60, y - 22, 10, 28);
      ctx.fillStyle = '#f4f1ea';
      y = wrap(ctx, `${ring.team}: ${ring.years.map((x) => seasonLabel(x.year) + (x.fmvp ? ' (Finals MVP)' : '')).join(', ')}`, 84, y, W - 144, 34);
      y += 4;
    }
    y += 30;
  }
  // career line and teams; the card is then cropped to fit
  ctx.fillStyle = '#f4f1ea';
  ctx.font = `600 30px ${BODY}`;
  if (rec.nbaLine) {
    ctx.fillText(rec.nbaLine, 60, y);
    y += 46;
  }
  ctx.fillStyle = '#9aa0a6';
  ctx.font = `400 24px ${BODY}`;
  y = wrap(ctx, rec.teams.join(' · ') || rec.highSchool, 60, y, W - 120, 30);
  const height = Math.min(H, Math.max(900, y + 40));
  const out = document.createElement('canvas');
  out.width = W;
  out.height = height;
  const o = out.getContext('2d')!;
  o.drawImage(c, 0, 0, W, height, 0, 0, W, height);
  o.fillStyle = tc;
  o.fillRect(0, height - 14, W, 14);
  return out;
}

const fileName = (r: CareerRecord) => `${r.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'career'}-bench-to-rafters.png`;

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png'));

interface DownloadsApi {
  save(r: { filename: string; data: Blob }): Promise<{ status: string }>;
}
type ClaudeHost = { use(name: string): Promise<unknown> };
const host = (): ClaudeHost | undefined => (window as unknown as { claude?: ClaudeHost }).claude;

/** Inside claude.ai the page cannot download directly; the viewer's downloads capability can. */
async function viewerDownloads(): Promise<DownloadsApi | null> {
  const c = host();
  if (!c?.use) return null;
  try {
    return (await c.use('downloads')) as DownloadsApi | null;
  } catch {
    return null;
  }
}

/** Saves the career card as a PNG. Returns a short status line for the page. */
export async function downloadCareerCard(r: CareerRecord): Promise<string> {
  const blob = await toBlob(await drawCareerCard(r));
  const dl = await viewerDownloads();
  if (dl) {
    try {
      await dl.save({ filename: fileName(r), data: blob });
      return 'Career card saved as a PNG.';
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return '';
      if (code === 'rate_limited') return 'A save is already waiting for you. Try again in a moment.';
      return 'Saving files is not available here.';
    }
  }
  if (host()) return 'Saving files is not available here.';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(r);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'Career card saved as a PNG.';
}

/** Opens the share sheet with the card where the browser supports it; returns false otherwise. */
export async function shareCareerCard(r: CareerRecord): Promise<boolean> {
  const blob = await toBlob(await drawCareerCard(r));
  const file = new File([blob], fileName(r), { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], title: `${r.name}: ${r.tier}` });
  } catch {
    // the player closed the share sheet
  }
  return true;
}

// inside claude.ai the save prompt already hands the file to the phone's share sheet
export const canShareFiles = (): boolean => !host() && typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;
