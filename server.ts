import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  BatterStats,
  BowlerStats,
  BroadcastSession,
  GroundingSource,
  ImageExtractionResult,
  LiveCricketFeedResponse,
  LiveCricketMatch,
  MatchCategory,
  TournamentSummary,
} from './src/types/cricket.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSIONS_FILE = path.join(os.tmpdir(), 'rizwan-cricket-sessions.json');
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{4,32}$/;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

const app = express();
app.use(express.json({ limit: '15mb' }));

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Persistent session store (memory + /tmp backup)
const sessionStore = new Map<string, BroadcastSession>();

function loadSessionsFromDisk(): void {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, BroadcastSession>;
      for (const [key, value] of Object.entries(parsed)) {
        if (SESSION_ID_REGEX.test(key) && value && typeof value === 'object') {
          sessionStore.set(key, value);
        }
      }
    }
  } catch {
    // Ignore corrupt temp cache
  }
}

function saveSessionsToDisk(): void {
  try {
    const obj: Record<string, BroadcastSession> = {};
    for (const [k, v] of sessionStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj), 'utf8');
  } catch {
    // Ignore ephemeral filesystem errors
  }
}

loadSessionsFromDisk();

function isSafeImageUri(uri?: string): boolean {
  if (!uri) return true;
  if (uri.length > 8_000_000) return false;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(uri)) return true;
  if (/^\/src\/assets\/images\/[a-zA-Z0-9_.-]+$/.test(uri)) return true;
  if (/^\/assets\/aistudio\/[a-zA-Z0-9_.-]+$/.test(uri)) return true;
  return false;
}

const VALID_LAYOUT_IDS = new Set([
  'free-classic',
  'pro-champions-gold',
  'pro-psl-neon',
  'pro-crimson-arena',
  'pro-ultra-cyan',
  'pro-platinum-elite',
  'pro-royal-trophy',
]);

function sanitizeSession(input: BroadcastSession): BroadcastSession {
  const safeMatch: LiveCricketMatch = {
    ...input.match,
    batter1: {
      ...input.match.batter1,
      photoUrl: isSafeImageUri(input.match.batter1?.photoUrl) ? input.match.batter1?.photoUrl : undefined,
    },
    batter2: {
      ...input.match.batter2,
      photoUrl: isSafeImageUri(input.match.batter2?.photoUrl) ? input.match.batter2?.photoUrl : undefined,
    },
    bowler: {
      ...input.match.bowler,
      photoUrl: isSafeImageUri(input.match.bowler?.photoUrl) ? input.match.bowler?.photoUrl : undefined,
    },
  };

  return {
    sessionId: input.sessionId,
    match: safeMatch,
    backdropMode: input.backdropMode || 'stadium',
    selectedLayoutId:
      input.selectedLayoutId && VALID_LAYOUT_IDS.has(input.selectedLayoutId)
        ? input.selectedLayoutId
        : 'free-classic',
    customBackdropUrl: isSafeImageUri(input.customBackdropUrl) ? input.customBackdropUrl : undefined,
    language: input.language || 'bilingual',
    autoRefresh: Boolean(input.autoRefresh),
    updatedAt: new Date().toISOString(),
  };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)));
}

function teamColorForName(nameOrCode: string): string {
  const key = nameOrCode.toUpperCase();
  if (key.includes('PAK') || key.includes('LAHORE') || key.includes('THUNDER')) return '#016B3A';
  if (key.includes('IND') || key.includes('MUMBAI') || key.includes('DELHI')) return '#1D4ED8';
  if (key.includes('AUS') || key.includes('VICTORIA') || key.includes('STRIKER')) return '#CA8A04';
  if (key.includes('ENG') || key.includes('SIXERS')) return '#BE123C';
  if (key.includes('NZ') || key.includes('BLACK')) return '#1E293B';
  if (key.includes('RSA') || key.includes('SOUTH AFRICA')) return '#15803D';
  if (key.includes('SL') || key.includes('SRI LANKA')) return '#1E40AF';
  if (key.includes('BAN')) return '#047857';
  if (key.includes('AFG')) return '#0369A1';
  if (key.includes('WI') || key.includes('WEST INDIES')) return '#7F1D1D';
  return '#0F766E';
}

function detectFormat(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('test') || lower.includes('shield')) return 'TEST';
  if (lower.includes('odi') || lower.includes('one-day') || lower.includes('list a')) return 'ODI';
  if (lower.includes('t20i')) return 'T20I';
  if (lower.includes('t20') || lower.includes('bbl') || lower.includes('psl') || lower.includes('ipl') || lower.includes('ilt20') || lower.includes('mushtaq') || lower.includes('bash')) {
    return 'T20';
  }
  return 'LIVE';
}

function detectCategory(tournament: string, teamsText: string): Exclude<MatchCategory, 'all' | 'live'> {
  const hay = `${tournament} ${teamsText}`.toLowerCase();
  if (hay.includes('icc') || hay.includes('world cup') || hay.includes('champions trophy') || hay.includes('asia cup')) {
    return 'icc_event';
  }
  if (
    hay.includes('bbl') ||
    hay.includes('big bash') ||
    hay.includes('ilt20') ||
    hay.includes('psl') ||
    hay.includes('ipl') ||
    hay.includes('sa20') ||
    hay.includes('mushtaq ali') ||
    hay.includes('cpl') ||
    hay.includes('league')
  ) {
    return 't20_league';
  }
  if (
    hay.includes('tour of') ||
    hay.includes('v ') && (hay.includes('india ') || hay.includes('pakistan ') || hay.includes('australia ') || hay.includes('england ') || hay.includes('new zealand ') || hay.includes('south africa ') || hay.includes('bangladesh ') || hay.includes('sri lanka '))
  ) {
    return 'international';
  }
  return 'domestic';
}

