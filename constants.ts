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

export const OFFICIAL_STATION_DATA: LocationData = {
  id: 'official-patparganj',
  name: 'Patparganj (DPCC)',
  coordinates: [28.6235, 77.2872],
  isOfficial: true,
  type: 'OFFICIAL',
  officialData: {
    name: 'DPCC Patparganj Monitoring Station',
    type: 'Official GB Reference Station',
    pollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    coverageRadius: 5
  },
  currentReading: {
    timestamp: new Date().toISOString(),
    aqi: 285,
    pm25: 135,
    pm10: 240,
    category: AQICategory.POOR,
    humidity: 45
  },
  history: [],
  predictions: []
};

export const TEMP_AQI_LOCATIONS: LocationData[] = [
  {
    id: 'node-1',
    name: 'Sensor Node 1 (Phase 1 Market)',
    coordinates: [28.6095, 77.2910],
    isOfficial: false,
    isSimulated: false,
    type: 'TEMP_NODE',
    currentReading: {} as any,
    history: [],
    predictions: []
  },
  {
    id: 'node-2',
    name: 'Sensor Node 2 (Phase 2 Residential)',
    coordinates: [28.6186, 77.3025],
    isOfficial: false,
    isSimulated: true,
    type: 'TEMP_NODE',
    currentReading: {} as any,
    history: [],
    predictions: []
  },
  {
    id: 'node-3',
    name: 'Sensor Node 3 (NH24 Highway)',
    coordinates: [28.6220, 77.2800],
    isOfficial: false,
    isSimulated: true,
    type: 'TEMP_NODE',
    currentReading: {} as any,
    history: [],
    predictions: []
  },
  {
    id: 'node-4',
    name: 'Sensor Node 4 (Sanjay Lake Park)',
    coordinates: [28.6130, 77.3000],
    isOfficial: false,
    isSimulated: true,
    type: 'TEMP_NODE',
    currentReading: {} as any,
    history: [],
    predictions: []
  }
];

export const MAP_CENTER: [number, number] = [28.6089, 77.2981];
export const COLONY_POLYGON: [number, number][] = [
  [28.6250, 77.2750],
  [28.6250, 77.3100],
  [28.6000, 77.3100],
  [28.6000, 77.2750]
];