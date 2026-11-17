import { useCallback, useEffect, useRef, useState } from 'react'
import { olaMaps } from './lib/olaMaps'
import { BottomNav, type TabId } from './components/BottomNav'
import { VenuePanel, type RouteInfo } from './components/VenuePanel'
import { fetchNearbyVenues, type Venue } from './api/venues'
import { fetchRoute } from './api/directions'
import { createAvatar3D, type Avatar3D } from './lib/avatar3d'

// Used when we can't get the user's location. [longitude, latitude] — Koramangala, Bengaluru.
const DEFAULT_CENTER: [number, number] = [77.6245, 12.9352]

// The avatar is full size at this zoom (street level) and halves with every zoom level further
// out — the same rate the map shrinks — so he stays in proportion. Never smaller than the minimum.
const AVATAR_FULL_SIZE_ZOOM = 15
const AVATAR_MIN_SCALE = 0.3

// Layers in Ola's map style that draw place icons (shops, transit stops, buildings…).
// We hide them so only Rally's own markers stand out. Road and area names stay visible.
const BASE_MAP_PLACE_LAYERS = [
  'poi',
  'poi_tbt',
  'ola-pois',
  'poi_bus',
  'poi_railway',
  'poi_metro',
  'poi_monorail',
  'poi_airport',
  'poi_traffic_signal',
  'building_name',
  'landuse_apartment_name',
]