function parseCricbuzzMatchHtml(html: string, matchPath: string): LiveCricketMatch | null {
  try {
    const idMatch = matchPath.match(/\/live-cricket-scores\/(\d+)\//);
    const id = idMatch ? `cb-${idMatch[1]}` : `cb-${crypto.randomBytes(3).toString('hex')}`;
    const sourceUrl = `https://www.cricbuzz.com${matchPath}`;

    const h1Raw = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '';
    const h1Clean = decodeHtmlEntities(h1Raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

    const plain = decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' | ')
        .replace(/\s+/g, ' ')
        .replace(/(?:\s*\|\s*)+/g, ' | ')
    );

    const seriesMatch = plain.match(/Series:\s*\|\s*([^|]+?)\s*\|/);
    const venueMatch = plain.match(/Venue:\s*\|\s*([^|]+?)\s*\|/);
    const tournament = seriesMatch ? seriesMatch[1].trim() : 'Live Cricket';
    const venue = venueMatch ? venueMatch[1].trim() : '';

    // Extract team names from H1 ("Team A vs Team B, ...")
    const vsSplit = h1Clean.split(',')[0]?.split(/\s+vs\s+/i) || [];
    const team1Full = vsSplit[0]?.trim() || 'Team 1';
    const team2Full = vsSplit[1]?.trim() || 'Team 2';

    // Focus slice after the match tab "News" menu (after "Series:") where live miniscore lives
    const seriesStart = plain.indexOf('Series:');
    const newsIdx = plain.indexOf('| News |', seriesStart !== -1 ? seriesStart : 0);
    const scoreArea = newsIdx !== -1 ? plain.slice(newsIdx, newsIdx + 2800) : plain.slice(0, 2800);

    // Match score tokens like: "INDA | 144 | - | 1 | ( | 18.2 | )" or "MLSW | 160 | - | 7 | ( | 20 | )"
    const scoreRegex = /([A-Z0-9]{2,6})\s*\|\s*(\d+)\s*\|\s*-\s*\|\s*(\d+)\s*\|\s*\(\s*\|\s*([\d.]+)\s*\|\s*\)/g;
    const scoreEntries: Array<{ code: string; runs: string; wickets: string; overs: string }> = [];
    const seenCodes = new Set<string>();
    let sm: RegExpExecArray | null;
    while ((sm = scoreRegex.exec(scoreArea)) !== null) {
      if (!seenCodes.has(sm[1])) {
        seenCodes.add(sm[1]);
        scoreEntries.push({
          code: sm[1],
          runs: sm[2],
          wickets: sm[3],
          overs: sm[4],
        });
      }
      if (scoreEntries.length >= 2) break;
    }

    const crrMatch = scoreArea.match(/CRR:?\s*\|\s*([\d.]+)/);
    const crr = crrMatch ? crrMatch[1] : '-';

    // Extract status / equation line
    const statusMatch = scoreArea.match(
      /(?:CRR:?\s*\|\s*[\d.]+\s*\|\s*|Preview\s*\|\s*)([^|]{5,90}?)\s*\|/
    );
    const rawStatus = statusMatch ? statusMatch[1].trim() : '';
    const status =
      rawStatus && !rawStatus.startsWith('P\'SHIP') && !rawStatus.startsWith('Batter')
        ? rawStatus
        : scoreEntries.length > 0
          ? 'Live Innings'
          : 'Match Preview';

    const isLive =
      !status.toLowerCase().includes('won') &&
      !status.toLowerCase().includes('preview') &&
      !status.toLowerCase().includes('stumps') &&
      scoreEntries.length > 0;

    // Extract Batters table
    const batterIdx = scoreArea.indexOf('Batter | R | B | 4s | 6s | SR');
    const bowlerIdx = scoreArea.indexOf('Bowler | O | M | R | W | ECO');
    const batters: BatterStats[] = [];

    if (batterIdx !== -1) {
      const batterBlock = scoreArea.slice(
        batterIdx + 29,
        bowlerIdx > batterIdx ? bowlerIdx : batterIdx + 900
      );
      const bRegex =
        /\|\s*([A-Za-z][A-Za-z .'-]{2,35}?)\s*\|\s*(\*\s*\|\s*)?(?:View match performance[\s\S]*?View profile\s*\|\s*)?(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)/g;
      let bm: RegExpExecArray | null;
      while ((bm = bRegex.exec(batterBlock)) !== null && batters.length < 2) {
        batters.push({
          name: bm[1].trim(),
          onStrike: Boolean(bm[2]) || batters.length === 0,
          runs: Number(bm[3]),
          balls: Number(bm[4]),
          fours: Number(bm[5]),
          sixes: Number(bm[6]),
          strikeRate: bm[7],
        });
      }
    }

    // Extract Bowler table
    let bowler: BowlerStats = {
      name: 'Current Bowler',
      overs: '-',
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: '-',
    };

    if (bowlerIdx !== -1) {
      const bowlerBlock = scoreArea.slice(bowlerIdx + 28, bowlerIdx + 700);
      const bwRegex =
        /\|\s*([A-Za-z][A-Za-z .'-]{2,35}?)\s*\|\s*(?:\*\s*\|\s*)?(?:View match performance[\s\S]*?View profile\s*\|\s*)?([\d.]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)/;
      const bwm = bowlerBlock.match(bwRegex);
      if (bwm) {
        bowler = {
          name: bwm[1].trim(),
          overs: bwm[2],
          maidens: Number(bwm[3]),
          runs: Number(bwm[4]),
          wickets: Number(bwm[5]),
          economy: bwm[6],
        };
      }
    }

    // Recent balls & Last Wicket
    const recentMatch = plain.match(/Recent\s*:\s*\|\s*([^|]+?)(?:\s*\|\s*Key Stats|\s*\|)/i);
    const recentBalls = recentMatch
      ? recentMatch[1]
          .split(/[\s|]+/)
          .map((t) => t.trim())
          .filter((t) => /^(?:[0-6]|W|Wd|Nb|Lb|B|•|\.|\d+(?:Wd|Nb)?)$/i.test(t))
          .slice(-6)
      : [];

    const lastWktMatch = plain.match(/Last Wkt:?\s*(?:\|\s*)?([^|]{4,140}?)\s*\|/);
    const lastWicket = lastWktMatch ? lastWktMatch[1].trim() : undefined;

    // Inspect latest commentary & status for injury / free hit / break / active bowler running
    const commIdx = plain.indexOf('Match Forecast:');
    const latestCommSlice =
      commIdx !== -1 ? plain.slice(commIdx, commIdx + 900) : plain.slice(newsIdx !== -1 ? newsIdx : 0, (newsIdx !== -1 ? newsIdx : 0) + 1800);
    const liveSignalText = `${status} ${latestCommSlice.slice(0, 450)}`;

    let detectedActionStatus: LiveCricketMatch['detectedActionStatus'];
    if (
      /\b(injur(?:y|ed)|physio|retired hurt|concussion|stretcher|cramp|medical|hurt on|limping|treatment)\b/i.test(
        liveSignalText
      )
    ) {
      detectedActionStatus = 'injury';
    } else if (/\bfree hit\b/i.test(liveSignalText)) {
      detectedActionStatus = 'free_hit';
    } else if (
      /\b(drinks|innings break|tea|lunch|rain|delay|stumps|wet outfield|bad light|timeout)\b/i.test(
        status
      )
    ) {
      detectedActionStatus = 'break';
    } else if (isLive) {
      detectedActionStatus = 'bowler_running';
    }

    const codeMatchesTeam = (code: string, name: string) => {
      const c = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const words = name
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, '')
        .split(/\s+/)
        .filter(Boolean);
      const initials = words.map((w) => w[0]).join('');
      const prefix = words[0]?.slice(0, c.length) || '';
      return c === initials || prefix.startsWith(c.slice(0, 3)) || (words[0]?.startsWith(c.slice(0, 2)) && words[1]?.[0] === c[c.length - 1]);
    };

    const makeAbbrev = (name: string) =>
      name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 4)
        .toUpperCase();

    let team1Score = { runs: '-', wickets: '-', overs: '0.0', code: makeAbbrev(team1Full) };
    let team2Score = { runs: '-', wickets: '-', overs: '0.0', code: makeAbbrev(team2Full) };
    let team1Batting = false;
    let team2Batting = false;

    if (scoreEntries.length === 1) {
      const entry = scoreEntries[0];
      if (codeMatchesTeam(entry.code, team2Full) && !codeMatchesTeam(entry.code, team1Full)) {
        team2Score = entry;
        team2Batting = true;
      } else {
        team1Score = entry;
        team1Batting = true;
      }
    } else if (scoreEntries.length >= 2) {
      const e0 = scoreEntries[0];
      const e1 = scoreEntries[1];
      if (codeMatchesTeam(e0.code, team2Full) && !codeMatchesTeam(e0.code, team1Full)) {
        team2Score = e0;
        team1Score = e1;
        team1Batting = true;
      } else {
        team1Score = e0;
        team2Score = e1;
        team2Batting = true;
      }
    }

    const category = detectCategory(tournament, `${team1Full} ${team2Full}`);
    const format = detectFormat(`${tournament} ${h1Clean}`);

    return {
      id,
      tournament,
      category,
      format,
      status,
      isLive,
      venue,
      team1: {
        name: team1Full,
        shortName: team1Score.code,
        runs: team1Score.runs,
        wickets: team1Score.wickets,
        overs: team1Score.overs,
        runRate: team1Batting ? crr : '-',
        colorHex: teamColorForName(`${team1Full} ${team1Score.code}`),
        flagCode: team1Score.code,
        isBatting: team1Batting,
      },
      team2: {
        name: team2Full,
        shortName: team2Score.code,
        runs: team2Score.runs,
        wickets: team2Score.wickets,
        overs: team2Score.overs,
        runRate: team2Batting ? crr : '-',
        colorHex: teamColorForName(`${team2Full} ${team2Score.code}`),
        flagCode: team2Score.code,
        isBatting: team2Batting,
      },
      batter1: batters[0] || {
        name: `${team2Score.code || team1Score.code} Striker`,
        runs: '-',
        balls: '-',
        fours: '-',
        sixes: '-',
        strikeRate: '-',
        onStrike: true,
      },
      batter2: batters[1] || {
        name: `${team2Score.code || team1Score.code} Non-Striker`,
        runs: '-',
        balls: '-',
        fours: '-',
        sixes: '-',
        strikeRate: '-',
        onStrike: false,
      },
      bowler,
      recentBalls,
      equation: status,
      target:
        scoreEntries[0] && scoreEntries[1] && !Number.isNaN(Number(scoreEntries[0].runs))
          ? String(Number(scoreEntries[0].runs) + 1)
          : '',
      lastWicket,
      detectedActionStatus,
      lastUpdated: new Date().toISOString(),
      sources: [{ title: `Cricbuzz · ${team1Score.code} vs ${team2Score.code}`, uri: sourceUrl }],
    };
  } catch {
    return null;
  }
}

function parseCricinfoRss(xml: string): LiveCricketMatch[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  const results: LiveCricketMatch[] = [];
  for (let i = 0; i < items.length && results.length < 10; i++) {
    const block = items[i][1];
    const titleRaw = decodeHtmlEntities(
      (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim()
    );
    const linkRaw = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
    const guidMatch = linkRaw.match(/match\/(\d+)\.html/);
    const id = guidMatch ? `ci-${guidMatch[1]}` : `ci-${i + 1}`;

    const parts = titleRaw.split(/\s+v\s+/i);
    if (parts.length !== 2) continue;

    const parseSide = (side: string) => {
      const multi = side.match(/^(.+?)\s+\d+\/\d+\s*&\s*(\d+)\/(\d+)(?:\s*\*)?$/);
      if (multi) {
        return {
          name: multi[1].trim(),
          runs: multi[2],
          wickets: multi[3],
          batting: side.includes('*'),
        };
      }
      const m = side.match(/^(.+?)\s+(\d+)\/(\d+)(?:\s*\*)?$/);
      if (m) {
        return {
          name: m[1].trim(),
          runs: m[2],
          wickets: m[3],
          batting: side.includes('*'),
        };
      }
      return {
        name: side.replace(/\*/g, '').trim(),
        runs: '-',
        wickets: '-',
        batting: side.includes('*'),
      };
    };

    const s1 = parseSide(parts[0].trim());
    const s2 = parseSide(parts[1].trim());
    const c1 = s1.name.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase();
    const c2 = s2.name.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase();

    results.push({
      id,
      tournament: 'ESPNcricinfo Live Match Center',
      category: detectCategory('', `${s1.name} ${s2.name}`),
      format: titleRaw.includes('&') ? 'FIRST-CLASS / TEST' : 'LIVE',
      status: s1.batting ? `${s1.name} batting` : s2.batting ? `${s2.name} batting` : 'Live',
      isLive: titleRaw.includes('*'),
      venue: 'Live Ground',
      team1: {
        name: s1.name,
        shortName: c1,
        runs: s1.runs,
        wickets: s1.wickets,
        overs: '-',
        runRate: '-',
        colorHex: teamColorForName(s1.name),
        flagCode: c1,
        isBatting: s1.batting,
      },
      team2: {
        name: s2.name,
        shortName: c2,
        runs: s2.runs,
        wickets: s2.wickets,
        overs: '-',
        runRate: '-',
        colorHex: teamColorForName(s2.name),
        flagCode: c2,
        isBatting: s2.batting,
      },
      batter1: {
        name: `${s1.batting ? c1 : c2} Batter 1`,
        runs: '-',
        balls: '-',
        fours: '-',
        sixes: '-',
        strikeRate: '-',
        onStrike: true,
      },
      batter2: {
        name: `${s1.batting ? c1 : c2} Batter 2`,
        runs: '-',
        balls: '-',
        fours: '-',
        sixes: '-',
        strikeRate: '-',
        onStrike: false,
      },
      bowler: {
        name: `${s1.batting ? c2 : c1} Bowler`,
        overs: '-',
        maidens: '-',
        runs: '-',
        wickets: '-',
        economy: '-',
      },
      recentBalls: [],
      equation: titleRaw,
      target: '',
      lastUpdated: new Date().toISOString(),
      sources: linkRaw ? [{ title: 'ESPNcricinfo Live Scores', uri: linkRaw }] : [],
    });
  }
  return results;
}

let cachedLiveFeed: { data: LiveCricketFeedResponse; expiresAt: number } | null = null;
const matchUrlById = new Map<string, string>();

async function fetchRealLiveCricketFeed(forceRefresh = false): Promise<LiveCricketFeedResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedLiveFeed && cachedLiveFeed.expiresAt > now) {
    return { ...cachedLiveFeed.data, cached: true };
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };

  const [cbHtmlRes, rssRes] = await Promise.allSettled([
    fetch('https://www.cricbuzz.com/cricket-match/live-scores', { headers, signal: AbortSignal.timeout(7000) }).then((r) =>
      r.ok ? r.text() : ''
    ),
    fetch('https://static.cricinfo.com/rss/livescores.xml', { headers, signal: AbortSignal.timeout(7000) }).then((r) =>
      r.ok ? r.text() : ''
    ),
  ]);

  const cbHtml = cbHtmlRes.status === 'fulfilled' ? cbHtmlRes.value : '';
  const rssXml = rssRes.status === 'fulfilled' ? rssRes.value : '';

  const uniquePathsByNumericId = new Map<string, string>();
  if (cbHtml) {
    for (const match of cbHtml.matchAll(/href="(\/live-cricket-scores\/(\d+)\/[^"]+)"/g)) {
      const mp = match[1];
      const numericId = match[2];
      if (!uniquePathsByNumericId.has(numericId)) {
        uniquePathsByNumericId.set(numericId, mp);
      }
      if (uniquePathsByNumericId.size >= 14) break;
    }
  }
  const matchPaths = Array.from(uniquePathsByNumericId.values());

  // Fetch detailed live scorecards for top discovered matches in parallel
  const detailResults = await Promise.allSettled(
    matchPaths.map(async (mp) => {
      const res = await fetch(`https://www.cricbuzz.com${mp}`, {
        headers,
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      const parsed = parseCricbuzzMatchHtml(html, mp);
      if (parsed) {
        matchUrlById.set(parsed.id, mp);
      }
      return parsed;
    })
  );

  const seenMatchIds = new Set<string>();
  const cbMatches: LiveCricketMatch[] = [];
  for (const r of detailResults) {
    if (r.status === 'fulfilled' && r.value && !seenMatchIds.has(r.value.id)) {
      seenMatchIds.add(r.value.id);
      cbMatches.push(r.value);
    }
  }

  // Merge unique matches from Cricinfo RSS (such as Shield / Ranji / Women's matches not already listed)
  const rssMatches = rssXml ? parseCricinfoRss(rssXml) : [];
  const existingTeamKeys = new Set(
    cbMatches.map((m) => `${m.team1.name.toLowerCase()}|${m.team2.name.toLowerCase()}`)
  );

  const combinedMatches: LiveCricketMatch[] = [...cbMatches];
  for (const rm of rssMatches) {
    const key1 = `${rm.team1.name.toLowerCase()}|${rm.team2.name.toLowerCase()}`;
    const key2 = `${rm.team2.name.toLowerCase()}|${rm.team1.name.toLowerCase()}`;
    if (!seenMatchIds.has(rm.id) && !existingTeamKeys.has(key1) && !existingTeamKeys.has(key2)) {
      seenMatchIds.add(rm.id);
      combinedMatches.push(rm);
    }
  }

  // Sort live matches with real batters/scores first
  combinedMatches.sort((a, b) => {
    const scoreA = (a.isLive ? 10 : 0) + (a.batter1.runs !== '-' ? 5 : 0);
    const scoreB = (b.isLive ? 10 : 0) + (b.batter1.runs !== '-' ? 5 : 0);
    return scoreB - scoreA;
  });

  // Build All Active Tournaments list from live matches
  const tournamentMap = new Map<string, TournamentSummary>();
  for (const m of combinedMatches) {
    const existing = tournamentMap.get(m.tournament);
    if (existing) {
      existing.activeMatchesCount += 1;
      if (m.isLive) existing.status = 'Live Now';
    } else {
      tournamentMap.set(m.tournament, {
        id: m.tournament.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: m.tournament,
        category: m.category,
        region: m.venue ? m.venue.split(',').pop()?.trim() || 'Global' : 'Global',
        status: m.isLive ? 'Live Now' : 'Ongoing',
        activeMatchesCount: 1,
      });
    }
  }

  const sources: GroundingSource[] = [
    { title: 'Cricbuzz Live Scores', uri: 'https://www.cricbuzz.com/cricket-match/live-scores' },
    { title: 'ESPNcricinfo Live Feed', uri: 'https://static.cricinfo.com/rss/livescores.xml' },
  ];

  const feed: LiveCricketFeedResponse = {
    matches: combinedMatches,
    tournaments: Array.from(tournamentMap.values()),
    sources,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };

  if (combinedMatches.length > 0) {
    cachedLiveFeed = {
      data: feed,
      expiresAt: Date.now() + 8_000,
    };
  }

  return feed;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'rizwan-cricket' });
});

