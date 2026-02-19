
export enum AQICategory {
  GOOD = 'Good',
  SATISFACTORY = 'Satisfactory',
  MODERATE = 'Moderate',
  POOR = 'Poor',
  VERY_POOR = 'Very Poor',
  SEVERE = 'Severe'
}

export type ClusterConfidence = 'High' | 'Medium' | 'Low';
export type ConfidenceTier = 'High' | 'Medium' | 'Low';

export interface ClusterData {
  avgPM25: number;
  confidence: ClusterConfidence;
  anomalyDetected: boolean;
  activeSensors: number;
  calibrationFactor: number;
  memberStatus: { [id: string]: { deviation: number; isAnomaly: boolean } };
  anchorName: string;
}

export enum SprinklerState {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive'
}

export interface SprinklerStatus {
  state: SprinklerState;
  lastActivation?: string;
  duration?: number;
  aqiBefore?: number;
  aqiAfter?: number;
  waterUsed?: number;
  threshold: number;
  autoMode: boolean;
}

export interface PredictionReading extends Reading {
  confidenceRange: [number, number];
}

export interface AQIBreakpoint {
  category: AQICategory;
  minPM25: number;
  maxPM25: number;
  minAQI: number;
  maxAQI: number;
  color: string;
  textColor: string;
  description: string;
}

export interface Reading {
  timestamp: string;
  pm25: number;
  pm10: number;
  aqi: number;
  category: AQICategory;
  humidity?: number;
  temperature?: number;
}

export interface VerificationData {
  leg1_local: number;
  leg2_primary_ref: number;
  leg3_secondary_ref: number;
  isVerified: boolean;
  confidence: number;
  tier: ConfidenceTier;
  statusMessage: string;
  isHyperlocalEvent: boolean;
  anomalyDetected: boolean;
}

export type StationType = 'OFFICIAL' | 'TEMP_NODE';

export interface OfficialStationData {
  name: string;
  type: string;
  pollutants: string[];
  coverageRadius: number; // in km
}

export interface LocationData {
  id: string;
  name: string;
  coordinates: [number, number];
  currentReading: Reading;
  history: Reading[];
  predictions: PredictionReading[];
  verification?: VerificationData;
  isOfficial: boolean;
  anchorId?: string;
  isSimulated?: boolean;
  type?: StationType;
  officialData?: OfficialStationData;
}