import React, { useRef, useState } from 'react';
import { Activity, Camera, Radio, RefreshCw, Tv, User, Zap } from 'lucide-react';
import { TeamFlag } from './TeamFlag';
import { getProLayoutById, type BoxRect, type BroadcastLayoutId } from '../data/layouts';
import type {
  BackdropMode,
  BowlerActionState,
  BroadcastLanguage,
  LiveCricketMatch,
} from '../types/cricket';

const toPctStyle = (r: BoxRect): React.CSSProperties => ({
  left: `${r.left}%`,
  top: `${r.top}%`,
  width: `${r.width}%`,
  height: `${r.height}%`,
});

export const DEFAULT_TEMPLATE_IMAGE =
  '/assets/aistudio/file_000000007998820897e6f781d7983c5e_6979af4c.png';
const DEFAULT_STADIUM_BACKDROP =
  '/src/assets/images/stadium_broadcast_backdrop_1795691786976.jpg';
const DEFAULT_BATTER1_PHOTO =
  '/src/assets/images/cartoon_batter_striker_1795693654803.jpg';
const DEFAULT_BATTER2_PHOTO =
  '/src/assets/images/cartoon_batter_nonstriker_1795693655838.jpg';
const DEFAULT_BOWLER_PHOTO =
  '/src/assets/images/cartoon_bowler_1795693656095.jpg';

export function getOverBoxSummary(overs: string, recentBalls: string[]): {
  headline: string;
  overNumber: string;
  isOverComplete: boolean;
  balls: string[];
  tone: 'six' | 'four' | 'wicket' | 'over' | 'normal';
} {
  const cleanOvers = (overs || '').trim();
  const balls = (recentBalls || []).slice(-6);
  const decimalPart = cleanOvers.includes('.') ? cleanOvers.split('.')[1] : '';
  const ballsInCurrentOver = decimalPart ? Number(decimalPart) : 0;

  const isOverComplete =
    cleanOvers !== '' &&
    cleanOvers !== '-' &&
    cleanOvers !== '0' &&
    cleanOvers !== '0.0' &&
    (!cleanOvers.includes('.') || decimalPart === '0');

  const overNumber =
    cleanOvers && cleanOvers !== '-'
      ? cleanOvers.includes('.')
        ? cleanOvers
        : `${cleanOvers}.0`
      : '0.0';

  const activeBalls =
    !isOverComplete && ballsInCurrentOver > 0 && balls.length >= ballsInCurrentOver
      ? balls.slice(-ballsInCurrentOver)
      : balls;
  const lastBall = (activeBalls[activeBalls.length - 1] || '').trim().toUpperCase();

  if (lastBall === '6') {
    return { headline: '6 RUNS', overNumber, isOverComplete, balls: activeBalls, tone: 'six' };
  }
  if (lastBall === '4') {
    return { headline: '4 RUNS', overNumber, isOverComplete, balls: activeBalls, tone: 'four' };
  }
  if (lastBall === 'W') {
    return { headline: 'WICKET!', overNumber, isOverComplete, balls: activeBalls, tone: 'wicket' };
  }
  if (lastBall === '1') {
    return { headline: '1 RUN', overNumber, isOverComplete, balls: activeBalls, tone: 'normal' };
  }
  if (lastBall === '2') {
    return { headline: '2 RUNS', overNumber, isOverComplete, balls: activeBalls, tone: 'normal' };
  }
  if (lastBall === '3') {
    return { headline: '3 RUNS', overNumber, isOverComplete, balls: activeBalls, tone: 'normal' };
  }
  if (lastBall === '5') {
    return { headline: '5 RUNS', overNumber, isOverComplete, balls: activeBalls, tone: 'normal' };
  }
  if (lastBall === '0' || lastBall === '•' || lastBall === '.') {
    return { headline: '0 RUNS', overNumber, isOverComplete, balls: activeBalls, tone: 'normal' };
  }
  if (lastBall.includes('WD')) {
    return { headline: 'WIDE', overNumber, isOverComplete, balls: activeBalls, tone: 'over' };
  }
  if (lastBall.includes('NB')) {
    return { headline: 'NO BALL', overNumber, isOverComplete, balls: activeBalls, tone: 'over' };
  }
  if (lastBall) {
    return { headline: `${lastBall} RUNS`, overNumber, isOverComplete, balls: activeBalls, tone: 'normal' };
  }

  return {
    headline: isOverComplete ? 'OVER' : 'LIVE',
    overNumber,
    isOverComplete,
    balls: activeBalls,
    tone: isOverComplete ? 'over' : 'normal',
  };
}

export function resolveBowlerActionBadge(match: LiveCricketMatch | null): {
  text: string;
  tone: 'running' | 'injury' | 'free_hit' | 'break';
} | null {
  if (!match) return null;

  const override = match.bowlerActionOverride;
  if (override === 'injury') return { text: 'INJURY', tone: 'injury' };
  if (override === 'bowler_running') return { text: 'BOWLER RUNNING', tone: 'running' };
  if (override === 'free_hit') return { text: 'FREE HIT', tone: 'free_hit' };

  if (match.detectedActionStatus === 'injury') {
    return { text: 'INJURY', tone: 'injury' };
  }
  if (match.detectedActionStatus === 'free_hit') {
    return { text: 'FREE HIT', tone: 'free_hit' };
  }
  if (match.detectedActionStatus === 'break') {
    const clean = (match.status || 'BREAK').toUpperCase();
    return { text: clean.length > 22 ? `${clean.slice(0, 20)}...` : clean, tone: 'break' };
  }
  if (match.isLive) {
    return { text: 'BOWLER RUNNING', tone: 'running' };
  }
  return null;
}

interface PlayerPortraitProps {
  src?: string;
  fallbackSrc: string;
  alt: string;
  accentColor: string;
  editable?: boolean;
  uploadLabel?: string;
  className?: string;
  onUploadPhoto?: (dataUrl: string) => void;
}

const PlayerPortrait: React.FC<PlayerPortraitProps> = ({
  src,
  fallbackSrc,
  alt,
  accentColor,
  editable,
  uploadLabel,
  className,
  onUploadPhoto,
}) => {
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedSrc = !imgError ? src || fallbackSrc : undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadPhoto) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImgError(false);
        onUploadPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className={
        className ||
        'relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#121821]'
      }
      style={{ boxShadow: `inset 0 -3px 0 0 ${accentColor}` }}
    >
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400">
          <User className="h-7 w-7" aria-hidden="true" />
        </div>
      )}

      {editable && onUploadPhoto && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-label={uploadLabel || `Upload photo for ${alt}`}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title={uploadLabel || 'Upload photo'}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 text-[10px] font-medium text-white cursor-pointer"
          >
            <Camera className="h-4 w-4 mb-0.5" aria-hidden="true" />
            <span>تصویر</span>
          </button>
        </>
      )}
    </div>
  );
};

interface BroadcastStageProps {
  match: LiveCricketMatch | null;
  loading: boolean;
  backdropMode: BackdropMode;
  selectedLayoutId?: BroadcastLayoutId;
  customBackdropUrl?: string;
  language: BroadcastLanguage;
  isOverlayMode?: boolean;
  isRefreshingDetail?: boolean;
  onRefreshMatch?: () => void;
  onOpenYouTubeLive?: () => void;
  onUpdatePlayerPhoto?: (role: 'batter1' | 'batter2' | 'bowler', dataUrl: string) => void;
  onChangeActionOverride?: (state: BowlerActionState) => void;
}