// Live matches & all tournaments endpoint
app.get('/api/cricket/live', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const feed = await fetchRealLiveCricketFeed(forceRefresh);
    res.json(feed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch live cricket feed';
    res.status(502).json({ error: message });
  }
});

const cachedMatchDetail = new Map<string, { data: LiveCricketMatch; expiresAt: number }>();

// Deep live detail refresh for a specific selected match
app.post('/api/cricket/match-detail', async (req, res) => {
  try {
    const { matchId } = req.body as { matchId?: string };
    const now = Date.now();
    if (matchId) {
      const cached = cachedMatchDetail.get(matchId);
      if (cached && cached.expiresAt > now) {
        res.json(cached.data);
        return;
      }
    }

    if (matchId && matchUrlById.has(matchId)) {
      const mp = matchUrlById.get(matchId)!;
      const response = await fetch(`https://www.cricbuzz.com${mp}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(7000),
      });
      if (response.ok) {
        const html = await response.text();
        const parsed = parseCricbuzzMatchHtml(html, mp);
        if (parsed) {
          cachedMatchDetail.set(matchId, { data: parsed, expiresAt: Date.now() + 2_500 });
          res.json(parsed);
          return;
        }
      }
    }

    const feed = await fetchRealLiveCricketFeed(true);
    const found = feed.matches.find((m) => m.id === matchId) || feed.matches[0];
    if (!found) {
      res.status(404).json({ error: 'Match not found in live feed.' });
      return;
    }
    res.json(found);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to refresh match details';
    res.status(502).json({ error: message });
  }
});

// Smart Image Upload -> Extract Live Cricket Scoreboard Data via Gemini Vision
app.post('/api/cricket/extract-image', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 is required.' });
      return;
    }

    const cleanMime = (mimeType || 'image/jpeg').toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(cleanMime)) {
      res.status(400).json({ error: 'Unsupported image format. Please upload PNG, JPEG, or WebP.' });
      return;
    }

    if (imageBase64.length > 14_000_000) {
      res.status(413).json({ error: 'Image is too large. Please keep uploads under 10 MB.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: imageBase64,
            },
          },
          {
            text: `Analyze this uploaded cricket image carefully.
1) Determine if it is a scoreboard/broadcast graphic ("scoreboard"), a portrait of a cricketer ("player_portrait"), or a general match photo ("match_scene").
2) Extract every visible scoreboard detail accurately: tournament name, format, venue, status/equation/target, team1 (name, shortName, runs, wickets, overs, runRate, colorHex), team2 (name, shortName, runs, wickets, overs, runRate, colorHex), both batters (name, runs, balls, fours, sixes, strikeRate, onStrike), current bowler (name, overs, maidens, runs, wickets, economy), and recent balls if visible.
3) Do NOT invent numbers that are not visible. Leave unreadable fields empty string or omitted.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedKind: {
              type: Type.STRING,
              description: 'One of: scoreboard, player_portrait, match_scene',
            },
            confidenceNote: {
              type: Type.STRING,
              description: 'Short summary in Urdu and English of what was extracted from the image.',
            },
            tournament: { type: Type.STRING },
            format: { type: Type.STRING },
            venue: { type: Type.STRING },
            status: { type: Type.STRING },
            equation: { type: Type.STRING },
            target: { type: Type.STRING },
            recentBalls: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            team1: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                shortName: { type: Type.STRING },
                runs: { type: Type.STRING },
                wickets: { type: Type.STRING },
                overs: { type: Type.STRING },
                runRate: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              },
            },
            team2: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                shortName: { type: Type.STRING },
                runs: { type: Type.STRING },
                wickets: { type: Type.STRING },
                overs: { type: Type.STRING },
                runRate: { type: Type.STRING },
                colorHex: { type: Type.STRING },
              },
            },
            batter1: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                runs: { type: Type.STRING },
                balls: { type: Type.STRING },
                fours: { type: Type.STRING },
                sixes: { type: Type.STRING },
                strikeRate: { type: Type.STRING },
                onStrike: { type: Type.BOOLEAN },
              },
            },
            batter2: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                runs: { type: Type.STRING },
                balls: { type: Type.STRING },
                fours: { type: Type.STRING },
                sixes: { type: Type.STRING },
                strikeRate: { type: Type.STRING },
                onStrike: { type: Type.BOOLEAN },
              },
            },
            bowler: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                overs: { type: Type.STRING },
                maidens: { type: Type.STRING },
                runs: { type: Type.STRING },
                wickets: { type: Type.STRING },
                economy: { type: Type.STRING },
              },
            },
          },
          required: ['detectedKind', 'confidenceNote'],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim()) as ImageExtractionResult;
    res.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to extract scoreboard data from image';
    res.status(500).json({ error: message });
  }
});

