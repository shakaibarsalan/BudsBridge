import { useId } from "react";

/** The app icon: two buds joined by a bridge arc. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="64 64 896 896" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b88d8" />
          <stop offset="1" stopColor="#005a9e" />
        </linearGradient>
      </defs>
      <rect x="64" y="64" width="896" height="896" rx="200" fill={`url(#${id})`} />
      <path d="M300 560 C 360 300, 664 300, 724 560" fill="none" stroke="#fff" strokeWidth="56" strokeLinecap="round" />
      <circle cx="300" cy="640" r="112" fill="#fff" />
      <circle cx="724" cy="640" r="112" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo__word">BudsBridge</span>
    </span>
  );
}
