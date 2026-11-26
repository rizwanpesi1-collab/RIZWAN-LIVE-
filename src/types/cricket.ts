import type { BroadcastLayoutId } from '../data/layouts';

export type MatchCategory = 'all' | 'live' | 'icc_event' | 'international' | 't20_league' | 'domestic';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TeamScore {
  name: string;
  shortName: string;
  runs: number | string;
  wickets: number | string;
  overs: string;
  runRate: string;
  colorHex: string;
  flagCode: string;
  isBatting?: boolean;
}

export interface BatterStats {
  name: string;
  runs: number | string;
  balls: number | string;
  fours: number | string;
  sixes: number | string;
  strikeRate: string;
  onStrike: boolean;
  photoUrl?: string;
}

export interface BowlerStats {
  name: string;
  overs: string;
  maidens: number | string;
  runs: number | string;
  wickets: number | string;
  economy: string;
  photoUrl?: string;
}

export type BowlerActionState = 'auto' | 'bowler_running' | 'injury' | 'free_hit';

export interface LiveCricketMatch {
  id: string;
  tournament: string;
  category: Exclude<MatchCategory, 'all' | 'live'>;
  format: string;
  status: string;
  isLive: boolean;
  venue: string;
  team1: TeamScore;
  team2: TeamScore;
  batter1: BatterStats;
  batter2: BatterStats;
  bowler: BowlerStats;
  recentBalls: string[];
  equation: string;
  target: string;
  lastWicket?: string;
  detectedActionStatus?: 'bowler_running' | 'injury' | 'free_hit' | 'break';
  bowlerActionOverride?: BowlerActionState;
  lastUpdated: string;
  sources?: GroundingSource[];
}

export interface TournamentSummary {
  id: string;
  name: string;
  category: Exclude<MatchCategory, 'all' | 'live'>;
  region: string;
  status: string;
  activeMatchesCount: number;
}

export interface LiveCricketFeedResponse {
  matches: LiveCricketMatch[];
  tournaments: TournamentSummary[];
  sources: GroundingSource[];
  fetchedAt: string;
  cached: boolean;
}

export type BackdropMode = 'template' | 'stadium' | 'chroma' | 'dark' | 'custom';
export type BroadcastLanguage = 'bilingual' | 'ur' | 'en';

export interface BroadcastSession {
  sessionId: string;
  match: LiveCricketMatch;
  backdropMode: BackdropMode;
  selectedLayoutId?: BroadcastLayoutId;
  customBackdropUrl?: string;
  language: BroadcastLanguage;
  autoRefresh: boolean;
  updatedAt: string;
}

export interface ImageExtractionResult {
  detectedKind: 'scoreboard' | 'player_portrait' | 'match_scene';
  confidenceNote: string;
  tournament?: string;
  format?: string;
  venue?: string;
  status?: string;
  equation?: string;
  target?: string;
  team1?: Partial<TeamScore>;
  team2?: Partial<TeamScore>;
  batter1?: Partial<BatterStats>;
  batter2?: Partial<BatterStats>;
  bowler?: Partial<BowlerStats>;
  recentBalls?: string[];
}
