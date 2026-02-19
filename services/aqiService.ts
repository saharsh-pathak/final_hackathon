
import { AQICategory, Reading, VerificationData, LocationData, ClusterData, ClusterConfidence, ConfidenceTier, PredictionReading } from '../types';
import { NAQI_BREAKPOINTS } from '../constants';
import { db } from './firebaseConfig';
import { ref, onValue, off } from 'firebase/database';

export interface Node1FirebaseData {
  aqi: number;
  pm25: number;
  humidity: number;
  temperature: number;
  relayStatus: string;
  timestamp: number;
}

/**
 * Subscribe to live ESP32 sensor data from Firebase Realtime Database (nodes/Node1).
 * Returns an unsubscribe function to clean up the listener.
 */
export const subscribeToNode1 = (
  callback: (data: Node1FirebaseData) => void
): (() => void) => {
  const nodeRef = ref(db, 'nodes/Node1');
  onValue(nodeRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data as Node1FirebaseData);
    }
  });
  return () => off(nodeRef);
};


export const calculateAQI = (pm25: number): { aqi: number, category: AQICategory } => {
  const bp = NAQI_BREAKPOINTS.find(b => pm25 >= b.minPM25 && pm25 <= b.maxPM25) || NAQI_BREAKPOINTS[NAQI_BREAKPOINTS.length - 1];
  const aqi = ((bp.maxAQI - bp.minAQI) / (bp.maxPM25 - bp.minPM25)) * (pm25 - bp.minPM25) + bp.minAQI;
  return {
    aqi: Math.round(aqi),
    category: bp.category
  };
};

export const calculateClusterMetrics = (
  sensors: LocationData[],
  groundTruthPM: number
): ClusterData => {
  const activeSensors = sensors.filter(s => s.currentReading.pm25 > 0);

  if (activeSensors.length === 0) {
    return {
      avgPM25: 0,
      confidence: 'Low',
      anomalyDetected: false,
      activeSensors: 0,
      calibrationFactor: 1,
      memberStatus: {},
      anchorName: 'Unknown'
    };
  }

  const avgPM25 = activeSensors.reduce((acc, s) => acc + s.currentReading.pm25, 0) / activeSensors.length;

  const memberStatus: { [id: string]: { deviation: number; isAnomaly: boolean } } = {};
  let anomaliesFound = false;

  activeSensors.forEach(s => {
    const deviation = Math.abs(s.currentReading.pm25 - avgPM25) / avgPM25;
    const isAnomaly = deviation > 0.5; // Threshold for cluster-wide warning
    if (isAnomaly) anomaliesFound = true;
    memberStatus[s.id] = { deviation, isAnomaly };
  });

  const calibrationFactor = groundTruthPM / (avgPM25 || 1);

  let confidence: ClusterConfidence = 'High';
  const maxDev = activeSensors.length > 0 ? Math.max(...Object.values(memberStatus).map(v => v.deviation)) : 0;

  if (activeSensors.length < 2) confidence = 'Low';
  else if (maxDev > 0.4) confidence = 'Low';
  else if (maxDev > 0.2) confidence = 'Medium';

  return {
    avgPM25,
    confidence,
    anomalyDetected: anomaliesFound,
    activeSensors: activeSensors.length,
    calibrationFactor,
    memberStatus,
    anchorName: ''
  };
};

export const performTriangularVerification = (localPM: number, primaryRef: number, secondaryRef: number): VerificationData => {
  const diffP = Math.abs(localPM - primaryRef) / (primaryRef || 1);
  const diffS = Math.abs(localPM - secondaryRef) / (secondaryRef || 1);

  let tier: ConfidenceTier = 'Low';
  let score = 0;
  let statusMessage = '';
  let isHyperlocalEvent = false;

  // Logic for Tiers
  if (diffP <= 0.2 && diffS <= 0.2) {
    tier = 'High';
    score = Math.round(100 - ((diffP + diffS) / 2) * 100);
    statusMessage = 'Verified Air Quality Truth';
  } else if (diffP <= 0.5 || diffS <= 0.5) {
    tier = 'Medium';
    score = Math.round(79 - (Math.min(diffP, diffS) * 40));

    // Check if it's a hyperlocal spike (local reading higher than official stations)
    if (localPM > primaryRef && localPM > secondaryRef) {
      isHyperlocalEvent = true;
      statusMessage = 'Localized Pollution Spike detected';
    } else {
      statusMessage = 'Moderate Spatial Variance';
    }
  } else {
    tier = 'Low';
    score = Math.round(Math.max(10, 49 - (Math.min(diffP, diffS) * 20)));
    statusMessage = 'Sensor Drift or High Local Interference';
  }

  return {
    leg1_local: localPM,
    leg2_primary_ref: primaryRef,
    leg3_secondary_ref: secondaryRef,
    isVerified: tier !== 'Low',
    confidence: score,
    tier,
    statusMessage,
    isHyperlocalEvent,
    anomalyDetected: tier === 'Low'
  };
};

