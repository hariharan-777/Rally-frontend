// The app's colour theme. Change this one line to switch the whole app — map and UI together.
export const THEME: 'light' | 'dark' = 'dark'

// Ola's base-map style for each theme. Both have the same layer names, so the code that
// hides shop/bus-stop icons works on either.
export const MAP_STYLE = `https://api.olamaps.io/tiles/vector/v1/styles/default-${THEME}-standard/style.json`

// The route's outline colour: white on the light map, near-black on the dark one, so the fire
// line always has a contrasting edge.
export const ROUTE_CASING_COLOR = THEME === 'dark' ? '#000000' : '#ffffff'

// Puts data-theme="dark" (or "light") on <html>. index.css swaps its colour variables based on it.
export function applyTheme() {
  document.documentElement.dataset.theme = THEME
}
