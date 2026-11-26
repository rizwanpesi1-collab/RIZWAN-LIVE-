import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { BroadcastStage } from './components/BroadcastStage';
import { StudioPanel } from './components/StudioPanel';
import { LayoutGallerySection } from './components/LayoutGallerySection';
import { LiveMatchesPanel } from './components/LiveMatchesPanel';
import { YouTubeLiveModal } from './components/YouTubeLiveModal';
import type { BroadcastLayoutId } from './data/layouts';
import type {
  BackdropMode,
  BowlerActionState,
  BroadcastLanguage,
  BroadcastSession,
  GroundingSource,
  ImageExtractionResult,
  LiveCricketFeedResponse,
  LiveCricketMatch,
  TournamentSummary,
} from './types/cricket';

function getOverlaySessionIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('overlay');
  if (id && /^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return id;
  }
  return null;
}

function oversToLegalBalls(overs?: string): number | null {
  const clean = (overs || '').trim();
  if (!clean || clean === '-') return null;
  const parts = clean.split('.');
  const completedOvers = Number.parseInt(parts[0], 10);
  const ballsInOver = parts[1] ? Number.parseInt(parts[1], 10) : 0;
  if (Number.isNaN(completedOvers) || Number.isNaN(ballsInOver)) return null;
  return completedOvers * 6 + Math.min(Math.max(ballsInOver, 0), 5);
}

function legalBallsToOvers(totalBalls: number): string {
  const safe = Math.max(0, totalBalls);
  return `${Math.floor(safe / 6)}.${safe % 6}`;
}

function parseBallRuns(token?: string): number {
  const clean = (token || '').trim().toUpperCase();
  const num = Number.parseInt(clean, 10);
  if (!Number.isNaN(num)) return num;
  if (clean.includes('WD') || clean.includes('NB')) return 1;
  return 0;
}

