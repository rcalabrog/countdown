import { readdir, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function auditPhotos(directory = new URL('../src/assets/photos/', import.meta.url)) {
  const photoDirectory = directory instanceof URL ? fileURLToPath(directory) : directory
  const entries = await readdir(photoDirectory, { withFileTypes: true })
  const files = await Promise.all(entries
    .filter((entry) => entry.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(entry.name))
    .map(async (entry) => ({
      name: entry.name,
      bytes: (await stat(join(photoDirectory, entry.name))).size,
      format: extname(entry.name).toLowerCase().slice(1),
    })))
  files.sort((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name, 'en'))
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0)
  return {
    count: files.length,
    totalBytes,
    averageBytes: files.length ? Math.round(totalBytes / files.length) : 0,
    units: 'MB = 1,000,000 bytes; heavy threshold > 2,000,000 bytes',
    totalMB: Number((totalBytes / 1_000_000).toFixed(2)),
    averageMB: files.length ? Number((totalBytes / files.length / 1_000_000).toFixed(2)) : 0,
    formats: files.reduce((counts, { format }) => {
      counts[format] = (counts[format] ?? 0) + 1
      return counts
    }, {}),
    largestFive: files.slice(0, 5),
    over2MB: files.filter(({ bytes }) => bytes > 2_000_000),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await auditPhotos(), null, 2))
}
