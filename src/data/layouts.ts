export type BroadcastLayoutId =
  | 'free-classic'
  | 'pro-champions-gold'
  | 'pro-psl-neon'
  | 'pro-crimson-arena'
  | 'pro-ultra-cyan'
  | 'pro-platinum-elite'
  | 'pro-royal-trophy';

export interface BoxRect {
  left: number; // 0..100 percentage
  top: number;
  width: number;
  height: number;
}

export interface ProLayoutPreset {
  id: Exclude<BroadcastLayoutId, 'free-classic'>;
  name: string;
  urduTitle: string;
  subtitle: string;
  imageUrl: string;
  accentHex: string;
  priceLabel: string;
  tickerBg?: string;
  coords: {
    leftFlag: BoxRect;
    rightFlag: BoxRect;
    leftTeamBanner?: BoxRect;
    rightTeamBanner?: BoxRect;
    leftScore: BoxRect;
    rightScore: BoxRect;
    centerLive: BoxRect;
    centerRuns: BoxRect;
    centerOver: BoxRect;
    centerAction: BoxRect;
    batter1Card: BoxRect;
    batter1Stats: BoxRect;
    batter2Card: BoxRect;
    batter2Stats: BoxRect;
    bowlerCard: BoxRect;
    bowlerStats: BoxRect;
    ticker: BoxRect;
  };
}

export const OWNER_WHATSAPP_DISPLAY = '0332-7364509';
export const OWNER_WHATSAPP_RAW = '923327364509';
export const OWNER_EMAIL = 'tagvideo494@gmail.com';

