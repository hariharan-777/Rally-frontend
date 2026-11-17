import { useEffect, useRef, useState } from 'react'
import type { Venue } from '../api/venues'
import { SlideToBook } from './SlideToBook'

type Props = {
  venue: Venue | null // the venue to show (kept while closing, so the content doesn't vanish mid-slide)
  open: boolean
  onClose: () => void
  onBook: (venue: Venue) => void // App decides what booking means (for now: go to the Bookings tab)
  routeInfo: RouteInfo | null // road distance + drive time, once the route has loaded
}

export type RouteInfo = { venueId: string; distanceMeters: number; durationSeconds: number }

// Google Maps Embed API key (optional). No key → no Street View button.
const GOOGLE_EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY

// A details card that slides into the top-right quarter of the screen when a venue ball is tapped.
// It's always in the page; the `is-open` class slides it on/off screen (see index.css).
export function VenuePanel({ venue, open, onClose, onBook, routeInfo }: Props) {
  // Only use the route if it's for the venue on screen (an older venue's route could still be stored).
  const route = venue && routeInfo?.venueId === venue.id ? routeInfo : null
  const panel = useRef<HTMLElement>(null)

  // Which venue's Street View is open (null = closed). Storing the venue id, not just true/false,
  // means it closes by itself when you tap a different ball.
  const [streetViewFor, setStreetViewFor] = useState<string | null>(null)
  const showStreetView = venue !== null && open && streetViewFor === venue.id

  useEffect(() => {
    if (!open) return

    // Move keyboard focus into the panel, so screen readers announce it and Tab starts here.
    panel.current?.focus()

    // Escape closes it (there's no back button — moving the map or Escape closes the card).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // No backdrop: the panel floats in the top-right corner and the rest of the map stays usable.
  // Moving the map closes it (App.tsx, 'movestart').
  return (
    <>
      <aside
        ref={panel}
        tabIndex={-1} // focusable from code (above), but not a stop when pressing Tab
        className={`venue-panel${open ? ' is-open' : ''}`}
        aria-label="Venue details"
        // `inert` while closed: off-screen buttons can't be tabbed to or read out.
        inert={!open}
      >
        {/* `key` re-creates the body for each venue, so its entrance animation (index.css)
            replays when you tap a different ball while the card is already open. */}
        {/* The green card holds the details; the slider sits below it, outside the card. */}
        {venue && (
          <div className="venue-panel__card">
          <div className="venue-panel__body" key={venue.id}>
            <h2 className="venue-panel__name">{venue.name}</h2>

            {/* One line: distance · drive time · sport · Google "G" link.
                Before the route loads: the straight-line distance from Places. After: the real
                road distance and the drive time (ETA) from the Directions API. */}
            <div className="venue-panel__meta">
              <span>{formatDistance(route ? route.distanceMeters : venue.distanceMeters)}</span>
              {route && (
                <>
                  <span className="venue-panel__dot" aria-hidden="true">·</span>
                  <span className="venue-panel__eta">{formatDuration(route.durationSeconds)}</span>
                </>
              )}
              <span className="venue-panel__dot" aria-hidden="true">·</span>
              <span className="venue-panel__sport">{venue.sport.name}</span>
              <span className="venue-panel__dot" aria-hidden="true">·</span>
              <a
                className="venue-panel__maps-link"
                href={googleMapsUrl(venue)}
                target="_blank" // a new tab on web; the Google Maps app/browser on phones
                rel="noopener noreferrer" // the opened page gets no access back to Rally
                aria-label="Open in Google Maps" // no visible text, so screen readers need this
                title="Open in Google Maps" // tooltip on hover (desktop)
              >
                <GoogleG />
                <svg className="venue-panel__maps-arrow" viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
                  <path d="M7 17 L17 7 M9 7 H17 V15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>

              {/* Street View toggle — only when a Google Embed key is set up. */}
              {GOOGLE_EMBED_KEY && (
                <>
                  <span className="venue-panel__dot" aria-hidden="true">·</span>
                  <button
                    type="button"
                    className={`venue-panel__street-btn${showStreetView ? ' is-active' : ''}`}
                    onClick={() => setStreetViewFor(showStreetView ? null : venue.id)}
                    aria-expanded={showStreetView}
                    aria-label={showStreetView ? 'Hide Street View' : 'Show Street View'}
                    title="Street View"
                  >
                    {/* A little person, like Google's Street View "pegman". */}
                    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                      <circle cx="12" cy="5" r="3" fill="currentColor" />
                      <path d="M8 10 H16 L15 16 H13.5 L13 22 H11 L10.5 16 H9 Z" fill="currentColor" />
                    </svg>
                    Street
                  </button>
                </>
              )}
            </div>

            {/* Google's own Street View widget (Maps Embed API). Google renders it inside the
                iframe with its own branding and credits, which is what makes this allowed. */}
            {showStreetView && GOOGLE_EMBED_KEY && (
              <iframe
                className="venue-panel__street"
                title={`Street View near ${venue.name}`}
                src={streetViewUrl(venue, GOOGLE_EMBED_KEY)}
                loading="lazy"
                allowFullScreen
                // Sends your site's address to Google, so a key restricted to your domain works.
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
          </div>
        )}

        {/* Outside the card: floats on the map just below it.
            `key` gives each venue (and each opening) a fresh slider, back at the start. */}
        {venue && (
          <footer className="venue-panel__footer">
            <SlideToBook key={`${venue.id}-${open}`} onComplete={() => onBook(venue)} />
          </footer>
        )}
      </aside>
    </>
  )
}

// Google's four-colour "G", so it's obvious at a glance that the link goes to Google.
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="12" height="12" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  )
}

// A plain Google Maps search link (free, no API key): name + address finds the right place,
// and Google shows its rating and reviews there.
function googleMapsUrl(venue: Venue): string {
  const query = encodeURIComponent(`${venue.name}, ${venue.fullAddress}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

// Maps Embed API Street View URL. Google finds the nearest Street View photo to the venue's
// position. fov = field of view (zoom): 90° is a natural, slightly wide view.
function streetViewUrl(venue: Venue, key: string): string {
  const [lng, lat] = venue.position
  const params = new URLSearchParams({ key, location: `${lat},${lng}`, fov: '90' })
  return `https://www.google.com/maps/embed/v1/streetview?${params}`
}

// Drive time: 182 → "4 min", 4000 → "1 h 7 min". Rounded up, so we never promise too little.
function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

// 850 → "850 m away", 2340 → "2.3 km away"
function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m away` : `${(meters / 1000).toFixed(1)} km away`
}