export const BroadcastStage: React.FC<BroadcastStageProps> = ({
  match,
  loading,
  backdropMode,
  selectedLayoutId = 'free-classic',
  customBackdropUrl,
  language,
  isOverlayMode = false,
  isRefreshingDetail = false,
  onRefreshMatch,
  onOpenYouTubeLive,
  onUpdatePlayerPhoto,
  onChangeActionOverride,
}) => {
  const [bgError, setBgError] = useState(false);

  const labels = {
    live: language === 'en' ? 'LIVE' : 'لائیو',
    overs: language === 'en' ? 'OVERS' : 'اوورز',
    crr: language === 'en' ? 'CRR' : 'رن ریٹ',
    target: language === 'en' ? 'TARGET' : 'ہدف',
    thisOver: language === 'en' ? 'THIS OVER' : 'موجودہ اوور',
    batting: language === 'en' ? 'BATTING' : 'بیٹنگ',
    bowling: language === 'en' ? 'BOWLING' : 'باؤلنگ',
  };

  const getBallClass = (ball: string) => {
    const clean = ball.trim().toUpperCase();
    if (clean === 'W' || clean.includes('W')) return 'bg-red-600 text-white border-red-400/50';
    if (clean === '6') return 'bg-emerald-600 text-white border-emerald-400/50';
    if (clean === '4') return 'bg-blue-600 text-white border-blue-400/50';
    return 'bg-slate-800/90 text-slate-200 border-white/15';
  };

  const team1Color = match?.team1?.colorHex || '#1D4ED8';
  const team2Color = match?.team2?.colorHex || '#016B3A';

  // Determine active batting overs for center OVER box in template mode
  const activeBattingOvers = match?.team2.isBatting
    ? match.team2.overs
    : match?.team1.overs || '0.0';

  const isDefaultTemplateTeams =
    match &&
    ((match.team1.name.toLowerCase().includes('india a') &&
      match.team2.name.toLowerCase().includes('sri lanka a')) ||
      (match.team1.name.toLowerCase().includes('sri lanka a') &&
        match.team2.name.toLowerCase().includes('india a')));

  const templateLeftTeam =
    match &&
    isDefaultTemplateTeams &&
    match.team1.name.toLowerCase().includes('sri lanka a')
      ? match.team2
      : match?.team1;
  const templateRightTeam =
    match && templateLeftTeam === match.team2 ? match.team1 : match?.team2;
  const overBoxSummary = match
    ? getOverBoxSummary(activeBattingOvers, match.recentBalls)
    : null;
  const actionBadge = resolveBowlerActionBadge(match);

  // Render the exact pixel-mapped Graphic Template Layout when backdropMode === 'template'
  if (backdropMode === 'template') {
    const proPreset =
      selectedLayoutId !== 'free-classic' ? getProLayoutById(selectedLayoutId) : undefined;
    const templateSrc = customBackdropUrl || proPreset?.imageUrl || DEFAULT_TEMPLATE_IMAGE;

    return (
      <section
        id="broadcast-stage"
        aria-label="Live Cricket Template Broadcast Stage"
        className={
          isOverlayMode
            ? 'relative flex min-h-screen w-full items-center justify-center bg-black p-2 sm:p-4'
            : 'relative w-full space-y-3'
        }
      >
        {/* Studio Toolbar directly above template */}
        {!isOverlayMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#121821] px-4 py-2.5">
            <div className="flex items-center gap-3 text-xs text-slate-300 min-w-0">
              <span className="font-display text-base font-bold text-white truncate">
                {match?.tournament || 'رضوان کرکٹ لائیو براڈکاسٹ'}
              </span>
              {match?.venue && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="hidden sm:inline truncate text-slate-400">{match.venue}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onChangeActionOverride && match && (
                <div
                  className="inline-flex items-center rounded-lg border border-white/10 bg-[#0B0F14] p-0.5 text-[11px] font-semibold"
                  role="group"
                  aria-label="Live Bowler Action Status"
                >
                  {(
                    [
                      { id: 'auto', label: 'آٹو' },
                      { id: 'bowler_running', label: 'Bowler Running' },
                      { id: 'injury', label: 'Injury' },
                    ] as const
                  ).map((item) => {
                    const active = (match.bowlerActionOverride || 'auto') === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangeActionOverride(item.id)}
                        className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                          active
                            ? item.id === 'injury'
                              ? 'bg-red-600 text-white'
                              : 'bg-sky-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {onRefreshMatch && match && (
                <button
                  type="button"
                  onClick={onRefreshMatch}
                  disabled={isRefreshingDetail}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1A222E] px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-[#232D3D] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingDetail ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>لائیو اسکور اپ ڈیٹ</span>
                </button>
              )}

              {onOpenYouTubeLive && (
                <button
                  type="button"
                  onClick={onOpenYouTubeLive}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>YouTube پر لائیو کریں</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 16:9 Pixel-Aligned Graphic Template Canvas */}
        <div
          className={`relative w-full aspect-video overflow-hidden rounded-xl border border-white/15 bg-[#050912] select-none ${
            isOverlayMode ? 'mx-auto max-w-[1440px] shadow-2xl' : ''
          }`}
        >
          {!bgError ? (
            <img
              src={templateSrc}
              alt="Cricket live broadcast graphic layout"
              referrerPolicy="no-referrer"
              onError={() => setBgError(true)}
              className="absolute inset-0 h-full w-full object-fill"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black" />
          )}

          {loading && !match ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <Tv className="h-8 w-8 text-emerald-400 mb-2 animate-pulse" aria-hidden="true" />
              <p className="font-display text-2xl font-bold text-white">
                لائیو کرکٹ ڈیٹا لوڈ ہو رہا ہے...
              </p>
            </div>
          ) : match && proPreset ? (
            <div className="absolute inset-0 z-10">
              {/* Pro Layout Dynamic Country Flags */}
              <div
                className="absolute overflow-hidden rounded-[6px] shadow-md"
                style={toPctStyle(proPreset.coords.leftFlag)}
              >
                <TeamFlag
                  teamName={match.team1.name}
                  flagCode={match.team1.flagCode || match.team1.shortName}
                  colorHex={match.team1.colorHex || team1Color}
                />
              </div>
              <div
                className="absolute overflow-hidden rounded-[6px] shadow-md"
                style={toPctStyle(proPreset.coords.rightFlag)}
              >
                <TeamFlag
                  teamName={match.team2.name}
                  flagCode={match.team2.flagCode || match.team2.shortName}
                  colorHex={match.team2.colorHex || team2Color}
                />
              </div>

              {/* Optional Top Team Name Banners (covers baked-in team names if present) */}
              {proPreset.coords.leftTeamBanner && (
                <div
                  className="absolute flex items-center justify-center rounded px-2 text-center"
                  style={{
                    ...toPctStyle(proPreset.coords.leftTeamBanner),
                    background: `linear-gradient(180deg, ${match.team1.colorHex || team1Color} 0%, #07225A 100%)`,
                  }}
                >
                  <span className="font-display text-[clamp(10px,1.9vw,26px)] font-extrabold uppercase tracking-wide text-white truncate drop-shadow">
                    {match.team1.name}
                  </span>
                </div>
              )}

              {proPreset.coords.rightTeamBanner && (
                <div
                  className="absolute flex items-center justify-center rounded px-2 text-center"
                  style={{
                    ...toPctStyle(proPreset.coords.rightTeamBanner),
                    background: `linear-gradient(180deg, ${match.team2.colorHex || team2Color} 0%, #680909 100%)`,
                  }}
                >
                  <span className="font-display text-[clamp(10px,1.9vw,26px)] font-extrabold uppercase tracking-wide text-white truncate drop-shadow">
                    {match.team2.name}
                  </span>
                </div>
              )}

              {/* Team 1 Name + Score */}
              <div
                className="absolute flex flex-col items-center justify-center px-1.5 text-center"
                style={toPctStyle(proPreset.coords.leftScore)}
              >
                {!proPreset.coords.leftTeamBanner && (
                  <div className="font-display text-[clamp(9px,1.45vw,21px)] font-extrabold uppercase tracking-wide text-slate-100 truncate max-w-full drop-shadow">
                    {match.team1.name}
                  </div>
                )}
                <div className="font-display text-[clamp(16px,3.2vw,46px)] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">
                  {match.team1.runs !== '-'
                    ? `${match.team1.runs}/${match.team1.wickets}`
                    : 'YET TO BAT'}
                </div>
                <div className="mt-0.5 font-mono-tabular text-[clamp(7px,0.85vw,12px)] font-bold text-sky-200 truncate max-w-full">
                  {match.team1.runs !== '-'
                    ? `OV: ${match.team1.overs} · CRR: ${match.team1.runRate}`
                    : match.team1.shortName}
                </div>
              </div>

              {/* Team 2 Name + Score */}
              <div
                className="absolute flex flex-col items-center justify-center px-1.5 text-center"
                style={toPctStyle(proPreset.coords.rightScore)}
              >
                {!proPreset.coords.rightTeamBanner && (
                  <div className="font-display text-[clamp(9px,1.45vw,21px)] font-extrabold uppercase tracking-wide text-slate-100 truncate max-w-full drop-shadow">
                    {match.team2.name}
                  </div>
                )}
                <div className="font-display text-[clamp(16px,3.2vw,46px)] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">
                  {match.team2.runs !== '-'
                    ? `${match.team2.runs}/${match.team2.wickets}`
                    : 'YET TO BAT'}
                </div>
                <div className="mt-0.5 font-mono-tabular text-[clamp(7px,0.85vw,12px)] font-bold text-amber-100 truncate max-w-full">
                  {match.team2.runs !== '-'
                    ? `OV: ${match.team2.overs} · CRR: ${match.team2.runRate}`
                    : match.target
                      ? `TARGET: ${match.target}`
                      : match.team2.shortName}
                </div>
              </div>

              {/* Center LIVE Badge */}
              <div
                className="absolute flex items-center justify-center"
                style={toPctStyle(proPreset.coords.centerLive)}
              >
                <span className="inline-flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-0.5 font-display text-[clamp(8px,1.1vw,15px)] font-black tracking-widest text-white shadow">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              </div>

              {/* Center Animated Ball Runs / Wicket Box */}
              <div
                key={`pro-ev-${match.id}-${overBoxSummary?.overNumber}-${overBoxSummary?.headline}`}
                className={`absolute flex items-center justify-center overflow-hidden rounded-md px-2 text-center ${
                  overBoxSummary?.tone === 'six'
                    ? 'border border-emerald-400/70 shadow-[0_0_22px_rgba(16,185,129,0.55)]'
                    : overBoxSummary?.tone === 'four'
                      ? 'border border-sky-400/70 shadow-[0_0_20px_rgba(14,165,233,0.5)]'
                      : overBoxSummary?.tone === 'wicket'
                        ? 'border border-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.65)]'
                        : 'border border-white/15'
                }`}
                style={{
                  ...toPctStyle(proPreset.coords.centerRuns),
                  background:
                    overBoxSummary?.tone === 'six'
                      ? 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.62) 0%, rgba(245,158,11,0.34) 50%, rgba(4,10,20,0.94) 95%)'
                      : overBoxSummary?.tone === 'four'
                        ? 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.64) 0%, rgba(37,99,235,0.36) 52%, rgba(4,10,20,0.94) 95%)'
                        : overBoxSummary?.tone === 'wicket'
                          ? 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.72) 0%, rgba(153,27,27,0.42) 52%, rgba(12,4,8,0.96) 95%)'
                          : 'radial-gradient(circle at 50% 50%, rgba(30,64,175,0.45) 0%, rgba(5,10,21,0.92) 90%)',
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-sheen-sweep"
                />
                <span
                  className={`relative z-10 animate-broadcast-pop font-display text-[clamp(14px,2.7vw,38px)] font-black uppercase leading-none tracking-tight tabular-nums ${
                    overBoxSummary?.tone === 'six'
                      ? 'text-emerald-200'
                      : overBoxSummary?.tone === 'four'
                        ? 'text-sky-200'
                        : overBoxSummary?.tone === 'wicket'
                          ? 'text-white'
                          : 'text-white'
                  }`}
                >
                  {overBoxSummary?.headline}
                </span>
              </div>

              {/* Center OVER Box */}
              <div
                className="absolute flex items-center justify-center gap-1.5 rounded bg-[#060B15]/90 border border-amber-400/50 px-2"
                style={toPctStyle(proPreset.coords.centerOver)}
              >
                <span className="rounded bg-amber-400 px-1.5 py-0.5 font-display text-[clamp(8px,1.05vw,15px)] font-black uppercase leading-none text-[#09111E]">
                  OVER
                </span>
                <span className="font-mono-tabular text-[clamp(9px,1.2vw,17px)] font-extrabold text-white tabular-nums">
                  {overBoxSummary?.overNumber}
                </span>
                {overBoxSummary && overBoxSummary.balls.length > 0 && (
                  <span className="hidden md:inline font-mono-tabular text-[clamp(8px,0.85vw,11px)] font-bold text-amber-200 truncate">
                    · {overBoxSummary.balls.slice(-4).join(' ')}
                  </span>
                )}
              </div>

              {/* Center BOWLER RUNNING / INJURY Strip */}
              {actionBadge && (
                <div
                  key={`pro-act-${match.id}-${actionBadge.text}`}
                  className={`absolute flex items-center justify-center gap-1.5 overflow-hidden rounded-md px-2 text-center ${
                    actionBadge.tone === 'injury'
                      ? 'border border-red-400/80 bg-[#7F1D1D]/95 shadow-[0_0_18px_rgba(239,68,68,0.55)]'
                      : actionBadge.tone === 'free_hit'
                        ? 'border border-amber-400/80 bg-[#78350F]/95'
                        : 'border border-sky-400/60 bg-[#082042]/95 shadow-[0_0_16px_rgba(56,189,248,0.35)]'
                  }`}
                  style={toPctStyle(proPreset.coords.centerAction)}
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      actionBadge.tone === 'injury'
                        ? 'bg-red-300 animate-pulse'
                        : 'bg-emerald-400 animate-ping'
                    }`}
                  />
                  <span className="font-display text-[clamp(8px,1.3vw,18px)] font-black uppercase tracking-wider text-white truncate">
                    {actionBadge.text}
                  </span>
                </div>
              )}

              {/* Striker Card + Stats */}
              <div
                className="absolute flex items-center gap-2 px-2"
                style={toPctStyle(proPreset.coords.batter1Card)}
              >
                <PlayerPortrait
                  src={match.batter1.photoUrl}
                  fallbackSrc={DEFAULT_BATTER1_PHOTO}
                  alt={match.batter1.name}
                  accentColor={proPreset.accentHex}
                  editable={!isOverlayMode}
                  uploadLabel="اسٹرائیکر تصویر اپلوڈ کریں"
                  className="relative h-[86%] aspect-square shrink-0 overflow-hidden rounded-lg border-2 border-white/40 bg-[#091836]"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('batter1', url)
                      : undefined
                  }
                />
                <div className="flex-1 min-w-0 text-center">
                  <div className="font-display text-[clamp(9px,1.25vw,18px)] font-bold uppercase text-white truncate">
                    {match.batter1.name}
                    {match.batter1.onStrike ? ' *' : ''}
                  </div>
                  <div className="font-display text-[clamp(18px,3.2vw,46px)] font-black leading-none text-white tabular-nums drop-shadow">
                    {match.batter1.runs}
                  </div>
                  <div className="font-mono-tabular text-[clamp(8px,0.95vw,13px)] font-bold text-sky-200">
                    ({match.batter1.balls} balls)
                  </div>
                </div>
              </div>
              <div
                className="absolute flex items-center justify-around px-2 font-mono-tabular text-[clamp(7px,0.95vw,13px)] font-bold text-amber-300"
                style={toPctStyle(proPreset.coords.batter1Stats)}
              >
                <span>4s: <span className="text-white">{match.batter1.fours}</span></span>
                <span>6s: <span className="text-white">{match.batter1.sixes}</span></span>
                <span>SR: <span className="text-white">{match.batter1.strikeRate}</span></span>
              </div>

              {/* Non-Striker Card + Stats */}
              <div
                className="absolute flex items-center gap-2 px-2"
                style={toPctStyle(proPreset.coords.batter2Card)}
              >
                <PlayerPortrait
                  src={match.batter2.photoUrl}
                  fallbackSrc={DEFAULT_BATTER2_PHOTO}
                  alt={match.batter2.name}
                  accentColor={proPreset.accentHex}
                  editable={!isOverlayMode}
                  uploadLabel="نان اسٹرائیکر تصویر اپلوڈ کریں"
                  className="relative h-[86%] aspect-square shrink-0 overflow-hidden rounded-lg border-2 border-white/40 bg-[#091836]"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('batter2', url)
                      : undefined
                  }
                />
                <div className="flex-1 min-w-0 text-center">
                  <div className="font-display text-[clamp(9px,1.25vw,18px)] font-bold uppercase text-white truncate">
                    {match.batter2.name}
                    {match.batter2.onStrike ? ' *' : ''}
                  </div>
                  <div className="font-display text-[clamp(18px,3.2vw,46px)] font-black leading-none text-white tabular-nums drop-shadow">
                    {match.batter2.runs}
                  </div>
                  <div className="font-mono-tabular text-[clamp(8px,0.95vw,13px)] font-bold text-sky-200">
                    ({match.batter2.balls} balls)
                  </div>
                </div>
              </div>
              <div
                className="absolute flex items-center justify-around px-2 font-mono-tabular text-[clamp(7px,0.95vw,13px)] font-bold text-amber-300"
                style={toPctStyle(proPreset.coords.batter2Stats)}
              >
                <span>4s: <span className="text-white">{match.batter2.fours}</span></span>
                <span>6s: <span className="text-white">{match.batter2.sixes}</span></span>
                <span>SR: <span className="text-white">{match.batter2.strikeRate}</span></span>
              </div>

              {/* Bowler Card + Stats */}
              <div
                className="absolute flex items-center gap-2 px-2"
                style={toPctStyle(proPreset.coords.bowlerCard)}
              >
                <PlayerPortrait
                  src={match.bowler.photoUrl}
                  fallbackSrc={DEFAULT_BOWLER_PHOTO}
                  alt={match.bowler.name}
                  accentColor="#FBBF24"
                  editable={!isOverlayMode}
                  uploadLabel="بالر کی تصویر اپلوڈ کریں"
                  className="relative h-[86%] aspect-square shrink-0 overflow-hidden rounded-lg border-2 border-amber-300/60 bg-[#2C2103]"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('bowler', url)
                      : undefined
                  }
                />
                <div className="flex-1 min-w-0 text-center">
                  <div className="font-display text-[clamp(10px,1.4vw,20px)] font-extrabold uppercase text-white truncate">
                    {match.bowler.name}
                  </div>
                  <div className="font-display text-[clamp(16px,2.5vw,34px)] font-black leading-none text-amber-200 tabular-nums">
                    {match.bowler.wickets}-{match.bowler.runs}
                  </div>
                  <div className="font-mono-tabular text-[clamp(8px,0.9vw,12px)] font-bold text-amber-100">
                    O: {match.bowler.overs} · M: {match.bowler.maidens}
                  </div>
                </div>
              </div>
              <div
                className="absolute flex items-center justify-around px-2 font-mono-tabular text-[clamp(7px,0.95vw,13px)] font-bold text-white"
                style={toPctStyle(proPreset.coords.bowlerStats)}
              >
                <span>ECON: <span className="text-amber-300">{match.bowler.economy}</span></span>
                <span>OV: <span className="text-amber-300">{match.bowler.overs}</span></span>
              </div>

              {/* Bottom Ticker */}
              <div
                className={`absolute flex items-center justify-between gap-3 px-3 ${
                  proPreset.tickerBg ? 'rounded' : ''
                }`}
                style={{
                  ...toPctStyle(proPreset.coords.ticker),
                  ...(proPreset.tickerBg ? { backgroundColor: proPreset.tickerBg } : {}),
                }}
              >
                <span className="font-display text-[clamp(8px,1.15vw,16px)] font-bold uppercase tracking-wide text-amber-300 truncate">
                  LAST WKT: <span className="text-white">{match.lastWicket || match.equation || match.status}</span>
                </span>
                <span className="hidden sm:inline font-mono-tabular text-[clamp(7px,0.9vw,12px)] font-semibold text-sky-300 shrink-0">
                  {match.status}
                </span>
              </div>
            </div>
          ) : match && templateLeftTeam && templateRightTeam ? (
            <div className="absolute inset-0 z-10">
              {/* Dynamic Team Flags on Left & Right Flag Bezels */}
              <div
                className="absolute overflow-hidden rounded-[6px] shadow-inner"
                style={{ left: '0.52%', top: '2.25%', width: '9.05%', height: '15.8%' }}
              >
                <TeamFlag
                  teamName={templateLeftTeam.name}
                  flagCode={templateLeftTeam.flagCode || templateLeftTeam.shortName}
                  colorHex={templateLeftTeam.colorHex || team1Color}
                  className="h-full w-full object-cover"
                />
              </div>

              <div
                className="absolute overflow-hidden rounded-[6px] shadow-inner"
                style={{ left: '90.42%', top: '2.25%', width: '9.05%', height: '15.8%' }}
              >
                <TeamFlag
                  teamName={templateRightTeam.name}
                  flagCode={templateRightTeam.flagCode || templateRightTeam.shortName}
                  colorHex={templateRightTeam.colorHex || team2Color}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Auto-replace Team 1 & Team 2 header banners if match is NOT India A vs Sri Lanka A */}
              {!isDefaultTemplateTeams && (
                <>
                  <div
                    className="absolute flex items-center justify-center px-2 rounded-t-md"
                    style={{
                      left: '10.6%',
                      top: '2.0%',
                      width: '26.6%',
                      height: '8.8%',
                      background: `linear-gradient(180deg, ${templateLeftTeam.colorHex || team1Color} 0%, #0A2E7A 100%)`,
                    }}
                  >
                    <span className="font-display text-[clamp(11px,2.2vw,30px)] font-extrabold uppercase tracking-wide text-white truncate drop-shadow">
                      {templateLeftTeam.name}
                    </span>
                  </div>

                  <div
                    className="absolute flex items-center justify-center px-2 rounded-t-md"
                    style={{
                      left: '62.6%',
                      top: '2.0%',
                      width: '26.6%',
                      height: '8.8%',
                      background: `linear-gradient(180deg, ${templateRightTeam.colorHex || team2Color} 0%, #7A5C00 100%)`,
                    }}
                  >
                    <span className="font-display text-[clamp(11px,2.2vw,30px)] font-extrabold uppercase tracking-wide text-white truncate drop-shadow">
                      {templateRightTeam.name}
                    </span>
                  </div>
                </>
              )}

              {/* Team 1 Score Box (under Left Team header) */}
              <div
                className="absolute flex flex-col items-center justify-center px-2 text-center"
                style={{ left: '11.2%', top: '12.5%', width: '25.4%', height: '12.2%' }}
              >
                <div className="font-display text-[clamp(20px,3.8vw,56px)] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">
                  {templateLeftTeam.runs !== '-'
                    ? `${templateLeftTeam.runs}/${templateLeftTeam.wickets}`
                    : 'YET TO BAT'}
                </div>
                <div className="mt-0.5 font-mono-tabular text-[clamp(8px,0.95vw,13px)] font-bold text-blue-100">
                  {templateLeftTeam.runs !== '-'
                    ? `OV: ${templateLeftTeam.overs}  ·  CRR: ${templateLeftTeam.runRate}`
                    : templateLeftTeam.shortName}
                </div>
              </div>

              {/* BIG Top-Center Ball Runs / Wicket Callout with Dynamic Broadcast Effect */}
              <div
                key={`event-${match.id}-${overBoxSummary?.overNumber}-${overBoxSummary?.headline}`}
                className={`absolute flex items-center justify-center overflow-hidden rounded-md px-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ${
                  overBoxSummary?.tone === 'six'
                    ? 'border border-emerald-400/70 shadow-[0_0_24px_rgba(16,185,129,0.55)]'
                    : overBoxSummary?.tone === 'four'
                      ? 'border border-sky-400/70 shadow-[0_0_22px_rgba(14,165,233,0.5)]'
                      : overBoxSummary?.tone === 'wicket'
                        ? 'border border-red-500/80 shadow-[0_0_26px_rgba(239,68,68,0.65)]'
                        : overBoxSummary?.tone === 'over'
                          ? 'border border-amber-400/60 shadow-[0_0_18px_rgba(245,158,11,0.4)]'
                          : 'border border-white/15 bg-gradient-to-b from-[#040812] via-[#0B1528] to-[#050A15]'
                }`}
                style={{
                  left: '38.3%',
                  top: '9.4%',
                  width: '23.4%',
                  height: '10.0%',
                  background:
                    overBoxSummary?.tone === 'six'
                      ? 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.62) 0%, rgba(245,158,11,0.34) 48%, rgba(4,10,20,0.96) 95%)'
                      : overBoxSummary?.tone === 'four'
                        ? 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.64) 0%, rgba(37,99,235,0.36) 52%, rgba(4,10,20,0.96) 95%)'
                        : overBoxSummary?.tone === 'wicket'
                          ? 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.72) 0%, rgba(153,27,27,0.42) 52%, rgba(12,4,8,0.97) 95%)'
                          : overBoxSummary?.tone === 'over'
                            ? 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.5) 0%, rgba(120,53,15,0.3) 55%, rgba(6,10,20,0.96) 95%)'
                            : 'radial-gradient(circle at 50% 50%, rgba(30,64,175,0.42) 0%, rgba(5,10,21,0.96) 88%)',
                }}
              >
                {/* Animated stadium burst rays behind 6 / 4 / WICKET */}
                {(overBoxSummary?.tone === 'six' ||
                  overBoxSummary?.tone === 'four' ||
                  overBoxSummary?.tone === 'wicket') && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-[-40%] animate-event-glow opacity-45"
                    style={{
                      background:
                        overBoxSummary.tone === 'six'
                          ? 'repeating-conic-gradient(from 0deg, rgba(251,191,36,0.35) 0deg 12deg, transparent 12deg 24deg)'
                          : overBoxSummary.tone === 'four'
                            ? 'repeating-conic-gradient(from 0deg, rgba(56,189,248,0.35) 0deg 12deg, transparent 12deg 24deg)'
                            : 'repeating-conic-gradient(from 0deg, rgba(248,113,113,0.42) 0deg 12deg, transparent 12deg 24deg)',
                    }}
                  />
                )}

                {/* Sweeping broadcast light sheen on every ball */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-sheen-sweep"
                />

                <span
                  className={`relative z-10 animate-broadcast-pop font-display text-[clamp(16px,3.2vw,46px)] font-black uppercase leading-none tracking-tight tabular-nums ${
                    overBoxSummary?.tone === 'six'
                      ? 'text-emerald-200 drop-shadow-[0_0_14px_rgba(16,185,129,0.95)]'
                      : overBoxSummary?.tone === 'four'
                        ? 'text-sky-200 drop-shadow-[0_0_14px_rgba(56,189,248,0.95)]'
                        : overBoxSummary?.tone === 'wicket'
                          ? 'text-white drop-shadow-[0_0_16px_rgba(239,68,68,1)]'
                          : overBoxSummary?.tone === 'over'
                            ? 'text-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.75)]'
                            : 'text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]'
                  }`}
                >
                  {overBoxSummary?.headline}
                </span>
              </div>

              {/* Small Gold-Bordered Box Underneath: Stylish OVER label + over number */}
              <div
                className="absolute flex items-center justify-center gap-1.5 sm:gap-2 px-2 text-center"
                style={{ left: '38.8%', top: '20.5%', width: '22.4%', height: '5.4%' }}
              >
                <span
                  className={`rounded px-1.5 py-0.5 font-display text-[clamp(9px,1.25vw,18px)] font-black uppercase tracking-wider leading-none ${
                    overBoxSummary?.isOverComplete
                      ? 'bg-amber-400 text-[#09111E] shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                      : 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#09111E]'
                  }`}
                >
                  OVER
                </span>
                <span className="font-mono-tabular text-[clamp(10px,1.4vw,20px)] font-extrabold text-white tabular-nums drop-shadow">
                  {overBoxSummary?.overNumber}
                </span>
                {overBoxSummary && overBoxSummary.balls.length > 0 && (
                  <span className="hidden md:inline font-mono-tabular text-[clamp(8px,0.9vw,12px)] font-bold text-amber-200/90 truncate">
                    · {overBoxSummary.balls.slice(-4).join(' ')}
                  </span>
                )}
              </div>

              {/* Empty Center Space Below OVER Box: BOWLER RUNNING / INJURY Strip */}
              {actionBadge && (
                <div
                  key={`action-${match.id}-${actionBadge.text}`}
                  className={`absolute flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden rounded-md px-2.5 text-center backdrop-blur-sm ${
                    actionBadge.tone === 'injury'
                      ? 'border border-red-400/80 bg-gradient-to-r from-[#3B080D]/95 via-[#991B1B]/95 to-[#3B080D]/95 shadow-[0_0_20px_rgba(239,68,68,0.55)]'
                      : actionBadge.tone === 'free_hit'
                        ? 'border border-amber-400/80 bg-gradient-to-r from-[#2E1E04]/95 via-[#92400E]/95 to-[#2E1E04]/95 shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                        : actionBadge.tone === 'break'
                          ? 'border border-slate-400/50 bg-[#0B1322]/90'
                          : 'border border-sky-400/60 bg-gradient-to-r from-[#061224]/95 via-[#0B2A52]/95 to-[#061224]/95 shadow-[0_0_18px_rgba(56,189,248,0.35)]'
                  }`}
                  style={{ left: '37.8%', top: '27.2%', width: '24.4%', height: '5.6%' }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-sheen-sweep"
                  />
                  {actionBadge.tone === 'injury' ? (
                    <Activity
                      className="relative z-10 h-[clamp(10px,1.3vw,18px)] w-[clamp(10px,1.3vw,18px)] text-red-200 animate-pulse shrink-0"
                      aria-hidden="true"
                    />
                  ) : actionBadge.tone === 'running' ? (
                    <span className="relative z-10 flex items-center gap-1 shrink-0" aria-hidden="true">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <Zap className="h-[clamp(10px,1.2vw,16px)] w-[clamp(10px,1.2vw,16px)] text-sky-300" />
                    </span>
                  ) : null}
                  <span
                    className={`relative z-10 font-display text-[clamp(9px,1.45vw,21px)] font-black uppercase tracking-wider truncate drop-shadow ${
                      actionBadge.tone === 'injury'
                        ? 'text-white'
                        : actionBadge.tone === 'free_hit'
                          ? 'text-amber-200'
                          : 'text-sky-100'
                    }`}
                  >
                    {actionBadge.text}
                  </span>
                </div>
              )}

              {/* Team 2 Score Box (under Right Team header) */}
              <div
                className="absolute flex flex-col items-center justify-center px-2 text-center"
                style={{ left: '63.9%', top: '12.5%', width: '25.4%', height: '12.2%' }}
              >
                <div className="font-display text-[clamp(20px,3.8vw,56px)] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]">
                  {templateRightTeam.runs !== '-'
                    ? `${templateRightTeam.runs}/${templateRightTeam.wickets}`
                    : 'YET TO BAT'}
                </div>
                <div className="mt-0.5 font-mono-tabular text-[clamp(8px,0.95vw,13px)] font-bold text-amber-100">
                  {templateRightTeam.runs !== '-'
                    ? `OV: ${templateRightTeam.overs}  ·  CRR: ${templateRightTeam.runRate}`
                    : match.target
                      ? `TARGET: ${match.target}`
                      : templateRightTeam.shortName}
                </div>
              </div>

              {/* STRIKER Card (Bottom Left) */}
              <div
                className="absolute flex items-center gap-2 sm:gap-3 px-2 sm:px-3"
                style={{ left: '1.1%', top: '54.6%', width: '31.4%', height: '22.4%' }}
              >
                <PlayerPortrait
                  src={match.batter1.photoUrl}
                  fallbackSrc={DEFAULT_BATTER1_PHOTO}
                  alt={match.batter1.name}
                  accentColor="#38BDF8"
                  editable={!isOverlayMode}
                  uploadLabel="اسٹرائیکر تصویر اپلوڈ کریں"
                  className="relative h-[88%] aspect-square shrink-0 overflow-hidden rounded-lg border-2 border-sky-300/60 bg-[#091836]"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('batter1', url)
                      : undefined
                  }
                />
                <div className="flex-1 text-center min-w-0">
                  <div className="font-display text-[clamp(24px,4.3vw,62px)] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]">
                    {match.batter1.runs}
                  </div>
                  <div className="mt-0.5 font-mono-tabular text-[clamp(9px,1.2vw,17px)] font-extrabold text-sky-200">
                    ({match.batter1.balls} balls)
                  </div>
                </div>
              </div>

              {/* Striker Name Bar */}
              <div
                className="absolute flex items-center justify-center px-2"
                style={{ left: '1.8%', top: '78.6%', width: '29.8%', height: '4.8%' }}
              >
                <span className="font-display text-[clamp(10px,1.55vw,23px)] font-bold uppercase tracking-wide text-white truncate drop-shadow">
                  {match.batter1.name}
                  {match.batter1.onStrike ? ' *' : ''}
                </span>
              </div>

              {/* Striker 4s | 6s | SR Bar */}
              <div
                className="absolute flex items-center justify-around rounded bg-[#060911] px-2 font-mono-tabular text-[clamp(8px,1.05vw,15px)] font-bold text-amber-300"
                style={{ left: '1.6%', top: '84.3%', width: '30.2%', height: '3.9%' }}
              >
                <span>4s: <span className="text-white">{match.batter1.fours}</span></span>
                <span className="text-slate-600">|</span>
                <span>6s: <span className="text-white">{match.batter1.sixes}</span></span>
                <span className="text-slate-600">|</span>
                <span>SR: <span className="text-white">{match.batter1.strikeRate}</span></span>
              </div>

              {/* NON-STRIKER Card (Bottom Center) */}
              <div
                className="absolute flex items-center gap-2 sm:gap-3 px-2 sm:px-3"
                style={{ left: '34.8%', top: '54.6%', width: '30.4%', height: '22.4%' }}
              >
                <PlayerPortrait
                  src={match.batter2.photoUrl}
                  fallbackSrc={DEFAULT_BATTER2_PHOTO}
                  alt={match.batter2.name}
                  accentColor="#38BDF8"
                  editable={!isOverlayMode}
                  uploadLabel="نان اسٹرائیکر تصویر اپلوڈ کریں"
                  className="relative h-[88%] aspect-square shrink-0 overflow-hidden rounded-lg border-2 border-sky-300/60 bg-[#091836]"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('batter2', url)
                      : undefined
                  }
                />
                <div className="flex-1 text-center min-w-0">
                  <div className="font-display text-[clamp(24px,4.3vw,62px)] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]">
                    {match.batter2.runs}
                  </div>
                  <div className="mt-0.5 font-mono-tabular text-[clamp(9px,1.2vw,17px)] font-extrabold text-sky-200">
                    ({match.batter2.balls} balls)
                  </div>
                </div>
              </div>

              {/* Non-Striker Name Bar */}
              <div
                className="absolute flex items-center justify-center px-2"
                style={{ left: '35.5%', top: '78.6%', width: '29.0%', height: '4.8%' }}
              >
                <span className="font-display text-[clamp(10px,1.55vw,23px)] font-bold uppercase tracking-wide text-white truncate drop-shadow">
                  {match.batter2.name}
                  {match.batter2.onStrike ? ' *' : ''}
                </span>
              </div>

              {/* Non-Striker 4s | 6s | SR Bar */}
              <div
                className="absolute flex items-center justify-around rounded bg-[#060911] px-2 font-mono-tabular text-[clamp(8px,1.05vw,15px)] font-bold text-amber-300"
                style={{ left: '35.3%', top: '84.3%', width: '29.4%', height: '3.9%' }}
              >
                <span>4s: <span className="text-white">{match.batter2.fours}</span></span>
                <span className="text-slate-600">|</span>
                <span>6s: <span className="text-white">{match.batter2.sixes}</span></span>
                <span className="text-slate-600">|</span>
                <span>SR: <span className="text-white">{match.batter2.strikeRate}</span></span>
              </div>

              {/* BOWLER Card (Bottom Right) */}
              <div
                className="absolute flex items-center gap-2 sm:gap-3 px-2 sm:px-3"
                style={{ left: '67.7%', top: '54.6%', width: '31.1%', height: '22.0%' }}
              >
                <PlayerPortrait
                  src={match.bowler.photoUrl}
                  fallbackSrc={DEFAULT_BOWLER_PHOTO}
                  alt={match.bowler.name}
                  accentColor="#FBBF24"
                  editable={!isOverlayMode}
                  uploadLabel="بالر کی تصویر اپلوڈ کریں"
                  className="relative h-[86%] aspect-square shrink-0 overflow-hidden rounded-lg border border-amber-200/40 bg-[#2C2103]"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('bowler', url)
                      : undefined
                  }
                />
                <div className="flex-1 text-center min-w-0">
                  <div className="font-display text-[clamp(12px,1.8vw,26px)] font-extrabold uppercase leading-tight text-white truncate drop-shadow">
                    {match.bowler.name}
                  </div>
                  <div className="mt-1 font-mono-tabular text-[clamp(8px,0.95vw,13px)] font-semibold text-amber-100">
                    O: {match.bowler.overs} · M: {match.bowler.maidens}
                  </div>
                </div>
              </div>

              {/* Bowler Econ Bar */}
              <div
                className="absolute flex items-center justify-center rounded bg-gradient-to-b from-[#D4A72C] to-[#98720D] px-2"
                style={{ left: '68.6%', top: '77.6%', width: '29.4%', height: '4.6%' }}
              >
                <span className="font-display text-[clamp(10px,1.4vw,20px)] font-extrabold text-white drop-shadow">
                  Econ: {match.bowler.economy}
                </span>
              </div>

              {/* Bowler W-R (Overs) Bar */}
              <div
                className="absolute flex items-center justify-center rounded bg-[#060911] px-2"
                style={{ left: '68.0%', top: '83.2%', width: '30.6%', height: '4.8%' }}
              >
                <span className="font-display text-[clamp(12px,1.85vw,27px)] font-extrabold text-white tabular-nums">
                  {match.bowler.wickets}-{match.bowler.runs} ({match.bowler.overs})
                </span>
              </div>

              {/* Bottom Ticker Strip (covering placeholder text cleanly between LAST WKT: and BOWLING) */}
              <div
                className="absolute flex items-center justify-between gap-3 bg-[#050912] px-3"
                style={{ left: '15.6%', top: '92.9%', width: '69.6%', height: '6.0%' }}
              >
                <span className="font-display text-[clamp(9px,1.25vw,18px)] font-bold uppercase tracking-wide text-amber-300 truncate">
                  {match.lastWicket || match.equation || match.status}
                </span>
                <span className="hidden sm:inline font-mono-tabular text-[clamp(8px,0.95vw,13px)] font-semibold text-sky-300 shrink-0">
                  {match.status}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  // Standard Clean Broadcast Mode (Stadium / OBS Green Screen / Dark)
  return (
    <section
      id="broadcast-stage"
      aria-label="Live Cricket Broadcast Stage"
      className={
        isOverlayMode
          ? 'relative flex min-h-screen w-full items-center justify-center overflow-hidden p-3 sm:p-6'
          : 'relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#0B0F14]'
      }
      style={{
        backgroundColor: backdropMode === 'chroma' ? '#00B140' : '#0B0F14',
      }}
    >
      {/* Broadcast Frame */}
      <div
        className={`relative w-full overflow-hidden ${
          isOverlayMode
            ? 'mx-auto aspect-video max-w-[1440px] rounded-xl border border-white/15 shadow-2xl'
            : 'min-h-[420px] sm:aspect-video'
        }`}
        style={{
          backgroundColor: backdropMode === 'chroma' ? '#00B140' : '#090D13',
        }}
      >
        {/* Backdrop Visual Layer */}
        {backdropMode === 'stadium' && !bgError && (
          <img
            src={DEFAULT_STADIUM_BACKDROP}
            alt="International cricket stadium floodlights"
            referrerPolicy="no-referrer"
            onError={() => setBgError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {backdropMode === 'custom' && customBackdropUrl && !bgError && (
          <img
            src={customBackdropUrl}
            alt="Custom broadcast stadium backdrop"
            referrerPolicy="no-referrer"
            onError={() => setBgError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Measured Contrast Scrim */}
        {backdropMode !== 'chroma' && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#070B10] via-[#070B10]/55 to-[#070B10]/80" />
        )}

        {/* Broadcast HUD Content */}
        <div className="relative z-10 flex h-full min-h-[420px] flex-col justify-between p-4 sm:p-6 lg:p-8">
          {/* Top Broadcast Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-3 bg-[#090E16]/85 px-4 py-2.5 rounded-lg backdrop-blur-md">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 min-w-0">
              <span className="font-display text-base sm:text-lg font-bold tracking-wide text-white truncate">
                {match?.tournament || 'رضوان کرکٹ لائیو براڈکاسٹ'}
              </span>
              {match?.format && (
                <>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="font-mono-tabular text-xs font-semibold text-emerald-400">
                    {match.format}
                  </span>
                </>
              )}
              {match?.venue && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline text-slate-500">·</span>
                  <span className="hidden sm:inline truncate text-slate-300 text-xs">
                    {match.venue}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {match?.isLive && (
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
                  <span>{labels.live}</span>
                </div>
              )}
              <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                رضوان کرکٹ TV
              </span>
              {!isOverlayMode && onRefreshMatch && match && (
                <button
                  type="button"
                  onClick={onRefreshMatch}
                  disabled={isRefreshingDetail}
                  title="تازہ ترین اسکور حاصل کریں"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingDetail ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>اپ ڈیٹ</span>
                </button>
              )}
              {!isOverlayMode && onOpenYouTubeLive && (
                <button
                  type="button"
                  onClick={onOpenYouTubeLive}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>YouTube پر لائیو کریں</span>
                </button>
              )}
            </div>
          </div>

          {/* Center Main Team vs Team Scorebug */}
          {loading && !match ? (
            <div className="my-auto flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0F17]/90 p-8 text-center backdrop-blur-md">
              <Tv className="h-8 w-8 text-emerald-400 mb-3 animate-pulse" aria-hidden="true" />
              <p className="font-display text-2xl font-bold text-white">
                لائیو کرکٹ ڈیٹا لوڈ ہو رہا ہے...
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Fetching real-time international &amp; tournament scores from live sources
              </p>
            </div>
          ) : match ? (
            <div className="my-auto grid grid-cols-1 lg:grid-cols-12 items-stretch gap-3 sm:gap-4 py-4">
              {/* Left Wing: Team 1 */}
              <div
                className="lg:col-span-4 flex flex-col justify-between rounded-lg border border-white/15 bg-[#0A1018]/92 p-4 backdrop-blur-md"
                style={{ borderTopWidth: '3px', borderTopColor: team1Color }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-white/20 shadow">
                      <TeamFlag
                        teamName={match.team1.name}
                        flagCode={match.team1.flagCode || match.team1.shortName}
                        colorHex={team1Color}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                        {match.team1.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {match.team1.isBatting ? labels.batting : labels.bowling}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums leading-none">
                      {match.team1.runs}/{match.team1.wickets}
                    </div>
                    <div className="mt-1 font-mono-tabular text-xs text-slate-300">
                      {match.team1.overs} {labels.overs} · {labels.crr} {match.team1.runRate || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Bridge: Equation & Ball-by-Ball Event */}
              <div className="lg:col-span-4 relative overflow-hidden flex flex-col items-center justify-center rounded-lg border border-white/15 bg-[#0D141F]/92 px-4 py-3 text-center backdrop-blur-md">
                {overBoxSummary && (
                  <div
                    key={`std-event-${match.id}-${overBoxSummary.overNumber}-${overBoxSummary.headline}`}
                    className={`relative mb-2 inline-flex items-center gap-2 overflow-hidden rounded-md px-3 py-1 ${
                      overBoxSummary.tone === 'six'
                        ? 'border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                        : overBoxSummary.tone === 'four'
                          ? 'border border-sky-400/60 bg-sky-500/20 text-sky-200 shadow-[0_0_16px_rgba(14,165,233,0.35)]'
                          : overBoxSummary.tone === 'wicket'
                            ? 'border border-red-500/70 bg-red-600/25 text-red-100 shadow-[0_0_18px_rgba(239,68,68,0.45)]'
                            : 'border border-white/15 bg-white/5 text-white'
                    }`}
                  >
                    <span className="animate-broadcast-pop font-display text-xl font-black tracking-wide uppercase">
                      {overBoxSummary.headline}
                    </span>
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 font-mono-tabular text-[11px] font-black text-[#09111E]">
                      OVER {overBoxSummary.overNumber}
                    </span>
                  </div>
                )}
                {actionBadge && (
                  <div
                    className={`mb-1.5 inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 font-display text-xs font-black uppercase tracking-wider ${
                      actionBadge.tone === 'injury'
                        ? 'border border-red-400/70 bg-red-600/30 text-red-100 animate-pulse'
                        : 'border border-sky-400/50 bg-sky-500/20 text-sky-200'
                    }`}
                  >
                    <span>{actionBadge.text}</span>
                  </div>
                )}
                <div className="text-xs font-semibold text-emerald-400">
                  {match.status}
                </div>
                <div className="mt-1 font-display text-lg sm:text-xl font-bold text-white text-balance">
                  {match.equation ||
                    (match.target
                      ? `${labels.target}: ${match.target}`
                      : `${match.team1.shortName} vs ${match.team2.shortName}`)}
                </div>
                {match.recentBalls && match.recentBalls.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400 mr-1">
                      {labels.thisOver}:
                    </span>
                    {match.recentBalls.slice(-6).map((ball, idx) => (
                      <span
                        key={`${ball}-${idx}`}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded border font-mono-tabular text-xs font-bold ${getBallClass(ball)}`}
                      >
                        {ball}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Wing: Team 2 */}
              <div
                className="lg:col-span-4 flex flex-col justify-between rounded-lg border border-white/15 bg-[#0A1018]/92 p-4 backdrop-blur-md"
                style={{ borderTopWidth: '3px', borderTopColor: team2Color }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left shrink-0">
                    <div className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums leading-none">
                      {match.team2.runs}/{match.team2.wickets}
                    </div>
                    <div className="mt-1 font-mono-tabular text-xs text-slate-300">
                      {match.team2.overs} {labels.overs} · {labels.crr} {match.team2.runRate || '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0 text-right">
                    <div className="min-w-0">
                      <div className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                        {match.team2.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {match.team2.isBatting ? labels.batting : labels.bowling}
                      </div>
                    </div>
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-white/20 shadow">
                      <TeamFlag
                        teamName={match.team2.name}
                        flagCode={match.team2.flagCode || match.team2.shortName}
                        colorHex={team2Color}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Lower Third: 2 Batting Players + 1 Bowler */}
          {match && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 border-t border-white/15 pt-3">
              {/* Batter 1 */}
              <div className="lg:col-span-4 flex items-center gap-3.5 rounded-lg border border-white/15 bg-[#0A1018]/95 p-3 backdrop-blur-md">
                <PlayerPortrait
                  src={match.batter1.photoUrl}
                  fallbackSrc={DEFAULT_BATTER1_PHOTO}
                  alt={match.batter1.name}
                  accentColor={team2Color}
                  editable={!isOverlayMode}
                  uploadLabel="بلے باز 1 تصویر اپلوڈ کریں"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('batter1', url)
                      : undefined
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg sm:text-xl font-bold text-white truncate">
                      {match.batter1.name}
                      {match.batter1.onStrike ? ' *' : ''}
                    </span>
                    <span className="font-display text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums shrink-0">
                      {match.batter1.runs}
                      <span className="ml-1 text-sm font-normal text-slate-400">
                        ({match.batter1.balls})
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono-tabular text-xs text-slate-300">
                    <span>4s: {match.batter1.fours}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>6s: {match.batter1.sixes}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>SR: {match.batter1.strikeRate}</span>
                  </div>
                </div>
              </div>

              {/* Batter 2 */}
              <div className="lg:col-span-4 flex items-center gap-3.5 rounded-lg border border-white/15 bg-[#0A1018]/95 p-3 backdrop-blur-md">
                <PlayerPortrait
                  src={match.batter2.photoUrl}
                  fallbackSrc={DEFAULT_BATTER2_PHOTO}
                  alt={match.batter2.name}
                  accentColor={team2Color}
                  editable={!isOverlayMode}
                  uploadLabel="بلے باز 2 تصویر اپلوڈ کریں"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('batter2', url)
                      : undefined
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg sm:text-xl font-bold text-white truncate">
                      {match.batter2.name}
                      {match.batter2.onStrike ? ' *' : ''}
                    </span>
                    <span className="font-display text-2xl sm:text-3xl font-black text-white tabular-nums shrink-0">
                      {match.batter2.runs}
                      <span className="ml-1 text-sm font-normal text-slate-400">
                        ({match.batter2.balls})
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono-tabular text-xs text-slate-300">
                    <span>4s: {match.batter2.fours}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>6s: {match.batter2.sixes}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>SR: {match.batter2.strikeRate}</span>
                  </div>
                </div>
              </div>

              {/* Bowler */}
              <div className="lg:col-span-4 flex items-center gap-3.5 rounded-lg border border-white/15 bg-[#0A1018]/95 p-3 backdrop-blur-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg sm:text-xl font-bold text-white truncate">
                      {match.bowler.name}
                    </span>
                    <span className="font-display text-2xl sm:text-3xl font-black text-amber-400 tabular-nums shrink-0">
                      {match.bowler.wickets}-{match.bowler.runs}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono-tabular text-xs text-slate-300">
                    <span>O: {match.bowler.overs}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>M: {match.bowler.maidens}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>Econ: {match.bowler.economy}</span>
                  </div>
                </div>
                <PlayerPortrait
                  src={match.bowler.photoUrl}
                  fallbackSrc={DEFAULT_BOWLER_PHOTO}
                  alt={match.bowler.name}
                  accentColor={team1Color}
                  editable={!isOverlayMode}
                  uploadLabel="بالر کی تصویر اپلوڈ کریں"
                  onUploadPhoto={
                    onUpdatePlayerPhoto
                      ? (url) => onUpdatePlayerPhoto('bowler', url)
                      : undefined
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
