import React from 'react';

interface IconProps {
  size?: number;
}

export const LockIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 1.5L13.5 3.5V7.7C13.5 11.1 11.1 13.7 8 14.5C4.9 13.7 2.5 11.1 2.5 7.7V3.5L8 1.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M5.6 8.1L7.3 9.8L10.6 6.4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CrossIcon: React.FC<IconProps> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M10.5 3.5H4a1.5 1.5 0 0 0-1.5 1.5v6.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M13.5 8a5.5 5.5 0 1 1-1.4-3.7M13.5 2.5v2.8h-2.8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GitBranchIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="4.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="4.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="11.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M4.5 5v6M11.5 8c0 2.5-3 2.5-7 2.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const TerminalIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M4.8 6.2L7 8.1L4.8 10M8.2 10H11"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 2.5V10.2M5 7.5L8 10.5L11 7.5M3 13H13"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SlidersIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M2.5 4.5H6M9.5 4.5H13.5M2.5 11.5H9.5M12.5 11.5H13.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle cx="7.8" cy="4.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="11" cy="11.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SunIcon: React.FC<IconProps> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M8 1.8V3.1M8 12.9V14.2M1.8 8H3.1M12.9 8H14.2M3.6 3.6L4.5 4.5M11.5 11.5L12.4 12.4M12.4 3.6L11.5 4.5M4.5 11.5L3.6 12.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M12.9 9.9A5.4 5.4 0 0 1 6.1 3.1 5.5 5.5 0 1 0 12.9 9.9Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const FileCheckIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M9.5 2H4.5A1.5 1.5 0 0 0 3 3.5v9A1.5 1.5 0 0 0 4.5 14h7A1.5 1.5 0 0 0 13 12.5V5.5L9.5 2Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M6 9.5L7.6 11.1L10.5 8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
