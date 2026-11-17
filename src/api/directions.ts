// Gets a driving route between two points from the Ola Directions API.

const DIRECTIONS_API = 'https://api.olamaps.io/routing/v1/directions'
const apiKey = import.meta.env.VITE_OLA_MAPS_API_KEY

export type Route = {
  coordinates: [number, number][] // [lng, lat] points along the road, ready to draw on the map
  distanceMeters: number
  durationSeconds: number
}

// Only the fields we use from Ola's response.
type DirectionsResponse = {
  routes?: {
    overview_polyline: string
    legs: { distance: number; duration: number }[]
  }[]
}

export async function fetchRoute(from: [number, number], to: [number, number]): Promise<Route> {
  const params = new URLSearchParams({
    origin: `${from[1]},${from[0]}`, // the API wants "lat,lng" — the opposite of the map
    destination: `${to[1]},${to[0]}`,
    api_key: apiKey,
  })
  // Ola's directions endpoint is a POST, even though everything is in the URL.
  const response = await fetch(`${DIRECTIONS_API}?${params}`, { method: 'POST' })
  if (!response.ok) throw new Error(`Directions failed (HTTP ${response.status})`)

  const data: DirectionsResponse = await response.json()
  const route = data.routes?.[0]
  if (!route) throw new Error('No route found')

  return {
    coordinates: decodePolyline(route.overview_polyline),
    distanceMeters: route.legs.reduce((sum, leg) => sum + leg.distance, 0),
    durationSeconds: route.legs.reduce((sum, leg) => sum + leg.duration, 0),
  }
}

// The route's shape comes as an "encoded polyline": hundreds of coordinates squeezed into one
// short string (Google's format, also used by Ola). Each number is stored as the *difference*
// from the previous point, ×100000, split into 5-bit chunks, each chunk +63 → one character.
// This undoes that, step by step.
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  // Reads one number: collect 5-bit chunks until a chunk without the "more follows" bit (0x20).
  const readNumber = () => {
    let result = 0
    let shift = 0
    let chunk: number
    do {
      chunk = encoded.charCodeAt(index++) - 63
      result |= (chunk & 0x1f) << shift
      shift += 5
    } while (chunk >= 0x20)
    // The lowest bit says whether the number is negative.
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < encoded.length) {
    lat += readNumber() // differences → add up to get the actual position
    lng += readNumber()
    points.push([lng / 1e5, lat / 1e5]) // back to degrees, in the map's [lng, lat] order
  }
  return points
}