export const PRO_LAYOUTS: ProLayoutPreset[] = [
  {
    id: 'pro-champions-gold',
    name: 'Champions Gold Pro',
    urduTitle: 'چیمپئنز گولڈ پرو لے آؤٹ',
    subtitle: 'Royal Sapphire & Metallic Gold Stadium Broadcast',
    imageUrl: '/src/assets/images/layout_champions_gold_1795695080713.jpg',
    accentHex: '#F59E0B',
    priceLabel: 'Paid Pro',
    coords: {
      leftFlag: { left: 5.9, top: 6.1, width: 4.9, height: 8.6 },
      rightFlag: { left: 72.4, top: 6.1, width: 4.9, height: 8.6 },
      leftScore: { left: 7.0, top: 10.0, width: 19.8, height: 21.5 },
      rightScore: { left: 73.2, top: 10.0, width: 20.0, height: 21.5 },
      centerLive: { left: 42.2, top: 7.3, width: 15.6, height: 3.4 },
      centerRuns: { left: 41.8, top: 11.2, width: 16.4, height: 5.0 },
      centerOver: { left: 39.5, top: 17.6, width: 21.0, height: 4.8 },
      centerAction: { left: 38.0, top: 23.4, width: 24.0, height: 5.0 },
      batter1Card: { left: 6.5, top: 66.5, width: 25.8, height: 15.2 },
      batter1Stats: { left: 6.5, top: 84.3, width: 25.8, height: 4.0 },
      batter2Card: { left: 37.1, top: 66.5, width: 25.8, height: 15.2 },
      batter2Stats: { left: 37.1, top: 84.3, width: 25.8, height: 4.0 },
      bowlerCard: { left: 67.8, top: 66.5, width: 25.8, height: 15.2 },
      bowlerStats: { left: 67.8, top: 84.3, width: 25.8, height: 4.0 },
      ticker: { left: 6.6, top: 91.4, width: 86.8, height: 4.8 },
    },
  },
  {
    id: 'pro-psl-neon',
    name: 'PSL Neon Floodlight',
    urduTitle: 'پی ایس ایل نیون نائٹ لے آؤٹ',
    subtitle: 'Emerald Green & Electric Lime Cyber T20 Theme',
    imageUrl: '/src/assets/images/layout_psl_neon_1795695081074.jpg',
    accentHex: '#10B981',
    priceLabel: 'Paid Pro',
    coords: {
      leftFlag: { left: 6.9, top: 9.7, width: 5.4, height: 8.6 },
      rightFlag: { left: 87.7, top: 9.7, width: 5.4, height: 8.6 },
      leftScore: { left: 13.1, top: 8.0, width: 19.5, height: 12.6 },
      rightScore: { left: 67.2, top: 8.0, width: 19.6, height: 12.6 },
      centerLive: { left: 42.0, top: 6.8, width: 16.0, height: 3.3 },
      centerRuns: { left: 38.2, top: 10.6, width: 23.6, height: 6.8 },
      centerOver: { left: 40.5, top: 18.6, width: 19.0, height: 4.4 },
      centerAction: { left: 38.0, top: 24.2, width: 24.0, height: 5.0 },
      batter1Card: { left: 10.0, top: 70.3, width: 21.4, height: 11.4 },
      batter1Stats: { left: 10.0, top: 83.4, width: 21.4, height: 5.0 },
      batter2Card: { left: 38.3, top: 70.3, width: 23.4, height: 11.4 },
      batter2Stats: { left: 38.3, top: 83.4, width: 23.4, height: 5.0 },
      bowlerCard: { left: 67.4, top: 70.3, width: 22.2, height: 11.4 },
      bowlerStats: { left: 67.4, top: 83.4, width: 22.2, height: 5.0 },
      ticker: { left: 12.0, top: 91.5, width: 76.0, height: 4.6 },
    },
  },
  {
    id: 'pro-crimson-arena',
    name: 'Mega Arena Crimson',
    urduTitle: 'میگا ایرینا کرمسن لے آؤٹ',
    subtitle: 'Crimson Red & Molten Gold High-Voltage Franchise UI',
    imageUrl: '/src/assets/images/layout_crimson_arena_1795695080452.jpg',
    accentHex: '#EF4444',
    priceLabel: 'Paid Pro',
    coords: {
      leftFlag: { left: 6.4, top: 8.9, width: 6.2, height: 10.8 },
      rightFlag: { left: 87.1, top: 8.9, width: 6.2, height: 10.8 },
      leftScore: { left: 14.8, top: 8.4, width: 21.0, height: 11.8 },
      rightScore: { left: 64.0, top: 8.4, width: 21.0, height: 11.8 },
      centerLive: { left: 42.2, top: 8.0, width: 15.6, height: 3.2 },
      centerRuns: { left: 39.2, top: 11.6, width: 21.6, height: 6.8 },
      centerOver: { left: 39.5, top: 20.5, width: 21.0, height: 4.8 },
      centerAction: { left: 37.8, top: 26.5, width: 24.4, height: 5.2 },
      batter1Card: { left: 12.0, top: 69.8, width: 23.8, height: 12.5 },
      batter1Stats: { left: 12.0, top: 84.6, width: 23.8, height: 4.2 },
      batter2Card: { left: 38.1, top: 69.8, width: 23.8, height: 12.5 },
      batter2Stats: { left: 38.1, top: 84.6, width: 23.8, height: 4.2 },
      bowlerCard: { left: 64.2, top: 69.8, width: 23.8, height: 12.5 },
      bowlerStats: { left: 64.2, top: 84.6, width: 23.8, height: 4.2 },
      ticker: { left: 12.0, top: 90.6, width: 76.0, height: 4.2 },
    },
  },
  {
    id: 'pro-ultra-cyan',
    name: 'World Cup Ultra Cyan',
    urduTitle: 'ورلڈ کپ الٹرا سیان لے آؤٹ',
    subtitle: 'Midnight Indigo & Ice Cyan Championship Graphics',
    imageUrl: '/src/assets/images/layout_ultra_cyan_1795695080444.jpg',
    accentHex: '#06B6D4',
    priceLabel: 'Paid Pro',
    coords: {
      leftFlag: { left: 7.0, top: 10.1, width: 7.8, height: 14.2 },
      rightFlag: { left: 85.0, top: 10.1, width: 7.8, height: 14.2 },
      leftScore: { left: 15.8, top: 8.2, width: 16.2, height: 18.8 },
      rightScore: { left: 68.0, top: 8.2, width: 16.2, height: 18.8 },
      centerLive: { left: 42.0, top: 7.8, width: 16.0, height: 3.3 },
      centerRuns: { left: 36.2, top: 11.4, width: 27.6, height: 7.4 },
      centerOver: { left: 39.2, top: 20.6, width: 21.6, height: 4.8 },
      centerAction: { left: 37.8, top: 26.6, width: 24.4, height: 5.2 },
      batter1Card: { left: 5.8, top: 67.2, width: 27.4, height: 16.2 },
      batter1Stats: { left: 5.8, top: 85.3, width: 27.4, height: 3.7 },
      batter2Card: { left: 36.3, top: 67.2, width: 27.4, height: 16.2 },
      batter2Stats: { left: 36.3, top: 85.3, width: 27.4, height: 3.7 },
      bowlerCard: { left: 66.8, top: 67.2, width: 27.4, height: 16.2 },
      bowlerStats: { left: 66.8, top: 85.3, width: 27.4, height: 3.7 },
      ticker: { left: 6.2, top: 91.8, width: 87.6, height: 4.4 },
    },
  },
  {
    id: 'pro-platinum-elite',
    name: 'Heritage Platinum Elite',
    urduTitle: 'ہیریٹیج پلاٹینم ایلیٹ لے آؤٹ',
    subtitle: 'Brushed Titanium & Forest Champagne Classic TV',
    imageUrl: '/src/assets/images/layout_platinum_elite_1795695080116.jpg',
    accentHex: '#94A3B8',
    priceLabel: 'Paid Pro',
    coords: {
      leftFlag: { left: 7.4, top: 8.8, width: 5.8, height: 10.6 },
      rightFlag: { left: 86.8, top: 8.8, width: 5.8, height: 10.6 },
      leftScore: { left: 14.4, top: 8.6, width: 16.8, height: 11.0 },
      rightScore: { left: 68.8, top: 8.6, width: 16.8, height: 11.0 },
      centerLive: { left: 42.0, top: 6.9, width: 16.0, height: 3.2 },
      centerRuns: { left: 40.4, top: 10.6, width: 19.2, height: 7.4 },
      centerOver: { left: 40.4, top: 18.4, width: 19.2, height: 3.5 },
      centerAction: { left: 38.0, top: 23.4, width: 24.0, height: 5.0 },
      batter1Card: { left: 10.9, top: 66.2, width: 23.8, height: 17.5 },
      batter1Stats: { left: 10.9, top: 85.2, width: 23.8, height: 4.1 },
      batter2Card: { left: 38.1, top: 66.2, width: 23.8, height: 17.5 },
      batter2Stats: { left: 38.1, top: 85.2, width: 23.8, height: 4.1 },
      bowlerCard: { left: 65.3, top: 66.2, width: 23.8, height: 17.5 },
      bowlerStats: { left: 65.3, top: 85.2, width: 23.8, height: 4.1 },
      ticker: { left: 11.2, top: 91.5, width: 77.6, height: 4.6 },
    },
  },
  {
    id: 'pro-royal-trophy',
    name: 'Royal Trophy Gold',
    urduTitle: 'رائل ٹرافی گولڈ پرو لے آؤٹ',
    subtitle: 'Golden Trophy Centerpiece, Royal Blue & Crimson Gold Stadium TV',
    imageUrl: '/assets/aistudio/file_00000000d5808211aaf7e31eaff90987_4153083f.png',
    accentHex: '#FBBF24',
    priceLabel: 'Paid Pro',
    tickerBg: '#040B1B',
    coords: {
      leftFlag: { left: 1.5, top: 8.6, width: 13.4, height: 20.0 },
      rightFlag: { left: 85.1, top: 8.6, width: 13.4, height: 20.0 },
      leftTeamBanner: { left: 15.8, top: 8.7, width: 24.8, height: 10.6 },
      rightTeamBanner: { left: 59.4, top: 8.7, width: 24.8, height: 10.6 },
      leftScore: { left: 13.0, top: 20.8, width: 27.4, height: 13.4 },
      rightScore: { left: 59.6, top: 20.8, width: 27.4, height: 13.4 },
      centerLive: { left: 44.3, top: 19.6, width: 11.4, height: 4.8 },
      centerRuns: { left: 40.2, top: 24.8, width: 19.6, height: 7.4 },
      centerOver: { left: 41.0, top: 32.8, width: 18.0, height: 4.8 },
      centerAction: { left: 38.5, top: 38.4, width: 23.0, height: 5.2 },
      batter1Card: { left: 3.6, top: 55.8, width: 30.2, height: 21.4 },
      batter1Stats: { left: 3.6, top: 79.4, width: 30.2, height: 6.0 },
      batter2Card: { left: 36.1, top: 55.8, width: 28.0, height: 21.4 },
      batter2Stats: { left: 36.1, top: 79.4, width: 28.0, height: 6.0 },
      bowlerCard: { left: 66.4, top: 55.8, width: 30.0, height: 21.4 },
      bowlerStats: { left: 66.4, top: 79.4, width: 30.0, height: 6.0 },
      ticker: { left: 9.8, top: 90.2, width: 83.2, height: 5.6 },
    },
  },
];

export function getProLayoutById(id?: string): ProLayoutPreset | undefined {
  return PRO_LAYOUTS.find((l) => l.id === id);
}
