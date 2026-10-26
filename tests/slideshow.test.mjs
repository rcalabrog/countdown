import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { findNextPhoto, preloadPhoto, waitForPaint, waitForVisibleDuration } from '../src/utils/slideshow.ts'

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
  assert.equal(await findNextPhoto([], -1, failed, signal), null)
  assert.equal(await findNextPhoto(['only'], -1, failed, signal), 0)
  assert.equal(await findNextPhoto(['only'], 0, failed, signal), null)
  assert.equal(await findNextPhoto(['broken', 'undecodable', 'valid'], -1, failed, signal), 2)
  assert.deepEqual([...failed], ['broken', 'undecodable'])
  const loadCount = images.length
  assert.equal(await findNextPhoto(['broken', 'undecodable', 'valid'], 2, failed, signal), null)
  assert.equal(images.length, loadCount)
  assert.equal(await findNextPhoto(['first', 'last'], 1, failed, signal), 0)
  assert.equal(await findNextPhoto(['broken'], -1, new Set(), signal), null)
})

test('the first usable photo has high fetch priority, subsequent preloads have low priority', async () => {
  const signal = new AbortController().signal
  await findNextPhoto(['first', 'second'], -1, new Set(), signal)
  assert.equal(images.at(-1).fetchPriority, 'high')
  await findNextPhoto(['first', 'second'], 0, new Set(), signal)
  assert.equal(images.at(-1).fetchPriority, 'low')
})
