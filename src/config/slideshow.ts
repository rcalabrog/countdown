export const SLIDE_DURATION_MS = 15_000
export const TRANSITION_DURATION_MS = 1_500

// Vite emits the final asset URLs, including the configured production base.
const imageModules = import.meta.glob<string>(
  '../assets/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true, query: '?url', import: 'default' },
)

export const photos = Object.entries(imageModules)
  .sort(([left], [right]) => left.localeCompare(right, 'en', { numeric: true }))
  .map(([, url]) => url)
