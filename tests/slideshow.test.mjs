import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { findNextPhoto, preloadPhoto, waitForPaint, waitForVisibleDuration, PHOTO_LOAD_TIMEOUT_MS } from '../src/utils/slideshow.ts'
import { createPhotoSequence } from '../src/utils/photoSequence.ts'

// Near 1 leaves Fisher–Yates in input order for deterministic loading checks.
const sequence = (photos) => createPhotoSequence(photos, () => 0.999999)

let now, tasks, listeners, images, originalGlobals

// A deterministic foreground clock; no browser or additional dependencies needed.
function advance(ms) {
  const end = now + ms
  while (true) {
    const next = [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0]
    if (!next || next[1].at > end) break
    now = next[1].at
    tasks.delete(next[0])
    next[1].callback()
  }
  now = end
}

function visibility(state) {
  document.visibilityState = state
  for (const callback of listeners) callback()
}

beforeEach(() => {
  now = 0
  tasks = new Map()
  listeners = new Set()
  images = []
  originalGlobals = Object.fromEntries(['window', 'document', 'Image'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  let id = 0
  const schedule = (callback, delay) => {
    tasks.set(++id, { at: now + delay, callback })
    return id
  }
  globalThis.window = {
    setTimeout: schedule,
    clearTimeout: (task) => tasks.delete(task),
    requestAnimationFrame: (callback) => schedule(callback, 16),
    cancelAnimationFrame: (task) => tasks.delete(task),
  }
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener: (_, callback) => listeners.add(callback),
    removeEventListener: (_, callback) => listeners.delete(callback),
  }
  globalThis.Image = class {
    constructor() { images.push(this) }
    set src(url) {
      this.url = url
      if (url !== 'pending') queueMicrotask(() => {
        if (url === 'broken') this.onerror?.()
        else this.onload?.()
      })
    }
    decode() { return this.url === 'undecodable' ? Promise.reject(new Error('decode')) : Promise.resolve() }
    removeAttribute() { this.removed = true }
  }
  mock.method(performance, 'now', () => now)
})

afterEach(() => {
  mock.restoreAll()
  for (const [key, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

test('rotation delay pauses in background and resumes with the remaining time', async () => {
  let finished = false
  const waiting = waitForVisibleDuration(15_000, new AbortController().signal).then(() => { finished = true })
  advance(4_000)
  visibility('hidden')
  advance(60_000)
  await Promise.resolve()
  assert.equal(finished, false)
  assert.equal(tasks.size, 0)
  visibility('visible')
  advance(10_999)
  await Promise.resolve()
  assert.equal(finished, false)
  advance(1)
  await waiting
  assert.equal(finished, true)
  assert.equal(listeners.size, 0)
})

test('a hidden initial tab waits, and abort removes its listeners', async () => {
  visibility('hidden')
  const controller = new AbortController()
  const waiting = waitForVisibleDuration(0, controller.signal)
  const rejected = assert.rejects(waiting, { name: 'AbortError' })
  assert.equal(tasks.size, 0)
  controller.abort()
  await rejected
  assert.equal(listeners.size, 0)
})

test('StrictMode-style cleanup cancels timers before a second setup', async () => {
  const first = new AbortController()
  const rejected = assert.rejects(waitForVisibleDuration(15_000, first.signal), { name: 'AbortError' })
  first.abort()
  await rejected
  const second = waitForVisibleDuration(15_000, new AbortController().signal)
  assert.equal(tasks.size, 1)
  assert.equal(listeners.size, 1)
  advance(15_000)
  await second
  assert.equal(tasks.size, 0)
  assert.equal(listeners.size, 0)
})

test('paint waits for two frames; abort cancels a pending frame', async () => {
  let painted = false
  const paint = waitForPaint(new AbortController().signal).then(() => { painted = true })
  advance(16)
  await Promise.resolve()
  assert.equal(painted, false)
  advance(16)
  await paint
  assert.equal(painted, true)
  const controller = new AbortController()
  const rejected = assert.rejects(waitForPaint(controller.signal), { name: 'AbortError' })
  controller.abort()
  await rejected
  assert.equal(tasks.size, 0)
})

test('preloading waits for decode, skips errors and releases aborted images', async () => {
  assert.equal(await preloadPhoto('valid', new AbortController().signal), true)
  assert.equal(await preloadPhoto('broken', new AbortController().signal), false)
  assert.equal(await preloadPhoto('undecodable', new AbortController().signal), false)
  const controller = new AbortController()
  const rejected = assert.rejects(preloadPhoto('pending', controller.signal), { name: 'AbortError' })
  controller.abort()
  await rejected
  assert.equal(images.at(-1).removed, true)
  assert.equal(images.at(-1).onload, null)
  assert.equal(images.at(-1).onerror, null)
})

test('empty, single, broken and looping photo sequences', async () => {
  const signal = new AbortController().signal
  const failed = new Set()
  assert.equal(await findNextPhoto(sequence([]), null, failed, signal), null)
  const single = sequence(['only'])
  assert.equal(await findNextPhoto(single, null, failed, signal), 'only')
  assert.equal(await findNextPhoto(single, 'only', failed, signal), null)
  const mixed = sequence(['broken', 'undecodable', 'valid'])
  assert.equal(await findNextPhoto(mixed, null, failed, signal), 'valid')
  assert.deepEqual([...failed], ['broken', 'undecodable'])
  const loadCount = images.length
  assert.equal(await findNextPhoto(mixed, 'valid', failed, signal), null)
  assert.equal(images.length, loadCount)
  assert.equal(await findNextPhoto(sequence(['first', 'last']), 'last', failed, signal), 'first')
  assert.equal(await findNextPhoto(sequence(['broken']), null, new Set(), signal), null)
})

test('the first usable photo has high fetch priority, subsequent preloads have low priority', async () => {
  const signal = new AbortController().signal
  const order = sequence(['first', 'second'])
  await findNextPhoto(order, null, new Set(), signal)
  assert.equal(images.at(-1).fetchPriority, 'high')
  await findNextPhoto(order, 'first', new Set(), signal)
  assert.equal(images.at(-1).fetchPriority, 'low')
})

test('a stalled load is released after the timeout and a valid photo can follow', async () => {
  const signal = new AbortController().signal
  const failed = new Set()
  const order = sequence(['pending', 'valid'])
  const loading = findNextPhoto(order, null, failed, signal)
  advance(PHOTO_LOAD_TIMEOUT_MS - 1)
  assert.equal(images.length, 1)
  advance(1)
  assert.equal(await loading, 'valid')
  assert.ok(failed.has('pending'))
  assert.equal(images[0].removed, true)
  assert.equal(images[0].onload, null)
  assert.equal(tasks.size, 0)
})

test('a 100-photo collection loads only the requested current and next files', async () => {
  const urls = Array.from({ length: 100 }, (_, index) => `/pages/assets/photo-${index}.webp`)
  const order = sequence(urls)
  const failed = new Set()
  const signal = new AbortController().signal
  let current = await findNextPhoto(order, null, failed, signal)
  assert.equal(images.length, 1)
  const first = current
  const shown = [current]
  for (let index = 1; index < urls.length; index += 1) {
    current = await findNextPhoto(order, current, failed, signal)
    shown.push(current)
    assert.equal(images.length, index + 1)
    assert.equal(tasks.size, 0)
  }
  assert.deepEqual(shown, urls)
  assert.equal(await findNextPhoto(order, current, failed, signal), first)
  assert.equal(failed.size, 0)
})

test('broken candidates at a cycle boundary do not cause a consecutive repeat', async () => {
  const order = sequence(['first', 'last', 'broken'])
  const signal = new AbortController().signal
  const failed = new Set()
  assert.equal(await findNextPhoto(order, null, failed, signal), 'first')
  assert.equal(await findNextPhoto(order, 'first', failed, signal), 'last')
  assert.equal(await findNextPhoto(order, 'last', failed, signal), 'first')
  const requests = images.length
  assert.equal(await findNextPhoto(order, 'first', failed, signal), 'last')
  assert.equal(images.length, requests + 1)
})