// Save or update a shareable Broadcast Overlay session
app.post('/api/broadcast/session', (req, res) => {
  try {
    const body = req.body as Partial<BroadcastSession>;
    if (!body || !body.match) {
      res.status(400).json({ error: 'Broadcast match state is required.' });
      return;
    }

    const sessionId =
      body.sessionId && SESSION_ID_REGEX.test(body.sessionId)
        ? body.sessionId
        : `rc-${crypto.randomBytes(4).toString('hex')}`;

    const sanitized = sanitizeSession({
      sessionId,
      match: body.match,
      backdropMode: body.backdropMode || 'template',
      selectedLayoutId: body.selectedLayoutId || 'free-classic',
      customBackdropUrl: body.customBackdropUrl,
      language: body.language || 'bilingual',
      autoRefresh: body.autoRefresh ?? true,
      updatedAt: new Date().toISOString(),
    });

    sessionStore.set(sessionId, sanitized);
    saveSessionsToDisk();

    res.json({ sessionId, session: sanitized });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save broadcast session';
    res.status(500).json({ error: message });
  }
});

// Retrieve a shareable Broadcast Overlay session
app.get('/api/broadcast/session/:id', (req, res) => {
  const { id } = req.params;
  if (!SESSION_ID_REGEX.test(id)) {
    res.status(400).json({ error: 'Invalid broadcast session ID.' });
    return;
  }

  const session = sessionStore.get(id);
  if (!session) {
    res.status(404).json({ error: 'Broadcast session not found.' });
    return;
  }

  res.json(session);
});

