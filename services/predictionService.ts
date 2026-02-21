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
    isAI?: boolean;
}

export interface PredictionResult {
    predictions: PredictionPoint[];
    reasoning?: string;
}

/**
 * Fetches the last 50 entries from history/Node1
 */
export const fetchNodeHistory = async (nodeId: string): Promise<DataPoint[]> => {
    try {
        const historyRef = ref(db, `history/${nodeId}`);
        const recentHistoryQuery = query(historyRef, orderByChild('timestamp'), limitToLast(50));
        const snapshot = await get(recentHistoryQuery);

        if (!snapshot.exists()) {
            console.warn(`⚠️ fetchNodeHistory: No data at history/${nodeId}`);
            return [];
        }

        console.log(`✅ fetchNodeHistory [${nodeId}]: Found ${snapshot.size} entries`);

        const data: DataPoint[] = [];
        snapshot.forEach((child) => {
            const val = child.val();
            const ts = Number(val.timestamp);

            if (!isNaN(ts) && typeof val.aqi === 'number') {
                data.push({
                    timestamp: ts,
                    aqi: val.aqi
                });
            }
        });

        if (data.length === 0) {
            console.warn(`⚠️ fetchNodeHistory [${nodeId}]: No valid data points found in snapshot`);
        }

        // Ensure sorted by time
        return data.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
        console.error(`Error fetching ${nodeId} history:`, error);
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
    if (n < 2) return { m: 0, b: data[0]?.aqi || 0, firstTime: data[0]?.timestamp || Date.now() };

    const firstTime = data[0].timestamp;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    data.forEach(point => {
        // x is minutes relative to first data point
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

import { GoogleGenerativeAI } from '@google/generative-ai';

// Safe environment variable access
const getGeminiKey = (): string => {
    try {
        // Try Vite standard first
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_GEMINI_API_KEY;
        }

        // Try Vite defined process.env from vite.config.ts
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
            // @ts-ignore
            return process.env.GEMINI_API_KEY;
        }

        // Try raw process.env.API_KEY (common fallback in this config)
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            // @ts-ignore
            return process.env.API_KEY;
        }
    } catch (e) {
        console.warn("Error accessing environment variables:", e);
    }
    return '';
};

const GEMINI_KEY = getGeminiKey();
let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_KEY) {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_KEY);
        console.log("✅ Gemini SDK initialized successfully.");
    } catch (e) {
        console.error("❌ Failed to initialize Gemini SDK:", e);
    }
} else {
    console.warn("⚠️ No Gemini API key found. AI features will be disabled (falling back to regression).");
}

/**
 * Performs AI-powered prediction using Google's Gemini Model.
 */