export const generateMockHistory = (basePM: number): Reading[] => {
  const history: Reading[] = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    const variation = (Math.random() - 0.5) * 15;
    const pm25 = Math.max(5, basePM + variation);
    const { aqi, category } = calculateAQI(pm25);
    history.push({
      timestamp: time.toISOString(),
      pm25: parseFloat(pm25.toFixed(1)),
      pm10: pm25 * 1.55,
      aqi,
      category
    });
  }
  return history;
};

export const fetchRealAQI = async (lat: number, lng: number): Promise<{ pm25: number, pm10: number, aqi: number, category: AQICategory }> => {
  const token = process.env.AQI_API_KEY;
  if (!token) throw new Error('AQI_API_KEY not found in environment');

  try {
    const response = await fetch(`https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`);
    const result = await response.json();

    if (result.status !== 'ok') {
      throw new Error(result.data || 'Failed to fetch AQI data');
    }

    const data = result.data;
    const pm25 = data.iaqi?.pm25?.v || 85; // Fallback to base if missing
    const pm10 = data.iaqi?.pm10?.v || (pm25 * 1.6);

    // We use our internal AQI calculation for consistency with the app's breakpoints
    const calculated = calculateAQI(pm25);

    return {
      pm25: parseFloat(pm25.toFixed(1)),
      pm10: parseFloat(pm10.toFixed(1)),
      aqi: calculated.aqi,
      category: calculated.category
    };
  } catch (error) {
    console.warn(`⚠️ API Fetch Error for [${lat}, ${lng}]:`, error);
    // Fallback to minimal random valid data if API fails temporarily
    const basePM = 85 + Math.random() * 20;
    return {
      pm25: parseFloat(basePM.toFixed(1)),
      pm10: parseFloat((basePM * 1.6).toFixed(1)),
      ...calculateAQI(basePM)
    };
  }
};

export const generateMockPredictions = (currentPM: number): PredictionReading[] => {
  const predictions: PredictionReading[] = [];
  const now = new Date();

  // Generate 6 predictions at 5-minute intervals (30 minutes total)
  for (let i = 1; i <= 6; i++) {
    const time = new Date(now.getTime() + i * 300000); // 5 minutes in milliseconds

    // Short-term variation pattern (within 30 minutes)
    const variation = (Math.random() - 0.5) * 5; // Smaller variation for short timeframe
    const pm25 = Math.max(10, currentPM + variation);

    const { aqi, category } = calculateAQI(pm25);
    const confidenceRange: [number, number] = [pm25 * 0.9, pm25 * 1.1]; // Tighter confidence for short-term

    predictions.push({
      timestamp: time.toISOString(),
      pm25: parseFloat(pm25.toFixed(1)),
      pm10: pm25 * 1.6,
      aqi,
      category,
      confidenceRange
    });
  }
  return predictions;
};

export const simulateNodeData = (node1PM: number, offset: number): { pm25: number, pm10: number, humidity: number, aqi: number, category: AQICategory } => {
  // Simulate nearby node values with slight variation and offset
  const variation = (Math.random() - 0.5) * 10;
  const pm25 = Math.max(5, node1PM + offset + variation);
  const humidity = 40 + Math.random() * 20; // Simulated humidity
  const { aqi, category } = calculateAQI(pm25);

  return {
    pm25: parseFloat(pm25.toFixed(1)),
    pm10: parseFloat((pm25 * 1.6).toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    aqi,
    category
  };
};

export const simulateSprinklerImpact = (currentAQI: number): number => {
  // Simulate 15-30% reduction as per PRD
  const reductionFactor = 0.15 + Math.random() * 0.15;
  return Math.max(10, Math.round(currentAQI * (1 - reductionFactor)));
};

