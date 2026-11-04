export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="rgb(var(--ink))" />
      <path d="M8 22.5h16" stroke="rgb(var(--bg))" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="9" y="16" width="3.2" height="5" rx="1" fill="rgb(var(--bg))" fillOpacity=".55" />
      <rect x="14.4" y="12.5" width="3.2" height="8.5" rx="1" fill="rgb(var(--bg))" fillOpacity=".8" />
      <rect x="19.8" y="8.5" width="3.2" height="12.5" rx="1" fill="rgb(var(--accent-2))" />
    </svg>
  );
}
