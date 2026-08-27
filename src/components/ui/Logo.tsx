interface Props {
  size?: number;
  className?: string;
}

const BLADE_D =
  "M 103.94,103.08 L 103.81,103.30 L 103.73,103.58 L 103.69,103.92 L 103.68,104.33 L 103.69,104.81 L 103.71,105.38 L 103.73,106.04 L 103.73,106.78 L 103.70,107.61 L 103.62,108.54 L 103.50,109.55 L 103.30,110.65 L 103.02,111.84 L 102.64,113.11 L 102.16,114.45 L 101.56,115.86 L 100.82,117.33 L 99.93,118.84 L 98.90,120.40 L 97.69,121.97 L 96.31,123.56 L 94.75,125.14 L 93.00,126.70 L 91.05,128.23 L 88.90,129.70 L 86.54,131.10 L 83.98,132.41 L 81.22,133.61 L 78.29,134.61 L 75.27,135.32 L 72.18,135.74 L 69.04,135.87 L 65.87,135.71 L 62.71,135.26 L 59.58,134.52 L 56.50,133.50 L 53.49,132.21 L 50.57,130.65 L 47.78,128.83 L 45.12,126.77 L 42.62,124.48 L 40.29,121.97 L 38.15,119.26 L 36.22,116.38 L 34.51,113.32 L 33.03,110.13 L 31.80,106.81 L 30.82,103.38 L 30.09,99.88 L 29.63,96.31 L 29.44,92.71 L 29.52,89.09 L 29.87,85.48 L 30.49,81.89 L 31.37,78.36 L 32.52,74.90 L 33.85,71.51 L 35.32,68.17 L 36.92,64.89 L 38.66,61.67 L 40.52,58.51 L 42.52,55.41 L 44.64,52.38 L 46.89,49.43 L 49.28,46.55 L 51.79,43.75 L 54.43,41.04 L 57.20,38.41 L 60.11,35.92 L 63.19,33.60 L 66.43,31.47 L 69.80,29.53 L 73.29,27.80 L 76.90,26.28 L 80.60,24.99 L 84.38,23.92 L 88.23,23.08 L 92.13,22.48 L 96.05,22.12 L 100.00,22.00 L 100.00,22.00 L 98.30,22.15 L 96.62,22.62 L 94.98,23.38 L 93.39,24.46 L 91.88,25.83 L 90.46,27.50 L 89.14,29.47 L 87.96,31.73 L 86.92,34.27 L 86.05,37.08 L 85.36,40.16 L 84.82,43.34 L 84.34,46.26 L 83.89,48.92 L 83.47,51.31 L 83.05,53.44 L 82.62,55.31 L 82.16,56.93 L 81.65,58.29 L 81.07,59.41 L 80.42,60.30 L 79.67,60.95 L 78.84,61.43 L 78.03,61.95 L 77.26,62.53 L 76.53,63.16 L 75.85,63.86 L 75.21,64.60 L 74.63,65.40 L 74.09,66.24 L 73.62,67.13 L 73.20,68.06 L 72.84,69.03 L 72.55,70.04 L 72.32,71.08 L 72.16,72.16 L 72.07,73.26 L 72.05,74.39 L 72.10,75.53 L 72.23,76.70 L 72.43,77.88 L 72.72,79.06 L 73.08,80.26 L 73.52,81.46 L 74.04,82.65 L 74.64,83.85 L 75.33,85.03 L 76.09,86.20 L 76.94,87.35 L 77.88,88.48 L 78.89,89.59 L 79.96,90.65 L 81.02,91.65 L 82.07,92.57 L 83.10,93.43 L 84.11,94.22 L 85.10,94.94 L 86.07,95.61 L 87.01,96.21 L 87.92,96.76 L 88.80,97.26 L 89.65,97.70 L 90.46,98.10 L 91.23,98.45 L 91.97,98.76 L 92.66,99.03 L 93.31,99.27 L 93.92,99.47 L 94.48,99.64 L 95.00,99.78 L 95.47,99.90 L 95.90,100.00 L 96.28,100.08 L 96.60,100.15 L 96.88,100.20 L 97.11,100.25 L 97.29,100.30 L 97.42,100.34 L 97.50,100.38 L 97.54,100.43 Z";

/**
 * The app mark: three swirling blades — each capped with a small circle,
 * evoking people connected in a spiral — in a purple gradient. Built as one
 * blade path rotated 120°/240° (see scratchpad history) rather than traced
 * from a source vector file, since the original logo only ever reached this
 * app as an inline chat image with no downloadable asset behind it.
 */
export function Logo({ size = 40, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} role="img" aria-label="Splitter">
      <defs>
        <linearGradient id="logo-gLight" x1="10%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D9BDFB" />
          <stop offset="100%" stopColor="#A970E8" />
        </linearGradient>
        <linearGradient id="logo-gMid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9530CC" />
          <stop offset="100%" stopColor="#5C0F9C" />
        </linearGradient>
        <linearGradient id="logo-gDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5C1194" />
          <stop offset="100%" stopColor="#360763" />
        </linearGradient>
        <radialGradient id="logo-cLight" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#DFC3FF" />
          <stop offset="100%" stopColor="#B57BF0" />
        </radialGradient>
        <radialGradient id="logo-cMid" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#D9A8FF" />
          <stop offset="100%" stopColor="#B36FE0" />
        </radialGradient>
        <radialGradient id="logo-cDark" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#7C21C4" />
          <stop offset="100%" stopColor="#480F70" />
        </radialGradient>
      </defs>

      <g transform="rotate(240 100 100)">
        <path d={BLADE_D} fill="url(#logo-gMid)" stroke="#ffffff" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
      <g transform="rotate(120 100 100)">
        <path d={BLADE_D} fill="url(#logo-gLight)" stroke="#ffffff" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
      <g transform="rotate(0 100 100)">
        <path d={BLADE_D} fill="url(#logo-gDark)" stroke="#ffffff" strokeWidth={2.5} strokeLinejoin="round" />
      </g>

      <circle cx={33.12} cy={160.22} r={14} fill="url(#logo-cMid)" />
      <circle cx={185.6} cy={127.81} r={16} fill="url(#logo-cLight)" />
      <circle cx={81.29} cy={11.97} r={14} fill="url(#logo-cDark)" />
    </svg>
  );
}
