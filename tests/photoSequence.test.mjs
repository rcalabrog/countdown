import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPhotoSequence, shufflePhotos } from '../src/utils/photoSequence.ts'

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
    return seed / 2 ** 32
  }
}

test('Fisher–Yates produces a valid permutation without mutating the source', () => {
  const input = Object.freeze(['a', 'b', 'c', 'd'])
  const shuffled = shufflePhotos(input, null, () => 0)
  assert.deepEqual(shuffled, ['b', 'c', 'd', 'a'])
  assert.deepEqual([...shuffled].sort(), [...input].sort())
  assert.deepEqual(input, ['a', 'b', 'c', 'd'])
  assert.deepEqual(shufflePhotos(input, null, () => 0.999999), input)
})

test('zero, one and two photographs have safe cycle behaviour', () => {
  const failed = new Set()
  assert.deepEqual(shufflePhotos([]), [])
  assert.deepEqual(shufflePhotos(['only'], 'only'), ['only'])
  assert.equal(createPhotoSequence([]).next(null, failed), null)
  const single = createPhotoSequence(['only'])
  assert.equal(single.next(null, failed), 'only')
  assert.equal(single.next('only', failed), null)
  for (const seed of [1, 2, 42, 12345]) {
    const pair = createPhotoSequence(['a', 'b'], seededRandom(seed))
    let previous = null
    for (let index = 0; index < 20; index += 1) {
      const next = pair.next(previous, failed)
      assert.ok(next === 'a' || next === 'b')
      assert.notEqual(next, previous)
      previous = next
    }
  }
})

test('50 and 100 photos each appear once per cycle, including across cycle boundaries', () => {
  for (const size of [50, 100]) {
    const photos = Array.from({ length: size }, (_, index) => `photo-${index}`)
    const sequence = createPhotoSequence(photos, seededRandom(42))
    let previous = null
    for (let cycle = 0; cycle < 10; cycle += 1) {
      const shown = []
      for (let index = 0; index < size; index += 1) {
        const next = sequence.next(previous, new Set())
        assert.notEqual(next, previous)
        previous = next
        shown.push(next)
      }
      assert.deepEqual([...shown].sort(), [...photos].sort())
    }
  }
})

test('the permutation is generated only at cycle boundaries', () => {
  let calls = 0
  const random = () => { calls += 1; return 0.5 }
  const sequence = createPhotoSequence(['a', 'b', 'c', 'd'], random)
  const first = sequence.next(null, new Set())
  assert.equal(calls, 3)
  const second = sequence.next(first, new Set())
  const third = sequence.next(second, new Set())
  const fourth = sequence.next(third, new Set())
  assert.equal(calls, 3)
  sequence.next(fourth, new Set())
  assert.ok(calls >= 6)
})

test('a failed URL is skipped in the remaining cycle and excluded from future cycles', () => {
  const sequence = createPhotoSequence(['a', 'broken', 'b'], () => 0.999999)
  const failed = new Set(['broken'])
  let previous = null
  for (let index = 0; index < 20; index += 1) {
    const next = sequence.next(previous, failed)
    assert.notEqual(next, previous)
    assert.notEqual(next, 'broken')
    previous = next
  }
  failed.add('a')
  failed.add('b')
  assert.equal(sequence.next(previous, failed), null)
})
