import { OlaMaps } from 'olamaps-web-sdk'

const apiKey = import.meta.env.VITE_OLA_MAPS_API_KEY

// Fail loudly at startup instead of rendering a blank map with a vague 401.
if (!apiKey) {
  throw new Error('VITE_OLA_MAPS_API_KEY is missing. Copy .env.example to .env.local and add your key.')
}

// One SDK client for the whole app. Every map we create calls olaMaps.init(...).
export const olaMaps = new OlaMaps({ apiKey })
