// Client for the Rally backend's venue endpoint.
//
// Contract: GET /api/venues/nearby?lat=<lat>&lng=<lng>&radius=<meters>
//   → 200 { "venues": Venue[] }
// In dev this is answered by a mock; later by api-gateway → venue-service.

// Empty means "same server as the frontend" (the dev mock). Set it to e.g. http://localhost:4000
// in .env.local once the real backend is running.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export type Sport = 'BADMINTON' | 'FOOTBALL' | 'CRICKET' | 'TENNIS' | 'BASKETBALL' | 'PICKLEBALL'

export type Venue = {
  id: string
  name: string
  address: string
  sports: Sport[]
  location: { lat: number; lng: number } // named fields, so nobody mixes up the order
  distanceMeters: number
}

type NearbyVenuesResponse = {
  venues: Venue[]
}

export async function fetchNearbyVenues(
  center: { lat: number; lng: number },
  radiusMeters = 5000,
): Promise<Venue[]> {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    radius: String(radiusMeters),
  })

  const response = await fetch(`${API_BASE_URL}/api/venues/nearby?${params}`)
  if (!response.ok) {
    throw new Error(`Couldn't load venues (HTTP ${response.status})`)
  }

  const data: NearbyVenuesResponse = await response.json()
  return data.venues
}
