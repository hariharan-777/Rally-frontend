// Finds sports venues near a point using the Ola Places API.
//
// Ola's nearby search returns names and place ids but no coordinates,
// so we look up each place's details to get its location.

const PLACES_API = 'https://api.olamaps.io/places/v1'
const apiKey = import.meta.env.VITE_OLA_MAPS_API_KEY

export type Venue = {
  id: string
  name: string
  address: string // short area name, e.g. "Koramangala, Bengaluru"
  fullAddress: string // street, area, city, PIN code — falls back to `address` if Ola has none
  sport: Sport
  distanceMeters: number
  position: [number, number] // [longitude, latitude], same order as the map
}

export type Sport = { name: string; emoji: string }

// Ola tags every venue just "stadium", so we guess the sport from the venue's name.
// Order matters: the first match wins, so "Table Tennis" must come before "Tennis".
const SPORT_KEYWORDS: { keywords: string[]; sport: Sport }[] = [
  { keywords: ['badminton', 'shuttle', 'birdie'], sport: { name: 'Badminton', emoji: '🏸' } },
  { keywords: ['table tennis', 'tt academy', 'top spin'], sport: { name: 'Table Tennis', emoji: '🏓' } },
  { keywords: ['tennis'], sport: { name: 'Tennis', emoji: '🎾' } },
  { keywords: ['turf', 'football', 'soccer', ' fc'], sport: { name: 'Football', emoji: '⚽' } },
  { keywords: ['cricket'], sport: { name: 'Cricket', emoji: '🏏' } },
  { keywords: ['hockey'], sport: { name: 'Hockey', emoji: '🏑' } },
  { keywords: ['basketball'], sport: { name: 'Basketball', emoji: '🏀' } },
  { keywords: ['swim', 'pool', 'aqua'], sport: { name: 'Swimming', emoji: '🏊' } },
  { keywords: ['golf', 'driving range'], sport: { name: 'Golf', emoji: '⛳' } },
  { keywords: ['shooting'], sport: { name: 'Shooting', emoji: '🎯' } },
  { keywords: ['dance'], sport: { name: 'Dance', emoji: '💃' } },
]
const MULTI_SPORT: Sport = { name: 'Multi-sport', emoji: '🏟️' }

export function guessSport(name: string): Sport {
  const lower = ` ${name.toLowerCase()}` // leading space so ' fc' also matches at the very start
  const match = SPORT_KEYWORDS.find(({ keywords }) => keywords.some((word) => lower.includes(word)))
  return match?.sport ?? MULTI_SPORT
}

// Only the fields we use from Ola's responses.
type NearbyResponse = {
  predictions?: {
    place_id: string
    distance_meters: number
    structured_formatting: { main_text: string; secondary_text: string }
  }[]
}

type DetailsResponse = {
  result?: {
    geometry: { location: { lat: number; lng: number } }
    formatted_address?: string
  }
}

export async function fetchNearbyVenues(center: [number, number], radiusMeters = 5000): Promise<Venue[]> {
  const [lng, lat] = center

  // 1. Nearby search. `stadium` also covers turfs and sports centres in Ola's data.
  const params = new URLSearchParams({
    layers: 'venue',
    types: 'stadium',
    location: `${lat},${lng}`, // careful: the Places API wants "lat,lng", the opposite of the map
    radius: String(radiusMeters),
    limit: '50', // Ola's maximum per request — asking for more still returns 50
    api_key: apiKey,
  })
  const response = await fetch(`${PLACES_API}/nearbysearch?${params}`)
  if (!response.ok) throw new Error(`Nearby search failed (HTTP ${response.status})`)
  const nearby: NearbyResponse = await response.json()
  const places = nearby.predictions ?? []

  // 2. Look up every place's coordinates, all at the same time.
  const venues = await Promise.all(
    places.map(async (place): Promise<Venue | null> => {
      const detailsParams = new URLSearchParams({ place_id: place.place_id, api_key: apiKey })
      const res = await fetch(`${PLACES_API}/details?${detailsParams}`)
      if (!res.ok) return null

      const details: DetailsResponse = await res.json()
      const location = details.result?.geometry.location
      if (!location) return null

      const name = place.structured_formatting.main_text
      const address = place.structured_formatting.secondary_text
      return {
        id: place.place_id,
        name,
        address,
        fullAddress: details.result?.formatted_address || address,
        sport: guessSport(name),
        distanceMeters: place.distance_meters,
        position: [location.lng, location.lat],
      }
    }),
  )

  // Drop any place whose details lookup failed.
  return venues.filter((venue): venue is Venue => venue !== null)
}