// =========================================================================
// Pro Layouts Licensing & Owner Admin Activation (Email-based + Scrypt Auth)
// =========================================================================
const LICENSES_FILE = path.join(os.tmpdir(), 'rizwan-cricket-licenses.json');
const ALL_PRO_LAYOUT_IDS = [
  'pro-champions-gold',
  'pro-psl-neon',
  'pro-crimson-arena',
  'pro-ultra-cyan',
  'pro-platinum-elite',
  'pro-royal-trophy',
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_SIGNING_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

interface CustomerLicenseRecord {
  email: string;
  unlockedLayoutIds: string[];
  active: boolean;
  note?: string;
  activatedAt: string;
}

interface LicenseStoreData {
  adminPasswordHash?: string;
  licenses: Record<string, CustomerLicenseRecord>;
}

let licenseStore: LicenseStoreData = { licenses: {} };

function loadLicensesFromDisk(): void {
  try {
    if (fs.existsSync(LICENSES_FILE)) {
      const raw = fs.readFileSync(LICENSES_FILE, 'utf8');
      const parsed = JSON.parse(raw) as LicenseStoreData;
      if (parsed && typeof parsed === 'object' && parsed.licenses) {
        licenseStore = {
          adminPasswordHash:
            typeof parsed.adminPasswordHash === 'string' ? parsed.adminPasswordHash : undefined,
          licenses: parsed.licenses,
        };
      }
    }
  } catch {
    licenseStore = { licenses: {} };
  }
}

function saveLicensesToDisk(): void {
  try {
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenseStore, null, 2), 'utf8');
  } catch {
    // Ignore ephemeral filesystem errors
  }
}

