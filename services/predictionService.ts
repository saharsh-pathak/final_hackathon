import { ref, query, orderByChild, limitToLast, get } from 'firebase/database';
import { db } from './firebaseConfig';
import { calculateAQI } from './aqiService'; // Assuming this exists or I need to duplicate/import logic
import { AQICategory } from '../types';

export interface DataPoint {
    timestamp: number;
    aqi: number;
}

export interface PredictionPoint {
    timestamp: string; // ISO string for UI
    aqi: number;
    type: 'historical' | 'forecast';
}

/**
 * Fetches the last 50 entries from history/Node1
 */
export const fetchNode1History = async (): Promise<DataPoint[]> => {
    try {
        const historyRef = ref(db, 'history/Node1');
        const recentHistoryQuery = query(historyRef, orderByChild('timestamp'), limitToLast(50));
        const snapshot = await get(recentHistoryQuery);

        if (!snapshot.exists()) {
            console.warn("⚠️ fetchNode1History: No data at history/Node1");
            return [];
        }

        console.log(`✅ fetchNode1History: Found ${snapshot.size} entries`);

        const data: DataPoint[] = [];
        snapshot.forEach((child) => {
            const val = child.val();
            if (val.timestamp && typeof val.aqi === 'number') {
                // Ensure timestamp is in milliseconds
                const ts = val.timestamp > 10000000000 ? val.timestamp : val.timestamp * 1000;
                data.push({
                    timestamp: ts,
                    aqi: val.aqi
                });
            }
        });

        return data;
    } catch (error) {
        console.error("Error fetching Node 1 history:", error);
        return [];
    }
};

/**
 * Performs linear regression on the provided data points.
 * Returns slope (m) and y-intercept (b) for y = mx + b.
 * x is time in minutes relative to the first data point.
 */
const performLinearRegression = (data: DataPoint[]) => {
    const n = data.length;
    if (n < 2) return { m: 0, b: data[0]?.aqi || 0 };

    const firstTime = data[0].timestamp;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    data.forEach(point => {
        // Convert time to minutes relative to start for numerical stability
        const x = (point.timestamp - firstTime) / 60000;
        const y = point.aqi;

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    return { m, b, firstTime };
};

/**
 * Generates predictions for the next 30 minutes based on the last 60 minutes of data.
 */
export const predictNext30Minutes = (history: DataPoint[]): PredictionPoint[] => {
    if (!history || history.length === 0) return [];

    // Use the latest timestamp in history as the reference point "now"
    const latestTimestamp = history[history.length - 1].timestamp;
    const ONE_HOUR = 60 * 60 * 1000;

    // 1. Filter for last 60 minutes relative to the latest data point
    const relevantHistory = history.filter(h => (latestTimestamp - h.timestamp) <= ONE_HOUR);

    if (relevantHistory.length < 2) {
        // Not enough data, return flat line from last known point
        const lastVal = relevantHistory[relevantHistory.length - 1]?.aqi || 0;
        const predictions: PredictionPoint[] = [];
        for (let i = 1; i <= 6; i++) {
            predictions.push({
                timestamp: new Date(latestTimestamp + i * 5 * 60000).toISOString(),
                aqi: lastVal,
                type: 'forecast'
            });
        }
        return predictions;
    }

    // 2. Perform Linear Regression
    const { m, b, firstTime } = performLinearRegression(relevantHistory);

    // 3. Generate 6 forecast points (next 30 mins, 5 min intervals)
    const predictions: PredictionPoint[] = [];

    // Start from "latestTimestamp"
    for (let i = 1; i <= 6; i++) {
        const futureTime = latestTimestamp + (i * 5 * 60000);
        const x = (futureTime - firstTime) / 60000;
        let predictedAQI = Math.round(m * x + b);

        // Clamp to 0-500
        predictedAQI = Math.max(0, Math.min(500, predictedAQI));

        predictions.push({
            timestamp: new Date(futureTime).toISOString(),
            aqi: predictedAQI,
            type: 'forecast'
        });
    }

    return predictions;
};

const generateFlatPrediction = (val: number): PredictionPoint[] => {
    const predictions: PredictionPoint[] = [];
    const now = Date.now();
    for (let i = 1; i <= 6; i++) {
        predictions.push({
            timestamp: new Date(now + i * 5 * 60000).toISOString(),
            aqi: val,
            type: 'forecast'
        });
    }
    return predictions;
};

/**
 * Helper to get combined historical (last 60m) + forecast data for charting
 */
export const getChartData = (history: DataPoint[]): PredictionPoint[] => {
    if (!history || history.length === 0) return [];

    // Use latest timestamp to ensure consistency with prediction logic
    const latestTimestamp = history[history.length - 1].timestamp;
    const ONE_HOUR = 60 * 60 * 1000;

    // Convert relevant history to chart format
    const chartHistory: PredictionPoint[] = history
        .filter(h => (latestTimestamp - h.timestamp) <= ONE_HOUR)
        .map(h => ({
            timestamp: new Date(h.timestamp).toISOString(),
            aqi: h.aqi,
            type: 'historical' as const
        }));

    const forecast = predictNext30Minutes(history);

    return [...chartHistory, ...forecast];
};