function App() {
  // A handle to the real <div> in the page, so the SDK knows where to draw.
  const mapContainer = useRef<HTMLDivElement>(null)

  // Which tab is selected. App owns this so it can decide what to show; BottomNav just reports taps.
  const [tab, setTab] = useState<TabId>('venues')

  // True while the user is dragging/zooming the map; the nav bar shrinks while this is true.
  const [mapMoving, setMapMoving] = useState(false)

  // False until the base map's place icons are hidden, so the user never sees them flash.
  const [mapReady, setMapReady] = useState(false)

  // The venue shown in the side panel, and whether the panel is open. Kept separate so that on
  // close the venue stays filled in while the panel slides away, instead of going blank first.
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // useCallback keeps the same function between renders, so VenuePanel's effect
  // (which depends on onClose) doesn't re-run — and re-grab focus — on every render.
  const closePanel = useCallback(() => setPanelOpen(false), [])

  // Road distance and drive time to the selected venue, from the Directions API.
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)

  // The venue the user chose to book. The Bookings tab will use it to show that venue's slots.
  const [bookingVenue, setBookingVenue] = useState<Venue | null>(null)

  function startBooking(venue: Venue) {
    setBookingVenue(venue)
    setPanelOpen(false)
    setTab('bookings')
  }

  // Runs after React has put the <div> on the page.
  useEffect(() => {
    const container = mapContainer.current
    if (!container) return

    // Everything this effect creates, kept here so the cleanup function at the bottom can undo it.
    // `cancelled` flips to true on cleanup; async work that finishes later checks it and backs off.
    let cancelled = false
    let mapInstance: { remove: () => void } | undefined
    let avatar: Avatar3D | undefined
    let idleTimer: ReturnType<typeof setTimeout> | undefined

    // Creates the map at `center`, then loads the sports venues around it.
    function showMap(center: [number, number], isUserLocation: boolean) {
      olaMaps
        .init({
          style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
          container,
          center,
          zoom: isUserLocation ? 15 : 13,
        })
        .then((map) => {
          // init() is async: if we were cleaned up while it was loading, throw this map away.
          if (cancelled) {
            map.remove()
            return
          }
          mapInstance = map

          // Hide the base map's own place icons. The layers only exist once the style has loaded,
          // which may already have happened by the time init() resolves — so handle both cases.
          // `mapShown` resolves once the clean map is visible — the venue pins wait for it.
          const mapShown = new Promise<void>((resolve) => {
            const hideBaseMapPlaces = () => {
              for (const layerId of BASE_MAP_PLACE_LAYERS) {
                if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none')
              }
              // 'idle' = the map has finished redrawing without those layers. Only now reveal it.
              map.once('idle', () => {
                setMapReady(true)
                resolve()
              })
            }
            if (map.isStyleLoaded()) hideBaseMapPlaces()
            else map.once('load', hideBaseMapPlaces)
          })

          // Mark the user's real location with the jumping, spinning 3D avatar.
          // (Not on the fallback location — that isn't where they are.)
          if (isUserLocation) {
            avatar = createAvatar3D()
            olaMaps
              .addMarker({ element: avatar.element, anchor: 'bottom' }) // feet on the spot, not the middle
              .setLngLat(center)
              .addTo(map)

            // Shrink/grow with the map instead of staying a fixed size on screen.
            const sizeAvatarForZoom = () => {
              const scale = 2 ** (map.getZoom() - AVATAR_FULL_SIZE_ZOOM) // one level out → half
              avatar?.setScale(Math.min(1, Math.max(AVATAR_MIN_SCALE, scale)))
            }
            sizeAvatarForZoom()
            map.on('zoom', sizeAvatarForZoom)
          }

          // Shrink the nav as soon as the map starts moving; expand it 1s after it stops.
          map.on('movestart', (event: { originalEvent?: Event }) => {
            clearTimeout(idleTimer) // moved again before the 1s was up → cancel the pending expand
            setMapMoving(true)
            // The user is exploring the map again → get the venue card out of the way.
            // Only for moves made by a finger/mouse (they carry an `originalEvent`), not when our
            // own code moves the camera — e.g. zooming out to fit a route.
            if (event.originalEvent) setPanelOpen(false)
          })

          // Draws the road route from the user to a venue and zooms the map so it all fits.
          // `latestRouteRequest` makes sure that if you tap ball A then quickly ball B, a slow
          // answer for A can't arrive late and draw over B's route.
          let latestRouteRequest = 0
          const showRoute = (venue: Venue) => {
            const requestId = ++latestRouteRequest
            fetchRoute(center, venue.position)
              .then((route) => {
                if (cancelled || requestId !== latestRouteRequest) return

                // Road distance + drive time for the card. Tagged with the venue id so the card
                // only shows it for the venue it belongs to.
                setRouteInfo({
                  venueId: venue.id,
                  distanceMeters: route.distanceMeters,
                  durationSeconds: route.durationSeconds,
                })
                const line = {
                  type: 'Feature' as const,
                  properties: {},
                  geometry: { type: 'LineString' as const, coordinates: route.coordinates },
                }

                // First route: create the source (the data) and three layers that draw it,
                // bottom to top: a soft orange glow, a white casing, and the fire line itself.
                // Later routes just swap the data.
                const source = map.getSource('route')
                if (source) source.setData(line)
                else {
                  // lineMetrics: true makes MapLibre measure how far along the line each point is
                  // (0 at the start, 1 at the end) — needed for a gradient *along* the route.
                  map.addSource('route', { type: 'geojson', data: line, lineMetrics: true })
                  const rounded = { 'line-cap': 'round', 'line-join': 'round' } as const

                  // Glow: wide, blurred and see-through — the "heat" around the flames.
                  map.addLayer({
                    id: 'route-glow',
                    type: 'line',
                    source: 'route',
                    layout: rounded,
                    paint: { 'line-color': '#ff6a1f', 'line-width': 16, 'line-blur': 8, 'line-opacity': 0.45 },
                  })
                  // White casing: keeps the line readable over any street colour.
                  map.addLayer({
                    id: 'route-casing',
                    type: 'line',
                    source: 'route',
                    layout: rounded,
                    paint: { 'line-color': '#ffffff', 'line-width': 8 },
                  })
                  // The fire: pale yellow at your end, through orange, to deep red at the venue.
                  // ['line-progress'] is that 0 → 1 distance along the line.
                  map.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    layout: rounded,
                    paint: {
                      'line-width': 5,
                      'line-gradient': [
                        'interpolate',
                        ['linear'],
                        ['line-progress'],
                        0, '#ffd54f', // start (you): yellow
                        0.35, '#ff9100', // orange
                        0.7, '#ff3d00', // red-orange
                        1, '#b91c1c', // end (venue): deep red
                      ],
                    },
                  })
                }

                // Zoom/pan so the whole route is visible. The big top padding keeps it below the
                // venue card; the bottom padding keeps it above the nav bar.
                const lngs = route.coordinates.map(([lng]) => lng)
                const lats = route.coordinates.map(([, lat]) => lat)
                map.fitBounds(
                  [
                    [Math.min(...lngs), Math.min(...lats)],
                    [Math.max(...lngs), Math.max(...lats)],
                  ],
                  { padding: { top: 190, bottom: 90, left: 40, right: 40 }, maxZoom: 16, duration: 800 },
                )
              })
              .catch((error) => console.error('Could not load route:', error))
          }

          map.on('moveend', () => {
            idleTimer = setTimeout(() => setMapMoving(false), 1000)
          })

          // Load venues while the map is getting ready, but only drop the pins once the map is shown.
          Promise.all([fetchNearbyVenues(center), mapShown])
            .then(([venues]) => {
              if (cancelled) return // map was removed while venues were loading

              // Nearest first, so pins ripple outwards from the user.
              const nearestFirst = [...venues].sort((a, b) => a.distanceMeters - b.distanceMeters)

              nearestFirst.forEach((venue, index) => {
                // The CSS fall animation (index.css) starts after this delay: wait for the 300ms
                // map fade-in, then one ball every 60ms.
                const ball = flamingTennisBall(`${300 + index * 60}ms`)

                // Tapping a ball opens the details panel on the right and shows the route there
                // (only from the user's real location — a route from the fallback spot is meaningless).
                ball.addEventListener('click', () => {
                  setSelectedVenue(venue)
                  setPanelOpen(true)
                  if (isUserLocation) showRoute(venue)
                })

                olaMaps
                  .addMarker({ element: ball }) // our own element instead of Ola's teardrop pin
                  .setLngLat(venue.position)
                  .addTo(map)
              })
            })
            .catch((error) => console.error('Could not load venues:', error))
        })
    }

    // Ask for the location first; the map is only created once we have an answer.
    // A location request can't be cancelled, so a late answer is simply ignored.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!cancelled) showMap([position.coords.longitude, position.coords.latitude], true)
      },
      (error) => {
        if (cancelled) return
        console.warn('Could not get location, using default:', error.message)
        showMap(DEFAULT_CENTER, false)
      },
      {
        timeout: 15000, // Wi-Fi based location on laptops can take a while; 5s was often too short
        maximumAge: 10 * 60 * 1000, // a position from the last 10 minutes is fine — returns instantly
      },
    )

    // Cleanup: React calls this when App unmounts — and, in development StrictMode, once right
    // after the first mount, to prove this cleanup really works.
    return () => {
      cancelled = true
      clearTimeout(idleTimer)
      avatar?.dispose() // stop the 3D loop, free GPU memory
      mapInstance?.remove() // removes the map, its markers, listeners and WebGL context
      setMapReady(false) // so a re-created map fades in cleanly again
      setMapMoving(false)
    }
  }, [])

  return (
    <div className="app">
      <main className="app__screen">
        {/* The map stays mounted on every tab, so switching back doesn't reload it. */}
        <div
          ref={mapContainer}
          style={{
            position: 'absolute',
            inset: 0,
            // Invisible (but still loading and laid out) until ready, then a short fade-in.
            opacity: mapReady ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
        />

        {/* Other tabs cover the map with a placeholder until we build them. */}
        {tab !== 'venues' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--rally-surface)',
              color: 'var(--rally-green)',
            }}
          >
            {tab === 'bookings' && bookingVenue
              ? `Booking ${bookingVenue.name} — coming soon`
              : `${tab} — coming soon`}
          </div>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} compact={mapMoving} />

      {/* Last, so it sits on top of the map and the nav bar. */}
      <VenuePanel venue={selectedVenue} open={panelOpen} onClose={closePanel} onBook={startBooking} routeInfo={routeInfo} />
    </div>
  )
}

// A venue marker: a tennis ball with a fire trail, which falls in after `dropDelay`.
// Styles and animations live in index.css (.venue-ball…).
function flamingTennisBall(dropDelay: string): HTMLElement {
  const marker = document.createElement('div')
  marker.className = 'venue-ball'
  marker.style.setProperty('--drop-delay', dropDelay)

  // Static markup only (no venue data), so innerHTML is safe here.
  marker.innerHTML = `
    <div class="venue-ball__fall">
      <div class="venue-ball__flame"></div>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#d4ee3a" stroke="#a9c22a" stroke-width="1" />
        <path d="M3.6 5.8 C8.8 9 8.8 15 3.6 18.2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
        <path d="M20.4 5.8 C15.2 9 15.2 15 20.4 18.2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
        <circle cx="8.5" cy="7.5" r="3.5" fill="#fff" opacity="0.3" />
      </svg>
    </div>`
  return marker
}

export default App
