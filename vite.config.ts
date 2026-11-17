import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // basicSsl: serve the dev site over HTTPS with a self-signed certificate. Browsers only allow
  // location access on secure pages, so without it a phone opening http://<laptop-ip>:5173
  // silently gets no location.
  plugins: [react(), basicSsl()],
  server: {
    host: true, // also listen on the local network, so phones on the same Wi-Fi can open it
  },
})