loadLicensesFromDisk();

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function timingSafeStringMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function signAdminBearerToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'owner-admin',
      exp: Date.now() + 12 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminBearerToken(authHeader?: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  if (!timingSafeStringMatch(sig, expectedSig)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === 'owner-admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!verifyAdminBearerToken(req.headers.authorization)) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  next();
}

// Admin configuration status check
app.get('/api/licenses/admin-status', (req, res) => {
  const envPass = process.env.ADMIN_PASSCODE?.trim() || '';
  const envControlled = envPass.length > 0;
  const claimed = envControlled || Boolean(licenseStore.adminPasswordHash);
  const isAdmin = verifyAdminBearerToken(req.headers.authorization);
  res.json({ envControlled, claimed, isAdmin });
});

// One-time atomic bootstrap route when ADMIN_PASSCODE env is unset and no admin hash exists yet
app.post('/api/admin/claim', (req, res) => {
  const envPass = process.env.ADMIN_PASSCODE?.trim() || '';
  if (envPass.length > 0 || licenseStore.adminPasswordHash) {
    res.status(403).json({ error: 'Admin password is already configured. Please sign in.' });
    return;
  }

  const { password } = req.body as { password?: string };
  if (!password || typeof password !== 'string' || password.trim().length < 6) {
    res.status(400).json({ error: 'Please choose an admin password of at least 6 characters.' });
    return;
  }

  licenseStore.adminPasswordHash = hashPasswordScrypt(password.trim());
  saveLicensesToDisk();

  res.json({
    token: signAdminBearerToken(),
    unlockedLayoutIds: ALL_PRO_LAYOUT_IDS,
  });
});

// Owner Admin Login -> unlocks all 5 Pro Layouts free & manages customer emails
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  const envPass = process.env.ADMIN_PASSCODE?.trim() || '';
  const cleanPass = password.trim();

  let ok = false;
  if (envPass.length > 0) {
    ok = timingSafeStringMatch(cleanPass, envPass);
  } else if (licenseStore.adminPasswordHash) {
    ok = verifyPasswordScrypt(cleanPass, licenseStore.adminPasswordHash);
  } else {
    res.status(409).json({ error: 'Admin password not yet claimed. Set your password first.' });
    return;
  }

  if (!ok) {
    res.status(401).json({ error: 'Incorrect admin password.' });
    return;
  }

  res.json({
    token: signAdminBearerToken(),
    unlockedLayoutIds: ALL_PRO_LAYOUT_IDS,
  });
});

