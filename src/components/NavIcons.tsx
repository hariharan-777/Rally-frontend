// Icons for the bottom navigation bar. All 24×24, all in full colour — they keep their colours
// whether or not their tab is selected; the label underneath shows which tab is active.

// The Rally logo — a football in flames. Loaded from public/rally-logo.svg, the same file the
// browser tab uses as its icon, so the logo is defined in exactly one place.
export function FlamingBallIcon() {
  return <img src="/rally-logo.svg" width={26} height={26} alt="" />
}

// Two crossed rackets (one blue, one orange) with a tennis ball above them.
export function GamesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" strokeLinecap="round" aria-hidden="true">
      {/* handles first, so the racket heads sit on top where they cross */}
      <path d="M10.5 10.5 L14.6 17" stroke="#2563eb" strokeWidth="1.8" />
      <path d="M14.6 17 L17 21" stroke="#1f2937" strokeWidth="2.6" />
      <path d="M13.5 10.5 L9.4 17" stroke="#f97316" strokeWidth="1.8" />
      <path d="M9.4 17 L7 21" stroke="#1f2937" strokeWidth="2.6" />
      {/* racket heads: light string bed with a coloured frame */}
      <ellipse cx="8" cy="7" rx="4" ry="5" transform="rotate(-35 8 7)" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.8" />
      <ellipse cx="16" cy="7" rx="4" ry="5" transform="rotate(35 16 7)" fill="#ffedd5" stroke="#f97316" strokeWidth="1.8" />
      {/* ball */}
      <circle cx="12" cy="3.2" r="2" fill="#d4ee3a" stroke="#a9c22a" strokeWidth="0.6" />
    </svg>
  )
}

// A calendar with a red header and a green tick — a confirmed booking.
export function BookingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="#fff" stroke="#94a3b8" strokeWidth="1.2" />
      <path d="M6 5 H18 A2.5 2.5 0 0 1 20.5 7.5 V10 H3.5 V7.5 A2.5 2.5 0 0 1 6 5 Z" fill="#ef4444" />
      <path d="M8 3 V7 M16 3 V7" stroke="#334155" strokeWidth="2" />
      <path d="M8.5 15 L11 17.5 L15.5 13" fill="none" stroke="#0b6e4f" strokeWidth="2" />
    </svg>
  )
}

// A person in a Rally-green shirt — the same colours as the map avatar.
export function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M4.5 20.5 C5.5 16 8.5 14 12 14 C15.5 14 18.5 16 19.5 20.5 Z" fill="#0b6e4f" />
      <circle cx="12" cy="8" r="4" fill="#c68b59" />
      <path d="M8 7.5 C8 4.5 10 3.6 12 3.6 C14 3.6 16 4.5 16 7.5 C14.5 6.3 13 6 12 6 C11 6 9.5 6.3 8 7.5 Z" fill="#2b1b10" />
    </svg>
  )
}
