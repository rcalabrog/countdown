import assert from 'node:assert/strict'
import { test } from 'node:test'
import { itinerary, itinerarySummary } from '../src/config/itinerary.ts'
import { trip } from '../src/config/trip.ts'

const day = (date) => Date.parse(`${date}T00:00:00Z`)

test('confirmed stays are consecutive and total 12 nights; April 24 is checkout', () => {
  assert.deepEqual(itinerary.stages.map(({ city }) => city), ['Osaka', 'Kioto', 'Tokio'])
  assert.deepEqual(itinerary.stages.map(({ nights }) => nights), [3, 4, 5])
  for (const [index, stage] of itinerary.stages.entries()) {
    assert.equal((day(stage.endDate) - day(stage.startDate)) / 86_400_000, stage.nights)
    if (index > 0) assert.equal(itinerary.stages[index - 1].endDate, stage.startDate)
    if (stage.transfer) assert.equal(stage.transfer.date, stage.startDate)
  }
  assert.equal(itinerary.stages.at(-1).endDate, '2027-04-24')
  assert.deepEqual(itinerarySummary, { nights: 12, cities: 3, excursions: 2 })
})

test('only the two confirmed Wednesday excursions belong to their respective stays', () => {
  const excursions = itinerary.stages.flatMap((stage) => stage.excursions.map((excursion) => {
    assert.ok(day(excursion.date) >= day(stage.startDate) && day(excursion.date) < day(stage.endDate))
    assert.equal(new Date(day(excursion.date)).getUTCDay(), 3)
    return [stage.city, excursion.destination, excursion.date, excursion.description]
  }))
  assert.deepEqual(excursions, [
    ['Osaka', 'Nara', '2027-04-14', 'Por libre, sin guía'],
    ['Tokio', 'Nikkō', '2027-04-21', 'Organizada con guía'],
  ])
  assert.equal(itinerary.stages[2].transfer.transport, 'Shinkansen')
})

test('flight times preserve local zones and reuse the countdown departure', () => {
  assert.equal(itinerary.outbound.departure.at, trip.departure)
  assert.equal(itinerary.outbound.arrival.at, '2027-04-12T20:30:00+09:00')
  assert.equal(itinerary.homebound.departure.at, '2027-04-24T19:15:00+09:00')
  assert.equal(itinerary.homebound.arrival.at, '2027-04-25T08:00:00+02:00')
  const moments = [itinerary.outbound.departure, itinerary.outbound.arrival, itinerary.homebound.departure, itinerary.homebound.arrival]
  assert.deepEqual(moments.map(({ at }) => new Date(at).getUTCDay()), [0, 1, 6, 0])
  for (let index = 1; index < moments.length; index += 1) {
    assert.ok(Date.parse(moments[index].at) > Date.parse(moments[index - 1].at))
  }
})