export default function App() {
  const [overlaySessionId, setOverlaySessionId] = useState<string | null>(() =>
    getOverlaySessionIdFromUrl()
  );

  // Live feed state
  const [matches, setMatches] = useState<LiveCricketMatch[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | undefined>();
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Active broadcast state
  const [activeMatch, setActiveMatch] = useState<LiveCricketMatch | null>(null);
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false);
  const [backdropMode, setBackdropMode] = useState<BackdropMode>('template');
  const [selectedLayoutId, setSelectedLayoutId] = useState<BroadcastLayoutId>('free-classic');
  const [unlockedLayoutIds, setUnlockedLayoutIds] = useState<BroadcastLayoutId[]>([]);
  const [activatedEmail, setActivatedEmail] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [customBackdropUrl, setCustomBackdropUrl] = useState<string | undefined>();
  const [language, setLanguage] = useState<BroadcastLanguage>('bilingual');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);

  // Shareable broadcast link state
  const [sessionId, setSessionId] = useState<string | null>(overlaySessionId);
  const [shareUrl, setShareUrl] = useState<string | null>(() =>
    overlaySessionId ? `${window.location.origin}/?overlay=${overlaySessionId}` : null
  );
  const [copied, setCopied] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Preserve uploaded player portraits across live refreshes of the same match
  const playerPhotosRef = useRef<{
    batter1?: string;
    batter2?: string;
    bowler?: string;
  }>({});

  // Sequential ball-by-ball step timers so multi-ball jumps play 1 ball at a time
  const ballStepTimersRef = useRef<number[]>([]);
  const activeMatchRef = useRef<LiveCricketMatch | null>(null);
  activeMatchRef.current = activeMatch;

  const clearBallStepTimers = useCallback(() => {
    for (const tid of ballStepTimersRef.current) {
      window.clearTimeout(tid);
    }
    ballStepTimersRef.current = [];
  }, []);

  useEffect(() => clearBallStepTimers, [clearBallStepTimers]);

  const applyPreservedPhotos = useCallback((match: LiveCricketMatch): LiveCricketMatch => {
    return {
      ...match,
      batter1: {
        ...match.batter1,
        photoUrl: match.batter1.photoUrl || playerPhotosRef.current.batter1,
      },
      batter2: {
        ...match.batter2,
        photoUrl: match.batter2.photoUrl || playerPhotosRef.current.batter2,
      },
      bowler: {
        ...match.bowler,
        photoUrl: match.bowler.photoUrl || playerPhotosRef.current.bowler,
      },
    };
  }, []);

  const commitMatchWithBallStepping = useCallback(
    (incomingRaw: LiveCricketMatch) => {
      const prevMatch = activeMatchRef.current;
      const withPreservedOverride: LiveCricketMatch =
        prevMatch && prevMatch.id === incomingRaw.id && prevMatch.bowlerActionOverride
          ? {
              ...incomingRaw,
              bowlerActionOverride:
                incomingRaw.bowlerActionOverride ?? prevMatch.bowlerActionOverride,
            }
          : incomingRaw;
      const nextMatch = applyPreservedPhotos(withPreservedOverride);

      clearBallStepTimers();

      if (!prevMatch || prevMatch.id !== nextMatch.id) {
        setActiveMatch(nextMatch);
        return;
      }

      const battingKey: 'team1' | 'team2' = nextMatch.team2.isBatting ? 'team2' : 'team1';
      const prevBalls = oversToLegalBalls(prevMatch[battingKey].overs);
      const nextBalls = oversToLegalBalls(nextMatch[battingKey].overs);

      if (prevBalls === null || nextBalls === null) {
        setActiveMatch(nextMatch);
        return;
      }

      const delta = nextBalls - prevBalls;
      if (delta <= 1 || delta > 6) {
        setActiveMatch(nextMatch);
        return;
      }

      // Build sequential 1-ball-at-a-time frames when 2..6 legal balls arrived together
      const nextRunsNum = Number.parseInt(String(nextMatch[battingKey].runs), 10);
      const prevRunsNum = Number.parseInt(String(prevMatch[battingKey].runs), 10);
      const hasNumericRuns = !Number.isNaN(nextRunsNum) && !Number.isNaN(prevRunsNum);
      const nextRecent = nextMatch.recentBalls || [];

      const frames: LiveCricketMatch[] = [];
      for (let step = 1; step < delta; step++) {
        const remainingSteps = delta - step;
        const stepOvers = legalBallsToOvers(prevBalls + step);
        const stepRecent =
          nextRecent.length > remainingSteps
            ? nextRecent.slice(0, nextRecent.length - remainingSteps)
            : nextRecent;

        const futureBalls =
          nextRecent.length >= remainingSteps ? nextRecent.slice(-remainingSteps) : [];
        const futureRuns = futureBalls.reduce((sum, b) => sum + parseBallRuns(b), 0);
        const stepRuns = hasNumericRuns
          ? String(Math.max(prevRunsNum, nextRunsNum - futureRuns))
          : nextMatch[battingKey].runs;

        frames.push({
          ...nextMatch,
          [battingKey]: {
            ...nextMatch[battingKey],
            overs: stepOvers,
            runs: stepRuns,
          },
          recentBalls: stepRecent,
        });
      }
      frames.push(nextMatch);

      // Show step 1 right away, then step through subsequent balls every 1.5s
      setActiveMatch(frames[0]);
      for (let i = 1; i < frames.length; i++) {
        const frame = frames[i];
        const tid = window.setTimeout(() => {
          setActiveMatch((curr) => (curr && curr.id === frame.id ? frame : curr));
        }, i * 1500);
        ballStepTimersRef.current.push(tid);
      }
    },
    [applyPreservedPhotos, clearBallStepTimers]
  );

  const fetchLiveFeed = useCallback(
    async (force = false, silent = false) => {
      if (!silent) {
        setFeedLoading(true);
      }
      setFeedError(null);
      try {
        const res = await fetch(`/api/cricket/live${force ? '?refresh=1' : ''}`);
        const data = (await res.json()) as LiveCricketFeedResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'لائیو کرکٹ ڈیٹا لوڈ کرنے میں ناکامی');
        }

        setMatches(data.matches || []);
        setTournaments(data.tournaments || []);
        setSources(data.sources || []);
        setFetchedAt(data.fetchedAt);

        if (data.matches && data.matches.length > 0) {
          const curr = activeMatchRef.current;
          if (!curr) {
            commitMatchWithBallStepping(data.matches[0]);
          } else {
            const updatedMatch = data.matches.find((m) => m.id === curr.id);
            if (updatedMatch) {
              commitMatchWithBallStepping(updatedMatch);
            }
          }
        }
      } catch (err) {
        if (!silent) {
          setFeedError(
            err instanceof Error ? err.message : 'لائیو کرکٹ فیڈ دستیاب نہیں ہو سکا'
          );
        }
      } finally {
        if (!silent) {
          setFeedLoading(false);
        }
      }
    },
    [commitMatchWithBallStepping]
  );

  // Load overlay session if opened via copied broadcast link
  const fetchOverlaySession = useCallback(
    async (id: string, silent = false) => {
      if (!silent) {
        setFeedLoading(true);
      }
      try {
        const res = await fetch(`/api/broadcast/session/${encodeURIComponent(id)}`);
        if (!res.ok) {
          throw new Error('Broadcast session not found');
        }
        const session = (await res.json()) as BroadcastSession;
        commitMatchWithBallStepping(session.match);
        setBackdropMode(session.backdropMode || 'template');
        setSelectedLayoutId(session.selectedLayoutId || 'free-classic');
        setCustomBackdropUrl(session.customBackdropUrl);
        setLanguage(session.language || 'bilingual');
        setAutoRefresh(session.autoRefresh ?? true);
        setFeedError(null);
      } catch {
        if (!silent) {
          await fetchLiveFeed(false);
        }
      } finally {
        if (!silent) {
          setFeedLoading(false);
        }
      }
    },
    [commitMatchWithBallStepping, fetchLiveFeed]
  );

  // Initial load
  useEffect(() => {
    if (overlaySessionId) {
      fetchOverlaySession(overlaySessionId);
    } else {
      fetchLiveFeed(false);
    }
  }, [overlaySessionId, fetchOverlaySession, fetchLiveFeed]);

  const refreshActiveMatchDetail = useCallback(
    async (silent = false) => {
      const target = activeMatchRef.current;
      if (!target) return;
      if (!silent) {
        setIsRefreshingDetail(true);
      }
      try {
        const res = await fetch('/api/cricket/match-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: target.id,
            team1Name: target.team1.name,
            team2Name: target.team2.name,
            tournament: target.tournament,
          }),
        });
        const detail = (await res.json()) as Partial<LiveCricketMatch> & { error?: string };
        if (!res.ok) {
          throw new Error(detail.error || 'Failed to update match');
        }
        const curr = activeMatchRef.current;
        if (!curr || curr.id !== target.id) return;

        commitMatchWithBallStepping({
          ...curr,
          status: detail.status || curr.status,
          isLive: detail.isLive ?? curr.isLive,
          venue: detail.venue || curr.venue,
          equation: detail.equation || curr.equation,
          target: detail.target || curr.target,
          lastWicket: detail.lastWicket ?? curr.lastWicket,
          detectedActionStatus: detail.detectedActionStatus ?? curr.detectedActionStatus,
          recentBalls:
            detail.recentBalls && detail.recentBalls.length > 0
              ? detail.recentBalls
              : curr.recentBalls,
          team1: { ...curr.team1, ...(detail.team1 || {}) },
          team2: { ...curr.team2, ...(detail.team2 || {}) },
          batter1: { ...curr.batter1, ...(detail.batter1 || {}) },
          batter2: { ...curr.batter2, ...(detail.batter2 || {}) },
          bowler: { ...curr.bowler, ...(detail.bowler || {}) },
          lastUpdated: detail.lastUpdated || new Date().toISOString(),
        });
      } catch {
        if (!silent) {
          fetchLiveFeed(true);
        }
      } finally {
        if (!silent) {
          setIsRefreshingDetail(false);
        }
      }
    },
    [commitMatchWithBallStepping, fetchLiveFeed]
  );

  // Fast ball-by-ball polling (6s active match, 30s full tournament feed, 3s overlay session)
  useEffect(() => {
    if (!autoRefresh) return;

    if (overlaySessionId) {
      const overlayTimer = window.setInterval(() => {
        fetchOverlaySession(overlaySessionId, true);
      }, 3_000);
      return () => window.clearInterval(overlayTimer);
    }

    const detailTimer = window.setInterval(() => {
      if (activeMatchRef.current?.isLive) {
        refreshActiveMatchDetail(true);
      }
    }, 6_000);

    const feedTimer = window.setInterval(() => {
      fetchLiveFeed(true, true);
    }, 30_000);

    return () => {
      window.clearInterval(detailTimer);
      window.clearInterval(feedTimer);
    };
  }, [autoRefresh, overlaySessionId, fetchOverlaySession, refreshActiveMatchDetail, fetchLiveFeed]);

  const handleRefreshSelectedMatchDetail = useCallback(() => {
    refreshActiveMatchDetail(false);
  }, [refreshActiveMatchDetail]);

  const handleSelectMatch = (match: LiveCricketMatch) => {
    clearBallStepTimers();
    const merged = applyPreservedPhotos(match);
    setActiveMatch(merged);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdatePlayerPhoto = (
    role: 'batter1' | 'batter2' | 'bowler',
    dataUrl: string
  ) => {
    playerPhotosRef.current = {
      ...playerPhotosRef.current,
      [role]: dataUrl,
    };
    setActiveMatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [role]: {
          ...prev[role],
          photoUrl: dataUrl,
        },
      };
    });
  };

  const handleApplyImageExtraction = (
    result: ImageExtractionResult,
    uploadedPreviewUrl: string
  ) => {
    setActiveMatch((prev) => {
      const base: LiveCricketMatch = prev || {
        id: `uploaded-${Date.now()}`,
        tournament: result.tournament || 'رضوان کرکٹ لائیو',
        category: 'international',
        format: result.format || 'T20',
        status: result.status || 'Live',
        isLive: true,
        venue: result.venue || '',
        team1: {
          name: 'Team 1',
          shortName: 'T1',
          runs: '0',
          wickets: '0',
          overs: '0.0',
          runRate: '-',
          colorHex: '#1D4ED8',
          flagCode: 'T1',
        },
        team2: {
          name: 'Team 2',
          shortName: 'T2',
          runs: '0',
          wickets: '0',
          overs: '0.0',
          runRate: '-',
          colorHex: '#016B3A',
          flagCode: 'T2',
          isBatting: true,
        },
        batter1: {
          name: 'Batter 1',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: '0.0',
          onStrike: true,
        },
        batter2: {
          name: 'Batter 2',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: '0.0',
          onStrike: false,
        },
        bowler: {
          name: 'Bowler',
          overs: '0.0',
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: '0.0',
        },
        recentBalls: [],
        equation: '',
        target: '',
        lastUpdated: new Date().toISOString(),
      };

      if (result.detectedKind === 'player_portrait') {
        playerPhotosRef.current.batter1 = uploadedPreviewUrl;
        return {
          ...base,
          batter1: {
            ...base.batter1,
            name: result.batter1?.name || base.batter1.name,
            photoUrl: uploadedPreviewUrl,
          },
        };
      }

      const pick = <T,>(val: T | undefined | null, fallback: T): T =>
        val !== undefined && val !== null && val !== '' ? val : fallback;

      return applyPreservedPhotos({
        ...base,
        tournament: pick(result.tournament, base.tournament),
        format: pick(result.format, base.format),
        venue: pick(result.venue, base.venue),
        status: pick(result.status, base.status),
        equation: pick(result.equation, base.equation),
        target: pick(result.target, base.target),
        recentBalls:
          result.recentBalls && result.recentBalls.length > 0
            ? result.recentBalls
            : base.recentBalls,
        team1: {
          ...base.team1,
          name: pick(result.team1?.name, base.team1.name),
          shortName: pick(result.team1?.shortName, base.team1.shortName),
          runs: pick(result.team1?.runs, base.team1.runs),
          wickets: pick(result.team1?.wickets, base.team1.wickets),
          overs: pick(result.team1?.overs, base.team1.overs),
          runRate: pick(result.team1?.runRate, base.team1.runRate),
          colorHex: pick(result.team1?.colorHex, base.team1.colorHex),
        },
        team2: {
          ...base.team2,
          name: pick(result.team2?.name, base.team2.name),
          shortName: pick(result.team2?.shortName, base.team2.shortName),
          runs: pick(result.team2?.runs, base.team2.runs),
          wickets: pick(result.team2?.wickets, base.team2.wickets),
          overs: pick(result.team2?.overs, base.team2.overs),
          runRate: pick(result.team2?.runRate, base.team2.runRate),
          colorHex: pick(result.team2?.colorHex, base.team2.colorHex),
        },
        batter1: {
          ...base.batter1,
          name: pick(result.batter1?.name, base.batter1.name),
          runs: pick(result.batter1?.runs, base.batter1.runs),
          balls: pick(result.batter1?.balls, base.batter1.balls),
          fours: pick(result.batter1?.fours, base.batter1.fours),
          sixes: pick(result.batter1?.sixes, base.batter1.sixes),
          strikeRate: pick(result.batter1?.strikeRate, base.batter1.strikeRate),
          onStrike: result.batter1?.onStrike ?? base.batter1.onStrike,
        },
        batter2: {
          ...base.batter2,
          name: pick(result.batter2?.name, base.batter2.name),
          runs: pick(result.batter2?.runs, base.batter2.runs),
          balls: pick(result.batter2?.balls, base.batter2.balls),
          fours: pick(result.batter2?.fours, base.batter2.fours),
          sixes: pick(result.batter2?.sixes, base.batter2.sixes),
          strikeRate: pick(result.batter2?.strikeRate, base.batter2.strikeRate),
          onStrike: result.batter2?.onStrike ?? base.batter2.onStrike,
        },
        bowler: {
          ...base.bowler,
          name: pick(result.bowler?.name, base.bowler.name),
          overs: pick(result.bowler?.overs, base.bowler.overs),
          maidens: pick(result.bowler?.maidens, base.bowler.maidens),
          runs: pick(result.bowler?.runs, base.bowler.runs),
          wickets: pick(result.bowler?.wickets, base.bowler.wickets),
          economy: pick(result.bowler?.economy, base.bowler.economy),
        },
        lastUpdated: new Date().toISOString(),
      });
    });
  };

  const saveAndGetShareUrl = useCallback(async (): Promise<string | null> => {
    if (!activeMatch) return null;
    setIsSavingLink(true);
    try {
      const res = await fetch('/api/broadcast/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          match: activeMatch,
          backdropMode,
          selectedLayoutId,
          customBackdropUrl,
          language,
          autoRefresh,
        }),
      });
      const data = (await res.json()) as { sessionId?: string; error?: string };
      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || 'Could not save broadcast link');
      }
      setSessionId(data.sessionId);
      const url = `${window.location.origin}/?overlay=${data.sessionId}`;
      setShareUrl(url);
      return url;
    } catch {
      return null;
    } finally {
      setIsSavingLink(false);
    }
  }, [
    activeMatch,
    sessionId,
    backdropMode,
    selectedLayoutId,
    customBackdropUrl,
    language,
    autoRefresh,
  ]);

  // Keep an already-created shareable session synced whenever the user edits or refreshes data
  useEffect(() => {
    if (!sessionId || !activeMatch || overlaySessionId) return;
    const syncTimer = window.setTimeout(() => {
      fetch('/api/broadcast/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          match: activeMatch,
          backdropMode,
          selectedLayoutId,
          customBackdropUrl,
          language,
          autoRefresh,
        }),
      }).catch(() => {});
    }, 150);
    return () => window.clearTimeout(syncTimer);
  }, [
    sessionId,
    activeMatch,
    backdropMode,
    selectedLayoutId,
    customBackdropUrl,
    language,
    autoRefresh,
    overlaySessionId,
  ]);

  const handleSelectLayout = useCallback(
    (layoutId: BroadcastLayoutId) => {
      if (
        layoutId !== 'free-classic' &&
        !adminToken &&
        !unlockedLayoutIds.includes(layoutId)
      ) {
        return;
      }
      setSelectedLayoutId(layoutId);
      setBackdropMode('template');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [adminToken, unlockedLayoutIds]
  );

  const handleCustomerUnlocked = useCallback(
    (email: string, layoutIds: BroadcastLayoutId[]) => {
      setActivatedEmail(email);
      setUnlockedLayoutIds(layoutIds);
      if (
        selectedLayoutId !== 'free-classic' &&
        !adminToken &&
        !layoutIds.includes(selectedLayoutId)
      ) {
        setSelectedLayoutId('free-classic');
      }
    },
    [selectedLayoutId, adminToken]
  );

  const handleAdminAuthenticated = useCallback(
    (token: string, layoutIds: BroadcastLayoutId[]) => {
      setAdminToken(token);
      setUnlockedLayoutIds(layoutIds);
    },
    []
  );

  const handleAdminLogout = useCallback(() => {
    setAdminToken(null);
    setUnlockedLayoutIds([]);
    setActivatedEmail(null);
    setSelectedLayoutId('free-classic');
  }, []);

  const handleCopyLink = async () => {
    const url = await saveAndGetShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  // Clean Full-Screen Broadcast Overlay Mode (when accessed via copied link)
  if (overlaySessionId) {
    return (
      <main className="relative min-h-screen w-full">
        <BroadcastStage
          match={activeMatch}
          loading={feedLoading}
          backdropMode={backdropMode}
          selectedLayoutId={selectedLayoutId}
          customBackdropUrl={customBackdropUrl}
          language={language}
          isOverlayMode
        />
        <button
          type="button"
          onClick={() => {
            window.history.pushState({}, '', '/');
            setOverlaySessionId(null);
          }}
          className="fixed top-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/70 px-3 py-1.5 text-xs font-medium text-slate-200 opacity-30 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>اسٹوڈیو پر واپس</span>
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-slate-100">
      <TopBar
        onCopyLink={handleCopyLink}
        copied={copied}
        isSavingLink={isSavingLink}
      />

      <main className="mx-auto max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero Focal Anchor: Live Cricket Broadcast TV Stage */}
        <BroadcastStage
          match={activeMatch}
          loading={feedLoading}
          backdropMode={backdropMode}
          selectedLayoutId={selectedLayoutId}
          customBackdropUrl={customBackdropUrl}
          language={language}
          isRefreshingDetail={isRefreshingDetail}
          onRefreshMatch={handleRefreshSelectedMatchDetail}
          onOpenYouTubeLive={() => setShowYouTubeModal(true)}
          onUpdatePlayerPhoto={handleUpdatePlayerPhoto}
          onChangeActionOverride={(state: BowlerActionState) =>
            setActiveMatch((prev) =>
              prev ? { ...prev, bowlerActionOverride: state } : prev
            )
          }
        />

        {/* Image Upload Studio + Copyable Broadcast Link */}
        <StudioPanel
          match={activeMatch}
          backdropMode={backdropMode}
          language={language}
          autoRefresh={autoRefresh}
          shareUrl={shareUrl}
          copied={copied}
          isSavingLink={isSavingLink}
          onChangeBackdropMode={setBackdropMode}
          onChangeCustomBackdrop={(url) => {
            setCustomBackdropUrl(url);
            if (backdropMode !== 'template') {
              setBackdropMode('custom');
            }
          }}
          onChangeLanguage={setLanguage}
          onToggleAutoRefresh={setAutoRefresh}
          onUpdatePlayerPhoto={handleUpdatePlayerPhoto}
          onApplyImageExtraction={handleApplyImageExtraction}
          onUpdateMatchField={(updater) =>
            setActiveMatch((prev) => (prev ? updater(prev) : prev))
          }
          onCopyLink={handleCopyLink}
          onOpenYouTubeLive={() => setShowYouTubeModal(true)}
        />

        {/* 5 Pro Paid Broadcast Layouts + WhatsApp 03327364509 Activation + Owner Admin */}
        <LayoutGallerySection
          selectedLayoutId={selectedLayoutId}
          unlockedLayoutIds={unlockedLayoutIds}
          activatedEmail={activatedEmail}
          adminToken={adminToken}
          onSelectLayout={handleSelectLayout}
          onCustomerUnlocked={handleCustomerUnlocked}
          onAdminAuthenticated={handleAdminAuthenticated}
          onAdminLogout={handleAdminLogout}
        />

        {/* Real-Time Live Matches & All Active Tournaments */}
        <LiveMatchesPanel
          matches={matches}
          tournaments={tournaments}
          sources={sources}
          selectedMatchId={activeMatch?.id}
          loading={feedLoading}
          error={feedError}
          fetchedAt={fetchedAt}
          onSelectMatch={handleSelectMatch}
          onRefreshFeed={() => fetchLiveFeed(true)}
        />
      </main>

      <YouTubeLiveModal
        open={showYouTubeModal}
        onClose={() => setShowYouTubeModal(false)}
        match={activeMatch}
        backdropMode={backdropMode}
        selectedLayoutId={selectedLayoutId}
        customBackdropUrl={customBackdropUrl}
      />

      <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-slate-500">
        رضوان کرکٹ · Rizwan Cricket Live Broadcast &amp; Tournament Center
      </footer>
    </div>
  );
}
