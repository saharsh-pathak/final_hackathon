import { AQIBreakpoint, AQICategory, LocationData } from './types';

export const NAQI_BREAKPOINTS: AQIBreakpoint[] = [
  {
    category: AQICategory.GOOD,
    minPM25: 0,
    maxPM25: 30,
    minAQI: 0,
    maxAQI: 50,
    color: 'bg-green-500',
    textColor: 'text-green-500',
    description: 'Minimal impact'
  },
  {
    category: AQICategory.SATISFACTORY,
    minPM25: 31,
    maxPM25: 60,
    minAQI: 51,
    maxAQI: 100,
    color: 'bg-green-400',
    textColor: 'text-green-600',
    description: 'Minor breathing discomfort to sensitive people'
  },
  {
    category: AQICategory.MODERATE,
    minPM25: 61,
    maxPM25: 90,
    minAQI: 101,
    maxAQI: 200,
    color: 'bg-yellow-400',
    textColor: 'text-yellow-600',
    description: 'Breathing discomfort to people with lungs, asthma and heart diseases'
  },
  {
    category: AQICategory.POOR,
    minPM25: 91,
    maxPM25: 120,
    minAQI: 201,
    maxAQI: 300,
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    description: 'Breathing discomfort to most people on prolonged exposure'
  },
  {
    category: AQICategory.VERY_POOR,
    minPM25: 121,
    maxPM25: 250,
    minAQI: 301,
    maxAQI: 400,
    color: 'bg-red-500',
    textColor: 'text-red-600',
    description: 'Respiratory illness on prolonged exposure'
  },
  {
    category: AQICategory.SEVERE,
    minPM25: 251,
    maxPM25: 999,
    minAQI: 401,
    maxAQI: 500,
    color: 'bg-red-900',
    textColor: 'text-red-900',
    description: 'Affects healthy people and seriously impacts those with existing diseases'
  }
];

export const TEMP_AQI_LOCATIONS: LocationData[] = [
  {
    id: 'node-1',
    name: 'Sensor Node 1 (Main Hardware)',
    coordinates: [28.6139, 77.2090],
    isOfficial: false,
    isSimulated: false,
    currentReading: {} as any,
    history: [],
    predictions: []
  },
  {
    id: 'node-2',
    name: 'Sensor Node 2 (Colony North)',
    coordinates: [28.6150, 77.2105],
    isOfficial: false,
    isSimulated: true,
    currentReading: {} as any,
    history: [],
    predictions: []
  },
  {
    id: 'node-3',
    name: 'Sensor Node 3 (Colony East)',
    coordinates: [28.6125, 77.2120],
    isOfficial: false,
    isSimulated: true,
    currentReading: {} as any,
    history: [],
    predictions: []
  },
  {
    id: 'node-4',
    name: 'Sensor Node 4 (Colony South)',
    coordinates: [28.6110, 77.2100],
    isOfficial: false,
    isSimulated: true,
    currentReading: {} as any,
    history: [],
    predictions: []
  }
];