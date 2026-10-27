/** Uniform Fisher–Yates permutation, leaving the input collection untouched. */
export function shufflePhotos(
  photos: readonly string[],
  previous: string | null = null,
  random: () => number = Math.random,
): string[] {
  const order = [...photos]
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[order[index], order[other]] = [order[other], order[index]]
  }

  // Choose uniformly among the other positions instead of always swapping with 1.
  if (order.length > 1 && order[0] === previous) {
    const other = 1 + Math.floor(random() * (order.length - 1))
    ;[order[0], order[other]] = [order[other], order[0]]
  }
  return order
}

export type PhotoSequence = {
  next(previous: string | null, failed: ReadonlySet<string>): string | null
}

/** One effect-owned cursor: re-rendering never reshuffles the active cycle. */
export function createPhotoSequence(photos: readonly string[], random = Math.random): PhotoSequence {
  let order: string[] = []
  let position = 0

  return {
    next(previous, failed) {
      while (true) {
        if (position === order.length) {
          const available = photos.filter((url) => !failed.has(url))
          if (available.length === 0 || (available.length === 1 && available[0] === previous)) return null
          order = shufflePhotos(available, previous, random)
          position = 0
        }
        const url = order[position++]
        if (!failed.has(url)) return url
      }
    },
  }
}
