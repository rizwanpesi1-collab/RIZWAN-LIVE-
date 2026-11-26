import React from 'react';

export type FlagKind =
  | 'india'
  | 'pakistan'
  | 'sri_lanka'
  | 'australia'
  | 'england'
  | 'south_africa'
  | 'new_zealand'
  | 'bangladesh'
  | 'afghanistan'
  | 'west_indies'
  | 'ireland'
  | 'zimbabwe'
  | 'nepal'
  | 'netherlands'
  | 'scotland'
  | 'usa'
  | 'uae'
  | 'oman'
  | 'namibia'
  | 'canada'
  | 'club';

export function resolveFlagKind(teamName?: string, flagCode?: string): FlagKind {
  const name = (teamName || '').toLowerCase().trim();
  const code = (flagCode || '').toUpperCase().trim();

  // Check multi-word / ambiguous names first
  if (name.includes('west indies') || code === 'WI' || code === 'WIW' || code === 'WIA') return 'west_indies';
  if (name.includes('south africa') || code === 'RSA' || code === 'RSAW' || code === 'SA') return 'south_africa';
  if (name.includes('new zealand') || code === 'NZ' || code === 'NZW' || code === 'NZA') return 'new_zealand';
  if (name.includes('sri lanka') || code === 'SL' || code === 'SLA' || code === 'SLW') return 'sri_lanka';
  if (name.includes('hong kong')) return 'club';

  // Ensure domestic teams (e.g. Indian/Australian states) don't collide with country codes
  const isStateOrFranchise =
    /\b(stars|sixers|thunder|scorchers|heat|strikers|hurricanes|renegades|qalandars|kings|united|zalmi|gladiators|sultans|indians|royals|super kings|knight riders|capitals|sunrisers|titans|victoria|queensland|tasmania|new south wales|western australia|south australia|karnataka|mumbai|delhi|bengal|gujarat|baroda|punjab|rajasthan|vidarbha|saurashtra|tamil nadu|hyderabad|kerala|northern districts|auckland|canterbury|wellington|otago|central districts)\b/i.test(
      name
    );

  if (!isStateOrFranchise) {
    if (name.includes('pakistan') || /^PAK[AWU]?$/.test(code)) return 'pakistan';
    if (name.includes('india') || /^IND[AWU]?$/.test(code)) return 'india';
    if (name.includes('australia') || /^AUS[AWU]?$/.test(code)) return 'australia';
    if (name.includes('england') || /^ENG[AWU]?$/.test(code)) return 'england';
    if (name.includes('bangladesh') || /^BAN[AWU]?$/.test(code)) return 'bangladesh';
    if (name.includes('afghanistan') || /^AFG[AWU]?$/.test(code)) return 'afghanistan';
    if (name.includes('ireland') || /^IRE[AWU]?$/.test(code)) return 'ireland';
    if (name.includes('zimbabwe') || /^ZIM[AWU]?$/.test(code)) return 'zimbabwe';
    if (name.includes('nepal') || code === 'NEP') return 'nepal';
    if (name.includes('netherlands') || code === 'NED') return 'netherlands';
    if (name.includes('scotland') || code === 'SCO') return 'scotland';
    if (name.includes('united states') || name === 'usa' || code === 'USA') return 'usa';
    if (name.includes('united arab emirates') || name === 'uae' || code === 'UAE') return 'uae';
    if (name.includes('oman') || code === 'OMA' || code === 'OMAN') return 'oman';
    if (name.includes('namibia') || code === 'NAM') return 'namibia';
    if (name.includes('canada') || code === 'CAN') return 'canada';
  }

  return 'club';
}

interface TeamFlagProps {
  teamName?: string;
  flagCode?: string;
  colorHex?: string;
  className?: string;
}