// Public Visitor License Check by Email (only unlocks layouts activated by Admin)
app.post('/api/licenses/check', (req, res) => {
  const { email } = req.body as { email?: string };
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 160) {
    res.status(400).json({ error: 'براہ کرم درست ای میل ایڈریس درج کریں۔' });
    return;
  }

  const record = licenseStore.licenses[cleanEmail];
  if (!record || !record.active) {
    res.json({
      email: cleanEmail,
      active: false,
      unlockedLayoutIds: [],
    });
    return;
  }

  res.json({
    email: cleanEmail,
    active: true,
    unlockedLayoutIds: record.unlockedLayoutIds,
    activatedAt: record.activatedAt,
  });
});

// Protected Admin Routes: List, Activate, and Revoke customer emails
app.get('/api/admin/licenses', requireAdminAuth, (_req, res) => {
  const list = Object.values(licenseStore.licenses).sort((a, b) =>
    b.activatedAt.localeCompare(a.activatedAt)
  );
  res.json({ licenses: list });
});

app.post('/api/admin/licenses/activate', requireAdminAuth, (req, res) => {
  const { email, layoutIds, note } = req.body as {
    email?: string;
    layoutIds?: string[];
    note?: string;
  };
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 160) {
    res.status(400).json({ error: 'Please enter a valid customer email address.' });
    return;
  }

  const requestedIds = Array.isArray(layoutIds)
    ? layoutIds.filter((id) => ALL_PRO_LAYOUT_IDS.includes(id))
    : [];
  const finalLayoutIds = requestedIds.length > 0 ? requestedIds : [...ALL_PRO_LAYOUT_IDS];

  licenseStore.licenses[cleanEmail] = {
    email: cleanEmail,
    unlockedLayoutIds: finalLayoutIds,
    active: true,
    note: typeof note === 'string' ? note.trim().slice(0, 120) : undefined,
    activatedAt: new Date().toISOString(),
  };
  saveLicensesToDisk();

  const list = Object.values(licenseStore.licenses).sort((a, b) =>
    b.activatedAt.localeCompare(a.activatedAt)
  );
  res.json({ ok: true, licenses: list });
});

app.post('/api/admin/licenses/revoke', requireAdminAuth, (req, res) => {
  const { email } = req.body as { email?: string };
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !licenseStore.licenses[cleanEmail]) {
    res.status(404).json({ error: 'License email not found.' });
    return;
  }

  delete licenseStore.licenses[cleanEmail];
  saveLicensesToDisk();

  const list = Object.values(licenseStore.licenses).sort((a, b) =>
    b.activatedAt.localeCompare(a.activatedAt)
  );
  res.json({ ok: true, licenses: list });
});

// Direct YouTube Live RTMP Streaming via FFmpeg
interface ActiveRtmpStream {
  token: string;
  ffmpeg: ChildProcessWithoutNullStreams;
  status: 'connecting' | 'live' | 'error' | 'stopped';
  bytesSent: number;
  lastMessage: string;
  error?: string;
  startedAt: number;
  lastChunkAt: number;
}

const activeStreams = new Map<string, ActiveRtmpStream>();
const STREAM_KEY_REGEX = /^[a-zA-Z0-9_-]{8,120}$/;

