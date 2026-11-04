/**
 * The TC monogram, redrawn as hairlines from a screenshot of the logo.
 * It is provisional: replace it with the owner's original file when it arrives.
 */
export function Monogram({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke="currentColor"
    >
      {/* T: a long top bar with drop serifs, and one thick stem */}
      <path d="M8 14 H112" strokeWidth="3" />
      <path d="M8 14 V26 M112 14 V26" strokeWidth="1.5" />
      <path d="M60 14 V146" strokeWidth="7" />
      <path d="M46 148 H74" strokeWidth="2" />
      {/* C: one open arc around the stem */}
      <path d="M188 40 A62 62 0 1 0 188 122" strokeWidth="3" />
    </svg>
  );
}
