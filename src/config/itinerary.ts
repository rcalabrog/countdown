import { trip } from './trip.ts'

type TravelMoment = {
  at: string
  location: string
  timeZone: string
  timeZoneLabel: string
}

export type TravelLeg = {
  label: string
  departure: TravelMoment
  arrival: TravelMoment
}

type Stay = {
  city: string
  startDate: string
  endDate: string
  nights: number
  transfer?: { from: string; date: string; transport?: string }
  excursions: readonly {
    destination: string
    date: string
    description: string
  }[]
}

type Itinerary = {
  year: string
  outbound: TravelLeg
  stages: readonly Stay[]
  homebound: TravelLeg
}

export const itinerary: Itinerary = {
  year: trip.year,
  outbound: {
    label: 'Inicio del viaje',
    departure: {
      at: trip.departure,
      location: 'Madrid',
      timeZone: trip.timeZone,
      timeZoneLabel: 'Hora de Madrid',
    },
    arrival: {
      at: '2027-04-12T20:30:00+09:00',
      location: 'Osaka',
      timeZone: 'Asia/Tokyo',
      timeZoneLabel: 'Hora de Japón',
    },
  },
  stages: [
    {
      city: 'Osaka',
      startDate: '2027-04-12',
      endDate: '2027-04-15',
      nights: 3,
      excursions: [{ destination: 'Nara', date: '2027-04-14', description: 'Por libre, sin guía' }],
    },
    {
      city: 'Kioto',
      startDate: '2027-04-15',
      endDate: '2027-04-19',
      nights: 4,
      transfer: { from: 'Osaka', date: '2027-04-15' },
      excursions: [],
    },
    {
      city: 'Tokio',
      startDate: '2027-04-19',
      endDate: '2027-04-24',
      nights: 5,
      transfer: { from: 'Kioto', date: '2027-04-19', transport: 'Shinkansen' },
      excursions: [{ destination: 'Nikkō', date: '2027-04-21', description: 'Organizada con guía' }],
    },
  ],
  homebound: {
    label: 'El regreso a casa',
    departure: {
      at: '2027-04-24T19:15:00+09:00',
      location: 'Tokio-Haneda',
      timeZone: 'Asia/Tokyo',
      timeZoneLabel: 'Hora de Japón',
    },
    arrival: {
      at: '2027-04-25T08:00:00+02:00',
      location: 'Madrid',
      timeZone: trip.timeZone,
      timeZoneLabel: 'Hora de Madrid',
    },
  },
}

export const itinerarySummary = {
  nights: itinerary.stages.reduce((total, stage) => total + stage.nights, 0),
  cities: itinerary.stages.length,
  excursions: itinerary.stages.reduce((total, stage) => total + stage.excursions.length, 0),
}