export const TeamFlag: React.FC<TeamFlagProps> = ({
  teamName,
  flagCode,
  colorHex = '#0F766E',
  className = 'h-full w-full',
}) => {
  const kind = resolveFlagKind(teamName, flagCode);
  const shortLabel = (flagCode || teamName?.slice(0, 3) || 'TM').toUpperCase().slice(0, 4);

  switch (kind) {
    case 'india':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'India'}>
          <rect width="90" height="20" y="0" fill="#FF9933" />
          <rect width="90" height="20" y="20" fill="#FFFFFF" />
          <rect width="90" height="20" y="40" fill="#138808" />
          <circle cx="45" cy="30" r="8" fill="none" stroke="#000080" strokeWidth="1.6" />
          <circle cx="45" cy="30" r="1.8" fill="#000080" />
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <line
              key={deg}
              x1="45"
              y1="22.5"
              x2="45"
              y2="37.5"
              stroke="#000080"
              strokeWidth="0.9"
              transform={`rotate(${deg} 45 30)`}
            />
          ))}
        </svg>
      );

    case 'pakistan':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Pakistan'}>
          <rect width="90" height="60" fill="#01411C" />
          <rect width="22" height="60" x="0" fill="#FFFFFF" />
          <circle cx="57" cy="30" r="14" fill="#FFFFFF" />
          <circle cx="61" cy="27" r="11.5" fill="#01411C" />
          <polygon
            points="65,19 66.8,23.5 71.5,23.5 67.8,26.3 69.2,30.8 65,28 60.8,30.8 62.2,26.3 58.5,23.5 63.2,23.5"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'sri_lanka':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Sri Lanka'}>
          <rect width="90" height="60" fill="#FFBE29" />
          <rect x="4" y="4" width="13" height="52" fill="#00534E" />
          <rect x="17" y="4" width="13" height="52" fill="#EB7400" />
          <rect x="34" y="4" width="52" height="52" fill="#8D153A" />
          <circle cx="60" cy="30" r="13" fill="#FFBE29" opacity="0.95" />
          <path d="M51 35 C54 22, 66 22, 69 35 L65 38 L55 38 Z" fill="#8D153A" />
          <rect x="38" y="8" width="4" height="4" fill="#FFBE29" />
          <rect x="78" y="8" width="4" height="4" fill="#FFBE29" />
          <rect x="38" y="48" width="4" height="4" fill="#FFBE29" />
          <rect x="78" y="48" width="4" height="4" fill="#FFBE29" />
        </svg>
      );

    case 'australia':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Australia'}>
          <rect width="90" height="60" fill="#00008B" />
          <rect width="42" height="28" fill="#012169" />
          <path d="M0,0 L42,28 M42,0 L0,28" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M0,0 L42,28 M42,0 L0,28" stroke="#C8102E" strokeWidth="2.4" />
          <path d="M21,0 V28 M0,14 H42" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M21,0 V28 M0,14 H42" stroke="#C8102E" strokeWidth="4" />
          <circle cx="21" cy="44" r="5" fill="#FFFFFF" />
          <circle cx="68" cy="14" r="2.8" fill="#FFFFFF" />
          <circle cx="58" cy="28" r="2.8" fill="#FFFFFF" />
          <circle cx="77" cy="25" r="2.8" fill="#FFFFFF" />
          <circle cx="68" cy="46" r="2.8" fill="#FFFFFF" />
          <circle cx="72" cy="34" r="2" fill="#FFFFFF" />
        </svg>
      );

    case 'england':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'England'}>
          <rect width="90" height="60" fill="#FFFFFF" />
          <rect x="38" y="0" width="14" height="60" fill="#CE1124" />
          <rect x="0" y="23" width="90" height="14" fill="#CE1124" />
        </svg>
      );

    case 'south_africa':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'South Africa'}>
          <rect width="90" height="30" y="0" fill="#E03C31" />
          <rect width="90" height="30" y="30" fill="#001489" />
          <path d="M0,0 L42,30 L0,60 Z" fill="#FFFFFF" />
          <path d="M40,22 H90 V38 H40 Z" fill="#FFFFFF" />
          <path d="M0,4 L38,30 L0,56 Z" fill="#007749" />
          <path d="M36,24 H90 V36 H36 Z" fill="#007749" />
          <path d="M0,11 L26,30 L0,49 Z" fill="#FFB81C" />
          <path d="M0,16 L20,30 L0,44 Z" fill="#000000" />
        </svg>
      );

    case 'new_zealand':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'New Zealand'}>
          <rect width="90" height="60" fill="#00247D" />
          <rect width="42" height="28" fill="#012169" />
          <path d="M0,0 L42,28 M42,0 L0,28" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M0,0 L42,28 M42,0 L0,28" stroke="#CC142B" strokeWidth="2.4" />
          <path d="M21,0 V28 M0,14 H42" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M21,0 V28 M0,14 H42" stroke="#CC142B" strokeWidth="4" />
          <circle cx="68" cy="14" r="3.4" fill="#FFFFFF" />
          <circle cx="68" cy="14" r="2.2" fill="#CC142B" />
          <circle cx="58" cy="27" r="3.2" fill="#FFFFFF" />
          <circle cx="58" cy="27" r="2.0" fill="#CC142B" />
          <circle cx="77" cy="25" r="3.2" fill="#FFFFFF" />
          <circle cx="77" cy="25" r="2.0" fill="#CC142B" />
          <circle cx="68" cy="46" r="3.6" fill="#FFFFFF" />
          <circle cx="68" cy="46" r="2.4" fill="#CC142B" />
        </svg>
      );

    case 'bangladesh':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Bangladesh'}>
          <rect width="90" height="60" fill="#006A4E" />
          <circle cx="40" cy="30" r="16" fill="#F42A41" />
        </svg>
      );

    case 'afghanistan':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Afghanistan'}>
          <rect width="30" height="60" x="0" fill="#111111" />
          <rect width="30" height="60" x="30" fill="#BF0000" />
          <rect width="30" height="60" x="60" fill="#007A3D" />
          <circle cx="45" cy="30" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <rect x="41" y="25" width="8" height="10" rx="2" fill="#FFFFFF" opacity="0.85" />
        </svg>
      );

    case 'west_indies':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'West Indies'}>
          <defs>
            <linearGradient id="wiGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8A1538" />
              <stop offset="100%" stopColor="#52081E" />
            </linearGradient>
          </defs>
          <rect width="90" height="60" fill="url(#wiGrad)" />
          <circle cx="45" cy="30" r="19" fill="#007A87" stroke="#F6C945" strokeWidth="2.5" />
          <rect x="38" y="23" width="2.5" height="18" fill="#F6C945" />
          <rect x="43.8" y="23" width="2.5" height="18" fill="#F6C945" />
          <rect x="49.5" y="23" width="2.5" height="18" fill="#F6C945" />
          <rect x="37" y="21" width="16" height="2.2" fill="#FFFFFF" />
          <text x="45" y="49" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            WI
          </text>
        </svg>
      );

    case 'ireland':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Ireland'}>
          <rect width="30" height="60" x="0" fill="#169B62" />
          <rect width="30" height="60" x="30" fill="#FFFFFF" />
          <rect width="30" height="60" x="60" fill="#FF883E" />
        </svg>
      );

    case 'zimbabwe':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Zimbabwe'}>
          <rect width="90" height="8.6" y="0" fill="#006400" />
          <rect width="90" height="8.6" y="8.6" fill="#FFD200" />
          <rect width="90" height="8.6" y="17.2" fill="#D40000" />
          <rect width="90" height="8.6" y="25.8" fill="#000000" />
          <rect width="90" height="8.6" y="34.4" fill="#D40000" />
          <rect width="90" height="8.6" y="43" fill="#FFD200" />
          <rect width="90" height="8.6" y="51.4" fill="#006400" />
          <polygon points="0,0 40,30 0,60" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
          <circle cx="15" cy="30" r="6" fill="#D40000" />
        </svg>
      );

    case 'nepal':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Nepal'}>
          <rect width="90" height="60" fill="#003893" />
          <polygon points="16,4 66,28 32,28 72,56 16,56" fill="#DC143C" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="32" cy="44" r="6" fill="#FFFFFF" />
          <circle cx="30" cy="19" r="4.5" fill="#FFFFFF" />
        </svg>
      );

    case 'netherlands':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Netherlands'}>
          <rect width="90" height="20" y="0" fill="#AE1C28" />
          <rect width="90" height="20" y="20" fill="#FFFFFF" />
          <rect width="90" height="20" y="40" fill="#21468B" />
        </svg>
      );

    case 'scotland':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Scotland'}>
          <rect width="90" height="60" fill="#005EB8" />
          <path d="M0,0 L90,60 M90,0 L0,60" stroke="#FFFFFF" strokeWidth="11" />
        </svg>
      );

    case 'usa':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'USA'}>
          <rect width="90" height="60" fill="#FFFFFF" />
          {[0, 10, 20, 30, 40, 50].map((y) => (
            <rect key={y} width="90" height="5" y={y} fill="#B22234" />
          ))}
          <rect width="40" height="32" fill="#3C3B6E" />
          <circle cx="11" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="21" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="31" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="16" cy="17" r="2" fill="#FFFFFF" />
          <circle cx="26" cy="17" r="2" fill="#FFFFFF" />
          <circle cx="11" cy="24" r="2" fill="#FFFFFF" />
          <circle cx="21" cy="24" r="2" fill="#FFFFFF" />
          <circle cx="31" cy="24" r="2" fill="#FFFFFF" />
        </svg>
      );

    case 'uae':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'UAE'}>
          <rect width="90" height="20" y="0" fill="#00732F" />
          <rect width="90" height="20" y="20" fill="#FFFFFF" />
          <rect width="90" height="20" y="40" fill="#000000" />
          <rect width="24" height="60" x="0" fill="#FF0000" />
        </svg>
      );

    case 'oman':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Oman'}>
          <rect width="90" height="20" y="0" fill="#FFFFFF" />
          <rect width="90" height="20" y="20" fill="#DB161B" />
          <rect width="90" height="20" y="40" fill="#008000" />
          <rect width="26" height="60" x="0" fill="#DB161B" />
          <circle cx="13" cy="15" r="5" fill="#FFFFFF" />
        </svg>
      );

    case 'namibia':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Namibia'}>
          <rect width="90" height="60" fill="#003580" />
          <polygon points="0,60 90,0 90,60" fill="#009543" />
          <path d="M-5,62 L95,-2" stroke="#FFFFFF" strokeWidth="16" />
          <path d="M-5,62 L95,-2" stroke="#D21034" strokeWidth="10" />
          <circle cx="18" cy="16" r="7" fill="#FFCE00" />
        </svg>
      );

    case 'canada':
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || 'Canada'}>
          <rect width="22" height="60" x="0" fill="#FF0000" />
          <rect width="46" height="60" x="22" fill="#FFFFFF" />
          <rect width="22" height="60" x="68" fill="#FF0000" />
          <polygon points="45,14 49,25 58,24 52,32 56,41 45,37 34,41 38,32 32,24 41,25" fill="#FF0000" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 90 60" className={className} aria-label={teamName || shortLabel}>
          <defs>
            <linearGradient id={`club-${shortLabel}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colorHex} />
              <stop offset="100%" stopColor="#09111E" />
            </linearGradient>
          </defs>
          <rect width="90" height="60" fill={`url(#club-${shortLabel})`} />
          <rect x="3" y="3" width="84" height="54" rx="5" fill="none" stroke="#FBBF24" strokeWidth="2.5" opacity="0.85" />
          <text
            x="45"
            y="36"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={shortLabel.length >= 4 ? '18' : '22'}
            fontWeight="900"
            fontFamily="Barlow Condensed, sans-serif"
            letterSpacing="1"
          >
            {shortLabel}
          </text>
        </svg>
      );
  }
};

