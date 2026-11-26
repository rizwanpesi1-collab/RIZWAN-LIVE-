import React, { useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Search, Trophy } from 'lucide-react';
import type {
  GroundingSource,
  LiveCricketMatch,
  MatchCategory,
  TournamentSummary,
} from '../types/cricket';

interface LiveMatchesPanelProps {
  matches: LiveCricketMatch[];
  tournaments: TournamentSummary[];
  sources: GroundingSource[];
  selectedMatchId?: string;
  loading: boolean;
  error: string | null;
  fetchedAt?: string;
  onSelectMatch: (match: LiveCricketMatch) => void;
  onRefreshFeed: () => void;
}

const FILTER_TABS: Array<{ id: MatchCategory; label: string }> = [
  { id: 'all', label: 'تمام میچز · All' },
  { id: 'live', label: 'لائیو · Live Now' },
  { id: 'icc_event', label: 'ICC ایونٹس' },
  { id: 'international', label: 'انٹرنیشنل' },
  { id: 't20_league', label: 'T20 لیگز' },
  { id: 'domestic', label: 'ڈومیسٹک' },
];

export const LiveMatchesPanel: React.FC<LiveMatchesPanelProps> = ({
  matches,
  tournaments,
  sources,
  selectedMatchId,
  loading,
  error,
  fetchedAt,
  onSelectMatch,
  onRefreshFeed,
}) => {
  const [activeFilter, setActiveFilter] = useState<MatchCategory>('all');
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return matches.filter((m) => {
      if (activeFilter === 'live' && !m.isLive) return false;
      if (
        activeFilter !== 'all' &&
        activeFilter !== 'live' &&
        m.category !== activeFilter
      ) {
        return false;
      }
      if (selectedTournament !== 'all' && m.tournament !== selectedTournament) {
        return false;
      }
      if (q) {
        const hay = `${m.tournament} ${m.team1.name} ${m.team2.name} ${m.venue} ${m.format}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, activeFilter, selectedTournament, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Live Matches Section */}
      <section id="live-matches" className="rounded-xl border border-white/10 bg-[#121821] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              لائیو کرکٹ میچز · Live Cricket Feed
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              ریئل ٹائم انٹرنیشنل اور لیگ اسکورز — کسی بھی میچ پر کلک کر کے براڈکاسٹ پر چلائیں
              {fetchedAt ? ` · آخری اپ ڈیٹ: ${new Date(fetchedAt).toLocaleTimeString()}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ٹیم یا ٹورنامنٹ تلاش کریں..."
                className="w-52 sm:w-64 rounded-lg border border-white/10 bg-[#0B0F14] pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={onRefreshFeed}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#1A222E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#222C3B] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>ری فریش لائیو</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-[#0B0F14] p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveFilter(tab.id);
                setSelectedTournament('all');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={onRefreshFeed}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer shrink-0"
            >
              دوبارہ کوشش کریں
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && matches.length === 0 ? (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 rounded-lg border border-white/10 bg-[#0D131B] p-4 animate-pulse"
              >
                <div className="h-4 w-2/3 rounded bg-slate-800" />
                <div className="mt-5 h-7 w-1/2 rounded bg-slate-800" />
                <div className="mt-3 h-7 w-1/2 rounded bg-slate-800" />
                <div className="mt-4 h-3 w-3/4 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="mt-5 rounded-lg border border-white/10 bg-[#0D131B] p-8 text-center">
            <p className="text-sm font-medium text-slate-300">
              اس فلٹر میں کوئی میچ نہیں ملا۔ تمام میچز دیکھنے کے لیے فلٹر صاف کریں۔
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSelectedTournament('all');
                setSearchQuery('');
              }}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
            >
              تمام میچز دکھائیں
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMatches.map((m, idx) => {
              const isSelected = m.id === selectedMatchId;
              return (
                <button
                  key={`${m.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectMatch(m)}
                  className={`group flex flex-col justify-between rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-[#15202B]'
                      : 'border-white/10 bg-[#0D131B] hover:border-white/25 hover:bg-[#131B26]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="truncate font-medium text-slate-300">
                        {m.tournament} · {m.format}
                      </span>
                      {m.isLive ? (
                        <span className="font-semibold text-red-400 shrink-0">LIVE</span>
                      ) : (
                        <span className="text-slate-400 shrink-0">{m.format}</span>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display text-lg font-bold text-white truncate">
                          {m.team1.name}
                        </span>
                        <span className="font-mono-tabular text-base font-bold text-white shrink-0">
                          {m.team1.runs}/{m.team1.wickets}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            ({m.team1.overs})
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display text-lg font-bold text-white truncate">
                          {m.team2.name}
                        </span>
                        <span className="font-mono-tabular text-base font-bold text-white shrink-0">
                          {m.team2.runs}/{m.team2.wickets}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            ({m.team2.overs})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-emerald-400">
                      {m.equation || m.status}
                    </span>
                    <span className="text-slate-400 group-hover:text-white shrink-0">
                      {isSelected ? 'منتخب شدہ' : 'اسکرین پر چلائیں'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* All Active Tournaments Section */}
      <section id="tournaments" className="rounded-xl border border-white/10 bg-[#121821] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold text-white">
              تمام ٹورنامنٹس · All Active Tournaments
            </h2>
          </div>
          {selectedTournament !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedTournament('all')}
              className="text-xs font-medium text-emerald-400 hover:underline cursor-pointer"
            >
              تمام ٹورنامنٹس دکھائیں
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tournaments.map((t, idx) => {
            const active = selectedTournament === t.name;
            return (
              <button
                key={`${t.id || t.name}-${idx}`}
                type="button"
                onClick={() => setSelectedTournament(active ? 'all' : t.name)}
                className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-emerald-500 bg-[#15202B]'
                    : 'border-white/10 bg-[#0D131B] hover:border-white/25'
                }`}
              >
                <div className="font-display text-lg font-bold text-white">
                  {t.name}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{t.region} · {t.status}</span>
                  <span className="font-mono-tabular text-emerald-400">
                    {t.activeMatchesCount} میچز
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Web Grounding Sources */}
        {sources.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="text-xs font-medium text-slate-400 mb-2">
              لائیو ڈیٹا کے مستند ذرائع (Live Grounding Sources):
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              {sources.map((src) => (
                <a
                  key={src.uri}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  <span className="truncate max-w-[220px]">{src.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