export const predictWithGemini = async (history: DataPoint[]): Promise<{ predictions: PredictionPoint[], reasoning: string }> => {
    try {
        if (!genAI) {
            throw new Error("Gemini AI SDK not initialized (missing API key)");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const latestTimestamp = history[history.length - 1].timestamp;
        const ONE_HOUR = 60 * 60 * 1000;
        const relevantHistory = history.filter(h => (latestTimestamp - h.timestamp) <= ONE_HOUR);

        const dataString = relevantHistory.map(h =>
            `Time: ${new Date(h.timestamp).toLocaleTimeString()}, AQI: ${h.aqi}`
        ).join('\n');

        const prompt = `
            You are an environmental AI expert. Based on the following last 60 minutes of hyperlocal AQI data, predict the next 30 minutes (6 points at 5-minute intervals).
            
            STRICT CONSTRAINTS FOR DEMO:
            - All predicted AQI values MUST fluctuate between 20 and 95.
            - Even if the current trend is high or low, the demo forecast must remain within this satisfactory range [20, 95].
            - Ensure the values look realistic with slight fluctuations (not a flat line).

            Current History:
            ${dataString}

            Respond strictly in valid JSON format:
            {
                "forecast": [
                    {"aqi": number, "minutes_ahead": 5},
                    {"aqi": number, "minutes_ahead": 10},
                    {"aqi": number, "minutes_ahead": 15},
                    {"aqi": number, "minutes_ahead": 20},
                    {"aqi": number, "minutes_ahead": 25},
                    {"aqi": number, "minutes_ahead": 30}
                ],
                "reasoning": "A concise 1-sentence explanation of the trend (satisfying the 20-95 AQI demo constraint)."
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract JSON from response (handling potential markdown formatting)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse JSON from Gemini response");

        const data = JSON.parse(jsonMatch[0]);

        const predictions: PredictionPoint[] = data.forecast.map((f: any) => ({
            timestamp: new Date(latestTimestamp + f.minutes_ahead * 60000).toISOString(),
            aqi: Math.max(20, Math.min(95, Math.round(f.aqi))),
            type: 'forecast' as const,
            isAI: true
        }));

        return { predictions, reasoning: data.reasoning };
    } catch (error) {
        console.error("Gemini Prediction Error:", error);
        throw error;
    }
};

/**
 * Generates predictions for the next 30 minutes.
 * Attempts Gemini first, falls back to linear regression.
 */
export const predictNext30Minutes = async (history: DataPoint[]): Promise<{ predictions: PredictionPoint[], reasoning?: string }> => {
    if (!history || history.length === 0) return { predictions: [] };

    // Try Gemini first if it's Node 1 (has real data)
    try {
        const aiResult = await predictWithGemini(history);
        return aiResult;
    } catch (e) {
        console.warn("Falling back to Linear Regression due to AI error:", e);
    }

    // Fallback: Linear Regression
    const latestTimestamp = history[history.length - 1].timestamp;
    const ONE_HOUR = 60 * 60 * 1000;
    const relevantHistory = history.filter(h => (latestTimestamp - h.timestamp) <= ONE_HOUR);

    if (relevantHistory.length < 2) {
        const lastPoint = relevantHistory[relevantHistory.length - 1] || history[history.length - 1];
        const lastVal = Math.max(1, lastPoint?.aqi || 1);
        const baseTs = lastPoint?.timestamp || latestTimestamp;

        const predictions: PredictionPoint[] = [];
        for (let i = 1; i <= 6; i++) {
            // Add a small random fluctuation for a more realistic demo look
            const fluctuation = (Math.random() - 0.5) * 4;
            const finalAqi = Math.max(20, Math.min(95, Math.round(lastVal + fluctuation)));

            predictions.push({
                timestamp: new Date(baseTs + i * 5 * 60000).toISOString(),
                aqi: finalAqi,
                type: 'forecast'
            });
        }
        return { predictions, reasoning: "Insufficient history for AI modeling. Using baseline persistence." };
    }

    const { m, b, firstTime } = performLinearRegression(relevantHistory);

    // DEMO TWEAK: Dampen the slope if it's too aggressive (no immediate flatlines)
    // A slope of 1.5 AQI/min means a 45 AQI change in 30 mins, which is significant but readable.
    const dampenedM = Math.max(-1.5, Math.min(1.5, m));

    const predictions: PredictionPoint[] = [];

    for (let i = 1; i <= 6; i++) {
        const futureTime = latestTimestamp + (i * 5 * 60000);
        const x = (futureTime - firstTime) / 60000;
        // Apply trend but add slight demo fluctuation
        const drift = (Math.random() - 0.5) * 3;
        let predictedAQI = Math.round(dampenedM * x + b + drift);
        predictedAQI = Math.max(20, Math.min(95, predictedAQI));

        predictions.push({
            timestamp: new Date(futureTime).toISOString(),
            aqi: predictedAQI,
            type: 'forecast'
        });
    }

    return {
        predictions,
        reasoning: `Gradual trend analysis (Slope: ${dampenedM.toFixed(2)} AQI/min).`
    };
};

const generateFlatPrediction = (val: number): PredictionPoint[] => {
    const predictions: PredictionPoint[] = [];
    const now = Date.now();
    for (let i = 1; i <= 6; i++) {
        predictions.push({
            timestamp: new Date(now + i * 5 * 60000).toISOString(),
            aqi: Math.max(1, val),
            type: 'forecast'
        });
    }
    return predictions;
};

/**
 * Helper to get combined historical (last 60m) + forecast data for charting
 */
export const getChartData = async (history: DataPoint[]): Promise<PredictionPoint[]> => {
    if (!history || history.length === 0) return [];

    // Use latest timestamp to ensure consistency with prediction logic
    const latestTimestamp = history[history.length - 1].timestamp;
    const ONE_HOUR = 60 * 60 * 1000;

    // Convert relevant history to chart format
    const chartHistory: PredictionPoint[] = history
        .filter(h => (latestTimestamp - h.timestamp) <= ONE_HOUR)
        .map(h => ({
            timestamp: new Date(h.timestamp).toISOString(),
            aqi: Math.max(1, h.aqi),
            type: 'historical' as const
        }));

    const { predictions } = await predictNext30Minutes(history);

    return [...chartHistory, ...predictions];
};
