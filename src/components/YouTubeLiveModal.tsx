import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Mic, MicOff, Radio, Square, X } from 'lucide-react';
import {
  DEFAULT_TEMPLATE_IMAGE,
  getOverBoxSummary,
  resolveBowlerActionBadge,
} from './BroadcastStage';
import { drawTeamFlagOnCanvas } from './TeamFlag';
import { getProLayoutById, type BroadcastLayoutId } from '../data/layouts';
import type { BackdropMode, LiveCricketMatch } from '../types/cricket';

interface YouTubeLiveModalProps {
  open: boolean;
  onClose: () => void;
  match: LiveCricketMatch | null;
  backdropMode: BackdropMode;
  selectedLayoutId?: BroadcastLayoutId;
  customBackdropUrl?: string;
}

export const YouTubeLiveModal: React.FC<YouTubeLiveModalProps> = ({
  open,
  onClose,
  match,
  backdropMode,
  selectedLayoutId = 'free-classic',
  customBackdropUrl,
}) => {
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [streamKey, setStreamKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [captureSource, setCaptureSource] = useState<'canvas' | 'screen'>('canvas');
  const [useMic, setUseMic] = useState(false);

  const [streamState, setStreamState] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matchRef = useRef<LiveCricketMatch | null>(match);
  matchRef.current = match;

  const streamTokenRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const chunkQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Preload images for the 1280x720 broadcast canvas
  const imagesRef = useRef<{
    template?: HTMLImageElement;
    batter1?: HTMLImageElement;
    batter2?: HTMLImageElement;
    bowler?: HTMLImageElement;
  }>({});

  useEffect(() => {
    if (!open) return;

    const loadImg = (src: string, onLoad: (img: HTMLImageElement) => void) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => onLoad(img);
      img.src = src;
    };

    const proPreset =
      backdropMode === 'template' && selectedLayoutId !== 'free-classic'
        ? getProLayoutById(selectedLayoutId)
        : undefined;

    const bgSrc =
      backdropMode === 'custom' && customBackdropUrl
        ? customBackdropUrl
        : backdropMode === 'stadium'
          ? '/src/assets/images/stadium_broadcast_backdrop_1795691786976.jpg'
          : proPreset?.imageUrl || DEFAULT_TEMPLATE_IMAGE;

    loadImg(bgSrc, (img) => {
      imagesRef.current.template = img;
    });
    loadImg(
      match?.batter1.photoUrl || '/src/assets/images/cartoon_batter_striker_1795693654803.jpg',
      (img) => {
        imagesRef.current.batter1 = img;
      }
    );
    loadImg(
      match?.batter2.photoUrl || '/src/assets/images/cartoon_batter_nonstriker_1795693655838.jpg',
      (img) => {
        imagesRef.current.batter2 = img;
      }
    );
    loadImg(
      match?.bowler.photoUrl || '/src/assets/images/cartoon_bowler_1795693656095.jpg',
      (img) => {
        imagesRef.current.bowler = img;
      }
    );
  }, [
    open,
    backdropMode,
    selectedLayoutId,
    customBackdropUrl,
    match?.batter1.photoUrl,
    match?.batter2.photoUrl,
    match?.bowler.photoUrl,
  ]);

  // Draw live scoreboard frame onto 1280x720 canvas for YouTube stream
  useEffect(() => {
    if (!open) return;
    let active = true;

    const drawFrame = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = '#050912';
          ctx.fillRect(0, 0, W, H);

          const bgImg = imagesRef.current.template;
          if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, W, H);
          }

          const m = matchRef.current;
          const activePro =
            backdropMode === 'template' && selectedLayoutId !== 'free-classic'
              ? getProLayoutById(selectedLayoutId)
              : undefined;
          if (m && activePro) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const c = activePro.coords;
            const nowMs = performance.now();
            const pulse = 0.5 + 0.5 * Math.sin(nowMs / 240);

            drawTeamFlagOnCanvas(
              ctx,
              m.team1.name,
              m.team1.flagCode || m.team1.shortName,
              m.team1.colorHex || '#1D4ED8',
              (W * c.leftFlag.left) / 100,
              (H * c.leftFlag.top) / 100,
              (W * c.leftFlag.width) / 100,
              (H * c.leftFlag.height) / 100
            );
            drawTeamFlagOnCanvas(
              ctx,
              m.team2.name,
              m.team2.flagCode || m.team2.shortName,
              m.team2.colorHex || '#B45309',
              (W * c.rightFlag.left) / 100,
              (H * c.rightFlag.top) / 100,
              (W * c.rightFlag.width) / 100,
              (H * c.rightFlag.height) / 100
            );

            // Team 1 & Team 2 Names + Scores
            if (c.leftTeamBanner) {
              ctx.fillStyle = m.team1.colorHex || '#1D4ED8';
              ctx.beginPath();
              ctx.roundRect(
                (W * c.leftTeamBanner.left) / 100,
                (H * c.leftTeamBanner.top) / 100,
                (W * c.leftTeamBanner.width) / 100,
                (H * c.leftTeamBanner.height) / 100,
                6
              );
              ctx.fill();
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 26px "Barlow Condensed", sans-serif';
              ctx.fillText(
                m.team1.name.toUpperCase().slice(0, 18),
                (W * (c.leftTeamBanner.left + c.leftTeamBanner.width / 2)) / 100,
                (H * (c.leftTeamBanner.top + c.leftTeamBanner.height / 2)) / 100
              );
            }
            if (c.rightTeamBanner) {
              ctx.fillStyle = m.team2.colorHex || '#991B1B';
              ctx.beginPath();
              ctx.roundRect(
                (W * c.rightTeamBanner.left) / 100,
                (H * c.rightTeamBanner.top) / 100,
                (W * c.rightTeamBanner.width) / 100,
                (H * c.rightTeamBanner.height) / 100,
                6
              );
              ctx.fill();
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 26px "Barlow Condensed", sans-serif';
              ctx.fillText(
                m.team2.name.toUpperCase().slice(0, 18),
                (W * (c.rightTeamBanner.left + c.rightTeamBanner.width / 2)) / 100,
                (H * (c.rightTeamBanner.top + c.rightTeamBanner.height / 2)) / 100
              );
            }

            const lcx = (W * (c.leftScore.left + c.leftScore.width / 2)) / 100;
            const lcy = (H * (c.leftScore.top + c.leftScore.height / 2)) / 100;
            if (!c.leftTeamBanner) {
              ctx.fillStyle = '#F1F5F9';
              ctx.font = 'bold 20px "Barlow Condensed", sans-serif';
              ctx.fillText(m.team1.name.toUpperCase().slice(0, 18), lcx, lcy - 28);
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 44px "Barlow Condensed", sans-serif';
            ctx.fillText(
              m.team1.runs !== '-' ? `${m.team1.runs}/${m.team1.wickets}` : 'YET TO BAT',
              lcx,
              c.leftTeamBanner ? lcy - 8 : lcy + 4
            );
            ctx.fillStyle = '#BAE6FD';
            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.fillText(
              m.team1.runs !== '-' ? `OV: ${m.team1.overs} · CRR: ${m.team1.runRate}` : m.team1.shortName,
              lcx,
              c.leftTeamBanner ? lcy + 24 : lcy + 32
            );

            const rcx = (W * (c.rightScore.left + c.rightScore.width / 2)) / 100;
            const rcy = (H * (c.rightScore.top + c.rightScore.height / 2)) / 100;
            if (!c.rightTeamBanner) {
              ctx.fillStyle = '#F1F5F9';
              ctx.font = 'bold 20px "Barlow Condensed", sans-serif';
              ctx.fillText(m.team2.name.toUpperCase().slice(0, 18), rcx, rcy - 28);
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 44px "Barlow Condensed", sans-serif';
            ctx.fillText(
              m.team2.runs !== '-' ? `${m.team2.runs}/${m.team2.wickets}` : 'YET TO BAT',
              rcx,
              c.rightTeamBanner ? rcy - 8 : rcy + 4
            );
            ctx.fillStyle = '#FEF3C7';
            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.fillText(
              m.team2.runs !== '-' ? `OV: ${m.team2.overs} · CRR: ${m.team2.runRate}` : m.team2.shortName,
              rcx,
              c.rightTeamBanner ? rcy + 24 : rcy + 32
            );

            // Center LIVE + Runs + OVER + Bowler Running / Injury
            const liveCx = (W * (c.centerLive.left + c.centerLive.width / 2)) / 100;
            const liveCy = (H * (c.centerLive.top + c.centerLive.height / 2)) / 100;
            ctx.fillStyle = '#DC2626';
            ctx.beginPath();
            ctx.roundRect(liveCx - 42, liveCy - 12, 84, 24, 5);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 15px "Barlow Condensed", sans-serif';
            ctx.fillText('• LIVE', liveCx, liveCy);

            const activeOv = m.team2.isBatting ? m.team2.overs : m.team1.overs;
            const ovSummary = getOverBoxSummary(activeOv, m.recentBalls);
            const rBoxX = (W * c.centerRuns.left) / 100;
            const rBoxY = (H * c.centerRuns.top) / 100;
            const rBoxW = (W * c.centerRuns.width) / 100;
            const rBoxH = (H * c.centerRuns.height) / 100;
            ctx.fillStyle =
              ovSummary.tone === 'wicket'
                ? `rgba(185, 28, 28, ${0.75 + pulse * 0.2})`
                : ovSummary.tone === 'six'
                  ? `rgba(5, 150, 105, ${0.7 + pulse * 0.2})`
                  : ovSummary.tone === 'four'
                    ? `rgba(2, 132, 199, ${0.7 + pulse * 0.2})`
                    : 'rgba(10, 18, 36, 0.92)';
            ctx.beginPath();
            ctx.roundRect(rBoxX, rBoxY, rBoxW, rBoxH, 7);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 36px "Barlow Condensed", sans-serif';
            ctx.fillText(ovSummary.headline, rBoxX + rBoxW / 2, rBoxY + rBoxH / 2);

            const ovCx = (W * (c.centerOver.left + c.centerOver.width / 2)) / 100;
            const ovCy = (H * (c.centerOver.top + c.centerOver.height / 2)) / 100;
            ctx.fillStyle = 'rgba(6, 11, 21, 0.9)';
            ctx.beginPath();
            ctx.roundRect(ovCx - 90, ovCy - 15, 180, 30, 6);
            ctx.fill();
            ctx.fillStyle = '#F59E0B';
            ctx.font = '900 17px "Barlow Condensed", sans-serif';
            ctx.fillText(`OVER  ${ovSummary.overNumber}`, ovCx, ovCy);

            const actionBadge = resolveBowlerActionBadge(m);
            if (actionBadge) {
              const ax = (W * c.centerAction.left) / 100;
              const ay = (H * c.centerAction.top) / 100;
              const aw = (W * c.centerAction.width) / 100;
              const ah = (H * c.centerAction.height) / 100;
              ctx.fillStyle =
                actionBadge.tone === 'injury' ? 'rgba(153, 27, 27, 0.94)' : 'rgba(10, 34, 68, 0.94)';
              ctx.beginPath();
              ctx.roundRect(ax, ay, aw, ah, 6);
              ctx.fill();
              ctx.fillStyle = '#FFFFFF';
              ctx.font = '900 19px "Barlow Condensed", sans-serif';
              ctx.fillText(actionBadge.text, ax + aw / 2, ay + ah / 2);
            }

            // Bottom 3 Player Cards
            const drawCard = (
              rect: typeof c.batter1Card,
              img: HTMLImageElement | undefined,
              title: string,
              bigText: string,
              subText: string
            ) => {
              const x = (W * rect.left) / 100;
              const y = (H * rect.top) / 100;
              const w = (W * rect.width) / 100;
              const h = (H * rect.height) / 100;
              const sz = h * 0.84;
              if (img) {
                ctx.drawImage(img, x + 8, y + (h - sz) / 2, sz, sz);
              }
              const tx = x + sz + (w - sz) / 2;
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 17px "Barlow Condensed", sans-serif';
              ctx.fillText(title.toUpperCase().slice(0, 20), tx, y + h * 0.24);
              ctx.font = '900 40px "Barlow Condensed", sans-serif';
              ctx.fillText(bigText, tx, y + h * 0.56);
              ctx.fillStyle = '#BAE6FD';
              ctx.font = 'bold 13px "JetBrains Mono", monospace';
              ctx.fillText(subText, tx, y + h * 0.84);
            };

            drawCard(
              c.batter1Card,
              imagesRef.current.batter1,
              `${m.batter1.name}${m.batter1.onStrike ? ' *' : ''}`,
              String(m.batter1.runs),
              `(${m.batter1.balls} balls)`
            );
            drawCard(
              c.batter2Card,
              imagesRef.current.batter2,
              `${m.batter2.name}${m.batter2.onStrike ? ' *' : ''}`,
              String(m.batter2.runs),
              `(${m.batter2.balls} balls)`
            );
            drawCard(
              c.bowlerCard,
              imagesRef.current.bowler,
              m.bowler.name,
              `${m.bowler.wickets}-${m.bowler.runs}`,
              `O: ${m.bowler.overs} · M: ${m.bowler.maidens}`
            );

            // Stats bars
            ctx.fillStyle = '#FCD34D';
            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.fillText(
              `4s: ${m.batter1.fours} | 6s: ${m.batter1.sixes} | SR: ${m.batter1.strikeRate}`,
              (W * (c.batter1Stats.left + c.batter1Stats.width / 2)) / 100,
              (H * (c.batter1Stats.top + c.batter1Stats.height / 2)) / 100
            );
            ctx.fillText(
              `4s: ${m.batter2.fours} | 6s: ${m.batter2.sixes} | SR: ${m.batter2.strikeRate}`,
              (W * (c.batter2Stats.left + c.batter2Stats.width / 2)) / 100,
              (H * (c.batter2Stats.top + c.batter2Stats.height / 2)) / 100
            );
            ctx.fillText(
              `ECON: ${m.bowler.economy} | OV: ${m.bowler.overs}`,
              (W * (c.bowlerStats.left + c.bowlerStats.width / 2)) / 100,
              (H * (c.bowlerStats.top + c.bowlerStats.height / 2)) / 100
            );

            // Ticker
            if (activePro.tickerBg) {
              ctx.fillStyle = activePro.tickerBg;
              ctx.beginPath();
              ctx.roundRect(
                (W * c.ticker.left) / 100,
                (H * c.ticker.top) / 100,
                (W * c.ticker.width) / 100,
                (H * c.ticker.height) / 100,
                4
              );
              ctx.fill();
            }
            ctx.fillStyle = '#FCD34D';
            ctx.font = 'bold 16px "Barlow Condensed", sans-serif';
            ctx.fillText(
              `LAST WKT: ${(m.lastWicket || m.equation || m.status).toUpperCase().slice(0, 72)}`,
              (W * (c.ticker.left + c.ticker.width / 2)) / 100,
              (H * (c.ticker.top + c.ticker.height / 2)) / 100
            );
          } else if (m) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const isDefaultTeams =
              (m.team1.name.toLowerCase().includes('india a') &&
                m.team2.name.toLowerCase().includes('sri lanka a')) ||
              (m.team1.name.toLowerCase().includes('sri lanka a') &&
                m.team2.name.toLowerCase().includes('india a'));

            const leftTeam =
              isDefaultTeams && m.team1.name.toLowerCase().includes('sri lanka a')
                ? m.team2
                : m.team1;
            const rightTeam = leftTeam === m.team2 ? m.team1 : m.team2;

            // Draw dynamic flags on Left & Right flag boxes
            drawTeamFlagOnCanvas(
              ctx,
              leftTeam.name,
              leftTeam.flagCode || leftTeam.shortName,
              leftTeam.colorHex || '#1D4ED8',
              W * 0.0052,
              H * 0.0225,
              W * 0.0905,
              H * 0.158
            );
            drawTeamFlagOnCanvas(
              ctx,
              rightTeam.name,
              rightTeam.flagCode || rightTeam.shortName,
              rightTeam.colorHex || '#B45309',
              W * 0.9042,
              H * 0.0225,
              W * 0.0905,
              H * 0.158
            );

            if (!isDefaultTeams) {
              ctx.fillStyle = leftTeam.colorHex || '#1D4ED8';
              ctx.fillRect(W * 0.106, H * 0.02, W * 0.266, H * 0.088);
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 28px "Barlow Condensed", sans-serif';
              ctx.fillText(leftTeam.name.toUpperCase().slice(0, 18), W * 0.239, H * 0.064);

              ctx.fillStyle = rightTeam.colorHex || '#B45309';
              ctx.fillRect(W * 0.626, H * 0.02, W * 0.266, H * 0.088);
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 28px "Barlow Condensed", sans-serif';
              ctx.fillText(rightTeam.name.toUpperCase().slice(0, 18), W * 0.759, H * 0.064);
            }

            // Team 1 Score (Left)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 52px "Barlow Condensed", sans-serif';
            const s1 = leftTeam.runs !== '-' ? `${leftTeam.runs}/${leftTeam.wickets}` : 'YET TO BAT';
            ctx.fillText(s1, W * 0.239, H * 0.175);
            ctx.fillStyle = '#DBEAFE';
            ctx.font = 'bold 14px "JetBrains Mono", monospace';
            ctx.fillText(
              leftTeam.runs !== '-' ? `OV: ${leftTeam.overs} · CRR: ${leftTeam.runRate}` : leftTeam.shortName,
              W * 0.239,
              H * 0.225
            );

            // Cover baked-in big OVER text & draw animated stadium effect + BIG BOLD ball runs
            const activeOv = m.team2.isBatting ? m.team2.overs : m.team1.overs;
            const ovSummary = getOverBoxSummary(activeOv, m.recentBalls);

            const boxX = W * 0.383;
            const boxY = H * 0.094;
            const boxW = W * 0.234;
            const boxH = H * 0.1;
            const nowMs = performance.now();
            const pulse = 0.5 + 0.5 * Math.sin(nowMs / 240);

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 8);
            ctx.clip();

            const rad = ctx.createRadialGradient(
              boxX + boxW / 2,
              boxY + boxH / 2,
              4,
              boxX + boxW / 2,
              boxY + boxH / 2,
              boxW * 0.65
            );
            if (ovSummary.tone === 'six') {
              rad.addColorStop(0, `rgba(16, 185, 129, ${0.55 + pulse * 0.2})`);
              rad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
              rad.addColorStop(1, 'rgba(4, 10, 20, 0.96)');
            } else if (ovSummary.tone === 'four') {
              rad.addColorStop(0, `rgba(14, 165, 233, ${0.58 + pulse * 0.2})`);
              rad.addColorStop(0.5, 'rgba(37, 99, 235, 0.36)');
              rad.addColorStop(1, 'rgba(4, 10, 20, 0.96)');
            } else if (ovSummary.tone === 'wicket') {
              rad.addColorStop(0, `rgba(239, 68, 68, ${0.65 + pulse * 0.25})`);
              rad.addColorStop(0.5, 'rgba(153, 27, 27, 0.45)');
              rad.addColorStop(1, 'rgba(12, 4, 8, 0.97)');
            } else {
              rad.addColorStop(0, 'rgba(30, 64, 175, 0.45)');
              rad.addColorStop(1, 'rgba(5, 10, 21, 0.96)');
            }
            ctx.fillStyle = rad;
            ctx.fillRect(boxX, boxY, boxW, boxH);

            // Animated sunburst rays behind 6 / 4 / WICKET
            if (ovSummary.tone === 'six' || ovSummary.tone === 'four' || ovSummary.tone === 'wicket') {
              const cx = boxX + boxW / 2;
              const cy = boxY + boxH / 2;
              const rayColor =
                ovSummary.tone === 'six'
                  ? 'rgba(251, 191, 36, 0.22)'
                  : ovSummary.tone === 'four'
                    ? 'rgba(56, 189, 248, 0.22)'
                    : 'rgba(248, 113, 113, 0.28)';
              const baseAngle = (nowMs / 1800) % (Math.PI * 2);
              ctx.fillStyle = rayColor;
              for (let r = 0; r < 8; r++) {
                const a1 = baseAngle + (r * Math.PI) / 4;
                const a2 = a1 + Math.PI / 14;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(a1) * boxW, cy + Math.sin(a1) * boxW);
                ctx.lineTo(cx + Math.cos(a2) * boxW, cy + Math.sin(a2) * boxW);
                ctx.closePath();
                ctx.fill();
              }
            }

            // Sweeping light sheen
            const sheenProg = ((nowMs % 2200) / 2200) * 1.6 - 0.3;
            const sheenX = boxX + sheenProg * boxW;
            const sheenGrad = ctx.createLinearGradient(sheenX - 30, boxY, sheenX + 30, boxY + boxH);
            sheenGrad.addColorStop(0, 'rgba(255,255,255,0)');
            sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.22)');
            sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = sheenGrad;
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.restore();

            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 8);
            ctx.strokeStyle =
              ovSummary.tone === 'six'
                ? 'rgba(52, 211, 153, 0.85)'
                : ovSummary.tone === 'four'
                  ? 'rgba(56, 189, 248, 0.85)'
                  : ovSummary.tone === 'wicket'
                    ? 'rgba(248, 113, 113, 0.9)'
                    : 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle =
              ovSummary.tone === 'six'
                ? '#A7F3D0'
                : ovSummary.tone === 'four'
                  ? '#BAE6FD'
                  : ovSummary.tone === 'wicket'
                    ? '#FFFFFF'
                    : ovSummary.tone === 'over'
                      ? '#FCD34D'
                      : '#FFFFFF';
            ctx.font = '900 44px "Barlow Condensed", sans-serif';
            ctx.fillText(ovSummary.headline, W * 0.5, H * 0.146);

            // Small gold-bordered box underneath: OVER badge + over number
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.roundRect(W * 0.415, H * 0.215, W * 0.056, H * 0.032, 4);
            ctx.fill();
            ctx.fillStyle = '#09111E';
            ctx.font = '900 17px "Barlow Condensed", sans-serif';
            ctx.fillText('OVER', W * 0.443, H * 0.232);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px "JetBrains Mono", monospace';
            ctx.fillText(ovSummary.overNumber, W * 0.525, H * 0.232);

            // BOWLER RUNNING / INJURY strip below OVER box
            const actionBadge = resolveBowlerActionBadge(m);
            if (actionBadge) {
              const ax = W * 0.378;
              const ay = H * 0.272;
              const aw = W * 0.244;
              const ah = H * 0.056;
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(ax, ay, aw, ah, 7);
              ctx.fillStyle =
                actionBadge.tone === 'injury'
                  ? 'rgba(153, 27, 27, 0.94)'
                  : actionBadge.tone === 'free_hit'
                    ? 'rgba(146, 64, 14, 0.94)'
                    : 'rgba(10, 34, 68, 0.94)';
              ctx.fill();
              ctx.strokeStyle =
                actionBadge.tone === 'injury'
                  ? 'rgba(248, 113, 113, 0.9)'
                  : actionBadge.tone === 'free_hit'
                    ? 'rgba(251, 191, 36, 0.85)'
                    : 'rgba(56, 189, 248, 0.75)';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Pulsing dot indicator
              ctx.beginPath();
              ctx.arc(ax + 24, ay + ah / 2, 5 + pulse * 2.5, 0, Math.PI * 2);
              ctx.fillStyle =
                actionBadge.tone === 'injury'
                  ? 'rgba(248, 113, 113, 0.85)'
                  : 'rgba(52, 211, 153, 0.9)';
              ctx.fill();

              ctx.fillStyle = actionBadge.tone === 'injury' ? '#FFFFFF' : '#E0F2FE';
              ctx.font = '900 21px "Barlow Condensed", sans-serif';
              ctx.fillText(actionBadge.text, W * 0.5 + 8, ay + ah / 2);
              ctx.restore();
            }

            // Team 2 Score (Right)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 52px "Barlow Condensed", sans-serif';
            const s2 = rightTeam.runs !== '-' ? `${rightTeam.runs}/${rightTeam.wickets}` : 'YET TO BAT';
            ctx.fillText(s2, W * 0.766, H * 0.175);
            ctx.fillStyle = '#FEF3C7';
            ctx.font = 'bold 14px "JetBrains Mono", monospace';
            ctx.fillText(
              rightTeam.runs !== '-'
                ? `OV: ${rightTeam.overs} · CRR: ${rightTeam.runRate}`
                : m.target
                  ? `TARGET: ${m.target}`
                  : rightTeam.shortName,
              W * 0.766,
              H * 0.225
            );

            // Helper to draw player portrait + text
            if (imagesRef.current.batter1) {
              ctx.drawImage(imagesRef.current.batter1, W * 0.018, H * 0.556, H * 0.195, H * 0.195);
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 54px "Barlow Condensed", sans-serif';
            ctx.fillText(String(m.batter1.runs), W * 0.235, H * 0.635);
            ctx.fillStyle = '#BAE6FD';
            ctx.font = 'bold 17px "JetBrains Mono", monospace';
            ctx.fillText(`(${m.batter1.balls} balls)`, W * 0.235, H * 0.695);

            // Batter 1 Name & Stats
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 21px "Barlow Condensed", sans-serif';
            ctx.fillText(
              `${m.batter1.name}${m.batter1.onStrike ? ' *' : ''}`.toUpperCase().slice(0, 24),
              W * 0.167,
              H * 0.81
            );
            ctx.fillStyle = '#060911';
            ctx.fillRect(W * 0.016, H * 0.843, W * 0.302, H * 0.039);
            ctx.fillStyle = '#FCD34D';
            ctx.font = 'bold 15px "JetBrains Mono", monospace';
            ctx.fillText(
              `4s: ${m.batter1.fours}  |  6s: ${m.batter1.sixes}  |  SR: ${m.batter1.strikeRate}`,
              W * 0.167,
              H * 0.863
            );

            // Batter 2
            if (imagesRef.current.batter2) {
              ctx.drawImage(imagesRef.current.batter2, W * 0.354, H * 0.556, H * 0.195, H * 0.195);
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 54px "Barlow Condensed", sans-serif';
            ctx.fillText(String(m.batter2.runs), W * 0.568, H * 0.635);
            ctx.fillStyle = '#BAE6FD';
            ctx.font = 'bold 17px "JetBrains Mono", monospace';
            ctx.fillText(`(${m.batter2.balls} balls)`, W * 0.568, H * 0.695);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 21px "Barlow Condensed", sans-serif';
            ctx.fillText(
              `${m.batter2.name}${m.batter2.onStrike ? ' *' : ''}`.toUpperCase().slice(0, 24),
              W * 0.5,
              H * 0.81
            );
            ctx.fillStyle = '#060911';
            ctx.fillRect(W * 0.353, H * 0.843, W * 0.294, H * 0.039);
            ctx.fillStyle = '#FCD34D';
            ctx.font = 'bold 15px "JetBrains Mono", monospace';
            ctx.fillText(
              `4s: ${m.batter2.fours}  |  6s: ${m.batter2.sixes}  |  SR: ${m.batter2.strikeRate}`,
              W * 0.5,
              H * 0.863
            );

            // Bowler
            if (imagesRef.current.bowler) {
              ctx.drawImage(imagesRef.current.bowler, W * 0.684, H * 0.556, H * 0.19, H * 0.19);
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px "Barlow Condensed", sans-serif';
            ctx.fillText(m.bowler.name.toUpperCase().slice(0, 20), W * 0.89, H * 0.635);
            ctx.fillStyle = '#FEF3C7';
            ctx.font = 'bold 14px "JetBrains Mono", monospace';
            ctx.fillText(`O: ${m.bowler.overs} · M: ${m.bowler.maidens}`, W * 0.89, H * 0.685);

            // Bowler Econ & Figures
            ctx.fillStyle = '#B8860B';
            ctx.fillRect(W * 0.686, H * 0.776, W * 0.294, H * 0.046);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 19px "Barlow Condensed", sans-serif';
            ctx.fillText(`Econ: ${m.bowler.economy}`, W * 0.833, H * 0.799);

            ctx.fillStyle = '#060911';
            ctx.fillRect(W * 0.68, H * 0.832, W * 0.306, H * 0.048);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px "Barlow Condensed", sans-serif';
            ctx.fillText(
              `${m.bowler.wickets}-${m.bowler.runs} (${m.bowler.overs})`,
              W * 0.833,
              H * 0.856
            );

            // Bottom Ticker
            ctx.fillStyle = '#050912';
            ctx.fillRect(W * 0.156, H * 0.929, W * 0.696, H * 0.06);
            ctx.fillStyle = '#FCD34D';
            ctx.font = 'bold 18px "Barlow Condensed", sans-serif';
            ctx.fillText(
              (m.lastWicket || m.equation || m.status).toUpperCase().slice(0, 72),
              W * 0.504,
              H * 0.959
            );
          }
        }
      }

      rafRef.current = window.requestAnimationFrame(drawFrame);
    };

    rafRef.current = window.requestAnimationFrame(drawFrame);
    return () => {
      active = false;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [open, backdropMode, selectedLayoutId]);

  const stopLiveStream = async () => {
    if (statusTimerRef.current) {
      window.clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    const token = streamTokenRef.current;
    streamTokenRef.current = null;
    if (token) {
      await fetch(`/api/stream/stop/${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
    }

    setStreamState('idle');
    setStatusMessage('لائیو اسٹریم بند کر دی گئی ہے۔');
  };

  useEffect(() => {
    return () => {
      if (streamTokenRef.current) {
        stopLiveStream();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLiveStream = async () => {
    if (!streamKey.trim()) {
      setStreamState('error');
      setStatusMessage('براہ کرم اپنی یوٹیوب اسٹریم کی (Stream Key) درج کریں۔');
      return;
    }

    setStreamState('connecting');
    setStatusMessage('یوٹیوب سرور سے کنکشن قائم کیا جا رہا ہے...');
    setElapsedSeconds(0);
    setBytesSent(0);

    try {
      let combinedStream: MediaStream;
      let hasAudio = false;

      if (captureSource === 'screen') {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: true,
        });
        combinedStream = displayStream;
        hasAudio = displayStream.getAudioTracks().length > 0;
      } else {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Broadcast canvas not ready');
        const canvasStream = canvas.captureStream(30);
        if (useMic) {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          for (const audioTrack of micStream.getAudioTracks()) {
            canvasStream.addTrack(audioTrack);
            hasAudio = true;
          }
        }
        combinedStream = canvasStream;
      }

      mediaStreamRef.current = combinedStream;

      const startRes = await fetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rtmpUrl: rtmpUrl.trim(),
          streamKey: streamKey.trim(),
          hasAudio,
        }),
      });
      const startData = (await startRes.json()) as { streamToken?: string; error?: string };
      if (!startRes.ok || !startData.streamToken) {
        throw new Error(startData.error || 'Failed to initialize YouTube RTMP stream');
      }

      const token = startData.streamToken;
      streamTokenRef.current = token;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0 || !streamTokenRef.current) return;
        const activeToken = streamTokenRef.current;
        chunkQueueRef.current = chunkQueueRef.current.then(async () => {
          if (!streamTokenRef.current) return;
          const buffer = await event.data.arrayBuffer();
          const res = await fetch(`/api/stream/chunk/${encodeURIComponent(activeToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: buffer,
          });
          if (!res.ok) {
            const errJson = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errJson.error || 'Stream rejected by server');
          }
          const json = (await res.json()) as { bytesSent?: number; status?: string };
          if (typeof json.bytesSent === 'number') setBytesSent(json.bytesSent);
          if (json.status === 'live') {
            setStreamState('live');
            setStatusMessage('یوٹیوب پر لائیو نشریات جاری ہیں!');
          }
        }).catch((err: unknown) => {
          setStreamState('error');
          setStatusMessage(err instanceof Error ? err.message : 'Stream disconnected');
          stopLiveStream();
        });
      };

      recorder.start(1000);

      statusTimerRef.current = window.setInterval(async () => {
        if (!streamTokenRef.current) return;
        const res = await fetch(`/api/stream/status/${encodeURIComponent(streamTokenRef.current)}`);
        if (!res.ok) return;
        const st = (await res.json()) as {
          status: 'connecting' | 'live' | 'error' | 'stopped';
          bytesSent: number;
          elapsedSeconds: number;
          lastMessage?: string;
          error?: string;
        };
        setElapsedSeconds(st.elapsedSeconds || 0);
        setBytesSent(st.bytesSent || 0);
        if (st.status === 'live') {
          setStreamState('live');
          setStatusMessage('یوٹیوب پر لائیو نشریات جاری ہیں!');
        } else if (st.status === 'error') {
          setStreamState('error');
          setStatusMessage(st.error || st.lastMessage || 'YouTube RTMP connection error');
          stopLiveStream();
        }
      }, 2000);
    } catch (err) {
      setStreamState('error');
      setStatusMessage(err instanceof Error ? err.message : 'لائیو شروع کرنے میں مسئلہ آیا');
      await stopLiveStream();
    }
  };

  if (!open) return null;

  const formatTimer = (sec: number) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="YouTube Direct Live Stream"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-white/15 bg-[#121821] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Radio
              className={`h-5 w-5 ${streamState === 'live' ? 'text-red-500 animate-pulse' : 'text-red-400'}`}
              aria-hidden="true"
            />
            <h3 className="font-display text-2xl font-bold text-white">
              YouTube ڈائریکٹ لائیو اسٹریمنگ · Go Live
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5">
          {/* Left: Live 1280x720 Canvas Preview */}
          <div className="md:col-span-6 space-y-3">
            <div className="text-xs font-medium text-slate-300">
              اسٹریم آؤٹ پٹ پری ویو (1280×720 HD)
            </div>
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black aspect-video">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0B0F14] px-3 py-2 text-xs">
              <span className="text-slate-400">
                حالت:{' '}
                <strong
                  className={
                    streamState === 'live'
                      ? 'text-emerald-400'
                      : streamState === 'error'
                        ? 'text-red-400'
                        : 'text-white'
                  }
                >
                  {streamState === 'live'
                    ? 'LIVE'
                    : streamState === 'connecting'
                      ? 'CONNECTING'
                      : streamState === 'error'
                        ? 'ERROR'
                        : 'READY'}
                </strong>
              </span>
              <span className="font-mono-tabular text-slate-300">
                {formatTimer(elapsedSeconds)} · {(bytesSent / 1024).toFixed(0)} KB
              </span>
            </div>

            {statusMessage && (
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  streamState === 'error'
                    ? 'border-red-500/30 bg-red-950/30 text-red-200'
                    : streamState === 'live'
                      ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                      : 'border-white/10 bg-[#0B0F14] text-slate-300'
                }`}
              >
                {statusMessage}
              </div>
            )}
          </div>

          {/* Right: YouTube Stream Key & Audio Controls */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  YouTube RTMP Server URL
                </label>
                <input
                  type="text"
                  value={rtmpUrl}
                  onChange={(e) => setRtmpUrl(e.target.value)}
                  disabled={streamState === 'live' || streamState === 'connecting'}
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F14] px-3 py-2 font-mono-tabular text-xs text-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  YouTube Stream Key (اسٹریم کی)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    disabled={streamState === 'live' || streamState === 'connecting'}
                    placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                    className="w-full rounded-lg border border-white/10 bg-[#0B0F14] pl-3 pr-9 py-2 font-mono-tabular text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    aria-label={showKey ? 'Hide stream key' : 'Show stream key'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  YouTube Studio &rarr; Go Live سے اپنی Stream Key کاپی کر کے یہاں پیسٹ کریں
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-300 mb-1.5">
                  اسٹریم سورس (Video Source)
                </div>
                <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[#0B0F14] p-1">
                  <button
                    type="button"
                    onClick={() => setCaptureSource('canvas')}
                    disabled={streamState === 'live' || streamState === 'connecting'}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                      captureSource === 'canvas'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    اسکور بورڈ گرافک کینوس
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptureSource('screen')}
                    disabled={streamState === 'live' || streamState === 'connecting'}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                      captureSource === 'screen'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    اسکرین / ٹیب کیپچر
                  </button>
                </div>
              </div>

              {captureSource === 'canvas' && (
                <button
                  type="button"
                  onClick={() => setUseMic((m) => !m)}
                  disabled={streamState === 'live' || streamState === 'connecting'}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    useMic
                      ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300'
                      : 'border-white/10 bg-[#0B0F14] text-slate-300 hover:border-white/25'
                  }`}
                >
                  {useMic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  <span>
                    {useMic
                      ? 'مائیکروفون کمنٹری آن ہے (Mic On)'
                      : 'مائیکروفون آف (خاموش آڈیو ٹریک)'}
                  </span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              {streamState === 'live' || streamState === 'connecting' ? (
                <button
                  type="button"
                  onClick={stopLiveStream}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 border border-white/15 cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>اسٹریم بند کریں (Stop Live)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startLiveStream}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <Radio className="h-4 w-4" aria-hidden="true" />
                  <span>YouTube لائیو شروع کریں</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
