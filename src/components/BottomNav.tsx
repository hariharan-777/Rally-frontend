import { BookingsIcon, FlamingBallIcon, GamesIcon, ProfileIcon } from './NavIcons'

// The tabs in the bottom bar. `as const` makes `id` a fixed set of strings instead of any string.
const TABS = [
  { id: 'venues', label: 'Venues', Icon: FlamingBallIcon },
  { id: 'games', label: 'Games', Icon: GamesIcon },
  { id: 'bookings', label: 'Bookings', Icon: BookingsIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
] as const

export type TabId = (typeof TABS)[number]['id']

type Props = {
  active: TabId
  onChange: (tab: TabId) => void
  // Shrink to a small pill (e.g. while the user is moving the map). Optional — defaults to false.
  compact?: boolean
}

export function BottomNav({ active, onChange, compact = false }: Props) {
  return (
    <nav className={compact ? 'bottom-nav is-compact' : 'bottom-nav'}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === active ? 'bottom-nav__tab is-active' : 'bottom-nav__tab'}
          aria-current={tab.id === active ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <tab.Icon />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