function isAllowedRtmpServerUrl(rawUrl: string): boolean {
  try {
    if (!rawUrl || /\s/.test(rawUrl)) return false;
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'rtmp:' && parsed.protocol !== 'rtmps:') return false;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function scrubStreamSecrets(msg: string, streamKey: string): string {
  return msg.replaceAll(streamKey, '****').replace(/rtmps?:\/\/[^\s]+/gi, '[rtmp-server]');
}

// Idle cleanup for stale streams
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of activeStreams.entries()) {
    if (now - s.lastChunkAt > 25_000) {
      try {
        s.ffmpeg.stdin.end();
        s.ffmpeg.kill('SIGTERM');
      } catch {
        // ignore
      }
      activeStreams.delete(token);
    }
  }
}, 10_000);

app.post('/api/stream/start', (req, res) => {
  try {
    const { rtmpUrl, streamKey, hasAudio } = req.body as {
      rtmpUrl?: string;
      streamKey?: string;
      hasAudio?: boolean;
    };

    const targetBase = (rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2').trim().replace(/\/+$/, '');
    const cleanKey = (streamKey || '').trim();

    if (!isAllowedRtmpServerUrl(targetBase)) {
      res.status(400).json({ error: 'Invalid RTMP server URL. Use rtmp://a.rtmp.youtube.com/live2' });
      return;
    }
    if (!STREAM_KEY_REGEX.test(cleanKey)) {
      res.status(400).json({
        error: 'Invalid YouTube Stream Key format. Please paste your YouTube Studio stream key.',
      });
      return;
    }

    const token = crypto.randomBytes(16).toString('hex');
    const fullTarget = `${targetBase}/${cleanKey}`;

    const ffmpegArgs: string[] = [
      '-hide_banner',
      '-loglevel',
      'warning',
      '-fflags',
      '+genpts',
      '-f',
      'webm',
      '-i',
      'pipe:0',
    ];

    if (!hasAudio) {
      ffmpegArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    }

    ffmpegArgs.push(
      '-map',
      '0:v:0',
      '-map',
      hasAudio ? '0:a:0' : '1:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-tune',
      'zerolatency',
      '-b:v',
      '2500k',
      '-maxrate',
      '2500k',
      '-bufsize',
      '5000k',
      '-pix_fmt',
      'yuv420p',
      '-g',
      '60',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '44100',
      '-shortest',
      '-f',
      'flv',
      fullTarget
    );

    const ff = spawn('ffmpeg', ffmpegArgs, { shell: false });

    const entry: ActiveRtmpStream = {
      token,
      ffmpeg: ff,
      status: 'connecting',
      bytesSent: 0,
      lastMessage: 'Connecting to YouTube RTMP...',
      startedAt: Date.now(),
      lastChunkAt: Date.now(),
    };
    activeStreams.set(token, entry);

    ff.stderr.on('data', (chunk: Buffer) => {
      const text = scrubStreamSecrets(chunk.toString('utf8'), cleanKey).trim();
      if (!text) return;
      entry.lastMessage = text.slice(-240);
      if (/connection refused|timed out|invalid|error|failed|broken pipe/i.test(text)) {
        entry.status = 'error';
        entry.error = entry.lastMessage;
      }
    });

    ff.on('error', (err) => {
      entry.status = 'error';
      entry.error = scrubStreamSecrets(err.message, cleanKey);
    });

    ff.on('close', (code) => {
      if (entry.status !== 'stopped' && code !== 0) {
        entry.status = 'error';
        entry.error = entry.error || `Stream ended (exit code ${code})`;
      } else {
        entry.status = 'stopped';
      }
    });

    res.json({ streamToken: token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start live stream';
    res.status(500).json({ error: message });
  }
});

app.post(
  '/api/stream/chunk/:token',
  express.raw({ type: 'application/octet-stream', limit: '5mb' }),
  (req, res) => {
    const { token } = req.params;
    const entry = activeStreams.get(token);
    if (!entry) {
      res.status(404).json({ error: 'Stream session not found or stopped.' });
      return;
    }
    if (entry.status === 'error' || entry.status === 'stopped') {
      res.status(409).json({ error: entry.error || 'Stream is no longer active.' });
      return;
    }

    const buf = req.body as Buffer;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      res.status(400).json({ error: 'Empty media chunk.' });
      return;
    }

    entry.lastChunkAt = Date.now();
    entry.bytesSent += buf.length;
    if (entry.status === 'connecting' && entry.bytesSent > 16_384) {
      entry.status = 'live';
      entry.lastMessage = 'Streaming live to YouTube';
    }

    if (!entry.ffmpeg.stdin.destroyed) {
      entry.ffmpeg.stdin.write(buf);
    }

    res.json({ ok: true, bytesSent: entry.bytesSent, status: entry.status });
  }
);

app.get('/api/stream/status/:token', (req, res) => {
  const { token } = req.params;
  const entry = activeStreams.get(token);
  if (!entry) {
    res.status(404).json({ error: 'Stream not found.' });
    return;
  }
  res.json({
    status: entry.status,
    bytesSent: entry.bytesSent,
    lastMessage: entry.lastMessage,
    error: entry.error,
    elapsedSeconds: Math.floor((Date.now() - entry.startedAt) / 1000),
  });
});

app.post('/api/stream/stop/:token', (req, res) => {
  const { token } = req.params;
  const entry = activeStreams.get(token);
  if (!entry) {
    res.json({ ok: true });
    return;
  }
  entry.status = 'stopped';
  try {
    if (!entry.ffmpeg.stdin.destroyed) {
      entry.ffmpeg.stdin.end();
    }
    setTimeout(() => {
      try {
        entry.ffmpeg.kill('SIGTERM');
      } catch {
        // ignore
      }
      activeStreams.delete(token);
    }, 500);
  } catch {
    activeStreams.delete(token);
  }
  res.json({ ok: true });
});

async function startServer() {
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rizwan Cricket server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
