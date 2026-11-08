import { useEffect, useRef, useState } from 'react'
import { olaMaps } from './lib/olaMaps'
import { BottomNav, type TabId } from './components/BottomNav'

// Used when we can't get the user's location. [longitude, latitude] — Koramangala, Bengaluru.
const DEFAULT_CENTER: [number, number] = [77.6245, 12.9352]

function App() {
  // A handle to the real <div> in the page, so the SDK knows where to draw.
  const mapContainer = useRef<HTMLDivElement>(null)

  // Which tab is selected. App owns this so it can decide what to show; BottomNav just reports taps.
  const [tab, setTab] = useState<TabId>('venues')

  // True while the user is dragging/zooming the map; the nav bar shrinks while this is true.
  const [mapMoving, setMapMoving] = useState(false)

  // Runs after React has put the <div> on the page.
  useEffect(() => {
    const container = mapContainer.current
    if (!container) return

    // Creates the map at `center`. Only drops a marker when it's the user's real location.
    function showMap(center: [number, number], isUserLocation: boolean) {
      olaMaps
        .init({
          style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
          container,
          center,
          zoom: isUserLocation ? 15 : 13,
        })
        .then((map) => {
          // Shrink the nav as soon as the map starts moving; expand it 1s after it stops.
          let idleTimer: ReturnType<typeof setTimeout> | undefined

          map.on('movestart', () => {
            clearTimeout(idleTimer) // moved again before the 1s was up → cancel the pending expand
            setMapMoving(true)
          })

          map.on('moveend', () => {
            idleTimer = setTimeout(() => setMapMoving(false), 1000)
          })
        })
    }

    // Ask for the location first; the map is only created once we have an answer.
    navigator.geolocation.getCurrentPosition(
      (position) => showMap([position.coords.longitude, position.coords.latitude], true),
      (error) => {
        console.warn('Could not get location, using default:', error.message)
        showMap(DEFAULT_CENTER, false)
      },
      { timeout: 5000 }, // don't wait forever for a GPS/Wi-Fi fix
    )
  }, [])

  return (
    <div className="app">
      <main className="app__screen">
        {/* The map stays mounted on every tab, so switching back doesn't reload it. */}
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

        {/* Other tabs cover the map with a placeholder until we build them. */}
        {tab !== 'venues' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--bg)',
            }}
          >
            {tab} — coming soon
          </div>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} compact={mapMoving} />
    </div>
  )
}

export default App
