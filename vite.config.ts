import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Development stays at /; builds and their preview use the GitHub project path.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/countdown/' : '/',
  plugins: [react()],
}))