// Canvas equivalent so YouTube RTMP stream draws matching crisp flags on 1280x720
export function drawTeamFlagOnCanvas(
  ctx: CanvasRenderingContext2D,
  teamName: string,
  flagCode: string,
  colorHex: string,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const kind = resolveFlagKind(teamName, flagCode);
  const shortLabel = (flagCode || teamName?.slice(0, 3) || 'TM').toUpperCase().slice(0, 4);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.clip();

  if (kind === 'india') {
    ctx.fillStyle = '#FF9933';
    ctx.fillRect(x, y, w, h / 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y + h / 3, w, h / 3);
    ctx.fillStyle = '#138808';
    ctx.fillRect(x, y + (h * 2) / 3, w, h / 3);
    ctx.strokeStyle = '#000080';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, h * 0.14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'pakistan') {
    ctx.fillStyle = '#01411C';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w * 0.25, h);
    ctx.beginPath();
    ctx.arc(x + w * 0.63, y + h * 0.5, h * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#01411C';
    ctx.beginPath();
    ctx.arc(x + w * 0.67, y + h * 0.45, h * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.4, h * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'sri_lanka') {
    ctx.fillStyle = '#FFBE29';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#00534E';
    ctx.fillRect(x + w * 0.05, y + h * 0.07, w * 0.14, h * 0.86);
    ctx.fillStyle = '#EB7400';
    ctx.fillRect(x + w * 0.19, y + h * 0.07, w * 0.14, h * 0.86);
    ctx.fillStyle = '#8D153A';
    ctx.fillRect(x + w * 0.37, y + h * 0.07, w * 0.58, h * 0.86);
    ctx.fillStyle = '#FFBE29';
    ctx.beginPath();
    ctx.arc(x + w * 0.66, y + h * 0.5, h * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'australia' || kind === 'new_zealand') {
    ctx.fillStyle = '#00008B';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + w * 0.2, y, w * 0.08, h * 0.48);
    ctx.fillRect(x, y + h * 0.2, w * 0.48, h * 0.08);
    ctx.fillStyle = '#CE1124';
    ctx.fillRect(x + w * 0.215, y, w * 0.05, h * 0.48);
    ctx.fillRect(x, y + h * 0.215, w * 0.48, h * 0.05);
    ctx.fillStyle = kind === 'new_zealand' ? '#CE1124' : '#FFFFFF';
    for (const [sx, sy] of [
      [0.75, 0.25],
      [0.65, 0.48],
      [0.85, 0.44],
      [0.75, 0.76],
    ]) {
      ctx.beginPath();
      ctx.arc(x + w * sx, y + h * sy, h * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'england') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#CE1124';
    ctx.fillRect(x + w * 0.42, y, w * 0.16, h);
    ctx.fillRect(x, y + h * 0.38, w, h * 0.24);
  } else if (kind === 'bangladesh') {
    ctx.fillStyle = '#006A4E';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#F42A41';
    ctx.beginPath();
    ctx.arc(x + w * 0.45, y + h * 0.5, h * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'afghanistan') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, w / 3, h);
    ctx.fillStyle = '#BF0000';
    ctx.fillRect(x + w / 3, y, w / 3, h);
    ctx.fillStyle = '#007A3D';
    ctx.fillRect(x + (w * 2) / 3, y, w / 3, h);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, h * 0.16, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'south_africa') {
    ctx.fillStyle = '#E03C31';
    ctx.fillRect(x, y, w, h / 2);
    ctx.fillStyle = '#001489';
    ctx.fillRect(x, y + h / 2, w, h / 2);
    ctx.fillStyle = '#007749';
    ctx.fillRect(x, y + h * 0.38, w, h * 0.24);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.46, y + h * 0.5);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.2);
    ctx.lineTo(x + w * 0.26, y + h * 0.5);
    ctx.lineTo(x, y + h * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'ireland') {
    ctx.fillStyle = '#169B62';
    ctx.fillRect(x, y, w / 3, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + w / 3, y, w / 3, h);
    ctx.fillStyle = '#FF883E';
    ctx.fillRect(x + (w * 2) / 3, y, w / 3, h);
  } else if (kind === 'netherlands') {
    ctx.fillStyle = '#AE1C28';
    ctx.fillRect(x, y, w, h / 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y + h / 3, w, h / 3);
    ctx.fillStyle = '#21468B';
    ctx.fillRect(x, y + (h * 2) / 3, w, h / 3);
  } else {
    ctx.fillStyle = colorHex || '#0F766E';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 28px "Barlow Condensed", sans-serif';
    ctx.fillText(shortLabel, x + w / 2, y + h / 2);
  }

  ctx.restore();
}
