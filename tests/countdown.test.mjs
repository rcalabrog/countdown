import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateCountdown } from '../src/utils/countdown.ts'
import { trip } from '../src/config/trip.ts'

const target = Date.parse(trip.departure)

test('Madrid departure is the correct UTC instant, independent of host timezone', () => {
  assert.equal(new Date(target).toISOString(), '2027-04-11T15:30:00.000Z')
})

test('countdown decomposes real elapsed time and handles day rollover', () => {
  assert.deepEqual(calculateCountdown(target, target - 90_061_000), {
    days: 1, hours: 1, minutes: 1, seconds: 1, isComplete: false,
  })
  assert.equal(calculateCountdown(target, target - 86_400_000).days, 1)
  assert.equal(calculateCountdown(target, target - 86_399_000).days, 0)
  assert.equal(calculateCountdown(target, target - 7_000).seconds, 7)
})

test('zero never appears early and stays at zero after departure', () => {
  assert.equal(calculateCountdown(target, target - 1_001).seconds, 2)
  assert.equal(calculateCountdown(target, target - 1).isComplete, false)
  for (const now of [target, target + 1, target + 86_400_000]) {
    assert.deepEqual(calculateCountdown(target, now), {
      days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true,
    })
  }
})
