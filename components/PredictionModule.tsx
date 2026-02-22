import React, { useEffect, useState, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchNodeHistory, predictNext30Minutes, PredictionPoint } from '../services/predictionService';
import { NAQI_BREAKPOINTS } from '../constants';

interface PredictionModuleProps {
    selectedId: string | null;
    nodeName?: string;
    sprinklerActive?: boolean;
    mockHistory?: any[];
    currentAQI?: number;
}

const PredictionModule: React.FC<PredictionModuleProps> = ({ selectedId, nodeName, sprinklerActive, mockHistory, currentAQI }) => {
    const [chartData, setChartData] = useState<PredictionPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [aiReasoning, setAiReasoning] = useState<string>('');
    const lastPredictedAqiRef = useRef<number>(0);
    // ⏱️ Fixed 5-minute forecast cycle: tracks when the last forecast was computed
    const lastForecastTimestampRef = useRef<number>(0);
    // 🔒 Concurrency guard: prevent overlapping forecasts (startup delay + reconnect can both fire)
    const isRunningRef = useRef<boolean>(false);
    // 📡 Always-current AQI ref — avoids stale closure in setTimeout callbacks
    const currentAQIRef = useRef<number | undefined>(currentAQI);
    useEffect(() => { currentAQIRef.current = currentAQI; }, [currentAQI]);

    const refreshPredictions = async () => {
        if (!selectedId) return;
        if (isRunningRef.current) {
            console.log('🔒 [Forecast] Skipping — prediction already in progress.');
            return;
        }
        isRunningRef.current = true;
        setLoading(true);
        try {
            const dbPath = selectedId.startsWith('node-')
                ? selectedId.replace('node-', 'Node')
                : selectedId;

            console.log(`🔮 Fetching history for ${dbPath}...`);
            let history = await fetchNodeHistory(dbPath);

            if (history.length === 0 && mockHistory && mockHistory.length > 0) {
                console.log(`💡 No real history found for ${dbPath}. Using mock history fallback.`);
                history = mockHistory.map(h => ({
                    timestamp: new Date(h.timestamp).getTime(),
                    aqi: h.aqi
                }));
            }

            if (history.length === 0) {
                // 🌱 LIVE SEED FALLBACK: No Firebase history yet (fresh session / just connected).
                // If we have a valid live AQI, seed a minimal history from the current reading
                // so the forecast can still run. Use 3 identical points spread over 15 min.
                // ✅ Use currentAQIRef.current (always latest) — not the stale closure value.
                const liveAQIVal = currentAQIRef.current;
                if (liveAQIVal !== undefined && !isNaN(liveAQIVal) && isFinite(liveAQIVal)) {
                    console.log(`🌱 [Seed] No Firebase history — seeding from live AQI ${liveAQIVal}`);
                    const now = Date.now();
                    history = [
                        { timestamp: now - 15 * 60 * 1000, aqi: liveAQIVal, humidity: 50, temperature: 25 },
                        { timestamp: now - 10 * 60 * 1000, aqi: liveAQIVal, humidity: 50, temperature: 25 },
                        { timestamp: now - 5 * 60 * 1000, aqi: liveAQIVal, humidity: 50, temperature: 25 },
                    ];
                } else {
                    console.warn(`⚠️ No history and no valid live AQI for ${dbPath}. Cannot generate forecast.`);
                    setChartData([]);
                    setAiReasoning('');
                    setLoading(false);
                    isRunningRef.current = false;
                    return;
                }
            }

            // SYNC LIVE READING: Only inject a live point if currentAQI is a valid real number.
            // NEVER inject NaN — that would poison the history and disable the forecast.
            // ✅ Use ref to bypass stale closure from setTimeout.
            const liveAQI = currentAQIRef.current;
            if (liveAQI !== undefined && !isNaN(liveAQI) && isFinite(liveAQI)) {
                const livePoint = {
                    timestamp: Date.now(),
                    aqi: liveAQI,
                    humidity: 50,
                    temperature: 25
                };
                // If live point is newer than latest history, append it
                if (livePoint.timestamp > (history.length > 0 ? history[history.length - 1].timestamp : 0)) {
                    console.log(`📡 [Real-time Sync] Injecting live reading ${liveAQI} into history`);
                    history = [...history, livePoint];
                }
            }

            // Filter last 60 minutes of history for chart display
            const latestTimestamp = history[history.length - 1].timestamp;
            const ONE_HOUR = 60 * 60 * 1000;
            const chartHistory = history.filter(h => (latestTimestamp - h.timestamp) <= ONE_HOUR);

            // Fetch AI/Regression forecast
            const { predictions, reasoning } = await predictNext30Minutes(history);

            // Build UNIFIED chart data array — the correct Recharts multi-series pattern.
            // Using separate dataKeys (historicalAqi / forecastAqi) on a single array avoids
            // the index-matching bug where per-Line data props get cut off.
            const lastHistorical = chartHistory[chartHistory.length - 1];
            const unifiedData = [
                ...chartHistory.map(h => ({ timestamp: new Date(h.timestamp).toISOString(), historicalAqi: h.aqi, forecastAqi: undefined as number | undefined })),
                // Transition: last historical point also starts the forecast line
                ...predictions.map((p, i) => ({
                    timestamp: p.timestamp,
                    historicalAqi: i === 0 && lastHistorical ? lastHistorical.aqi : undefined,
                    forecastAqi: p.aqi
                }))
            ];

            setChartData(unifiedData as any);
            setAiReasoning(reasoning || '');
            setLastUpdate(new Date());
            if (currentAQIRef.current) lastPredictedAqiRef.current = currentAQIRef.current;

            // ✅ Record the timestamp of this forecast computation
            lastForecastTimestampRef.current = Date.now();
            console.log(`⏱️ Forecast computed at ${new Date().toLocaleTimeString()}. Next update in 5 minutes.`);
        } catch (e) {
            console.error("Prediction Error:", e);
        } finally {
            isRunningRef.current = false;
            setLoading(false);
        }
    };

    // ⏱️ FIXED 5-MINUTE FORECAST CYCLE
    // On first load or node switch, waits 30s for Firebase data to stabilise before forecasting.
    useEffect(() => {
        const FIVE_MINUTES = 5 * 60 * 1000;
        const STARTUP_DELAY_MS = 30 * 1000; // 30s grace period for data to arrive
        const timeSinceLastForecast = Date.now() - lastForecastTimestampRef.current;

        let startupTimeout: ReturnType<typeof setTimeout> | null = null;

        if (lastForecastTimestampRef.current === 0 || timeSinceLastForecast >= FIVE_MINUTES) {
            console.log(`⏱️ [Forecast Cycle] Waiting ${STARTUP_DELAY_MS / 1000}s for ESP data to stabilise before first forecast...`);
            startupTimeout = setTimeout(() => {
                console.log(`⏱️ [Forecast Cycle] Startup delay complete — running first forecast.`);
                refreshPredictions();
            }, STARTUP_DELAY_MS);
        } else {
            console.log(`⏱️ [Forecast Cycle] Skipping — only ${Math.round(timeSinceLastForecast / 1000)}s since last forecast.`);
        }

        const interval = setInterval(() => {
            console.log(`⏱️ [Forecast Cycle] 5-minute clock tick.`);
            refreshPredictions();
        }, FIVE_MINUTES);

        return () => {
            if (startupTimeout) clearTimeout(startupTimeout);
            clearInterval(interval);
        };
    }, [selectedId]); // Only re-runs on node switch

    // 🔌 RECONNECTION TRIGGER: When ESP comes back online (NaN → valid AQI),
    // wait 30 seconds for data to stabilise, then trigger a fresh forecast.
    const prevAQIRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        const wasNaN = prevAQIRef.current === undefined || isNaN(prevAQIRef.current as number);
        const isNowValid = currentAQI !== undefined && !isNaN(currentAQI) && isFinite(currentAQI);

        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

        if (wasNaN && isNowValid) {
            console.log(`🔌 [Reconnect] ESP came online (AQI: ${currentAQI}). Waiting 30s for data to stabilise...`);
            reconnectTimeout = setTimeout(() => {
                console.log(`🔌 [Reconnect] 30s elapsed — triggering forecast after ESP reconnect.`);
                refreshPredictions();
            }, 30000);
        }
        prevAQIRef.current = currentAQI;

        return () => { if (reconnectTimeout) clearTimeout(reconnectTimeout); };
    }, [currentAQI]); // Watches for sensor state changes only

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            // In the unified model, a point is forecast if forecastAqi is defined
            // AND historicalAqi is not (or it's the transition point where we consider it forecast)
            const isForecast = data.forecastAqi !== undefined && data.historicalAqi === undefined;
            const val = isForecast ? data.forecastAqi : (data.historicalAqi ?? data.forecastAqi);
            const category = NAQI_BREAKPOINTS.find(b => val >= b.minAQI && val <= b.maxAQI);
            const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            return (
                <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">
                        {time} <span className={`px-1 py-0.5 rounded text-[8px] font-black ${isForecast ? 'bg-purple-700 text-purple-100' : 'bg-blue-700 text-blue-100'}`}>{isForecast ? 'FORECAST' : 'HISTORICAL'}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black">{val !== undefined ? Math.round(val) : '—'}</span>
                        <span className="text-[9px] text-slate-400 font-bold">AQI</span>
                        {category && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black text-slate-900 ${category.color}`}>
                                {category.category}
                            </span>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const formatXAxis = (tickItem: string) => {
        return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };


    return (
        <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm flex flex-col h-full max-h-[600px]">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">AI Forecast Model</h3>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">{nodeName || 'Node'} Forecast</h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-blue-500"></span>
                        <span className="text-[8px] font-black text-slate-400">Trend</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 border-t-2 border-dashed border-purple-500"></span>
                        <span className="text-[8px] font-black text-slate-400">AI</span>
                    </div>
                </div>
            </div>

            {sprinklerActive && (
                <div className="mb-4 px-3 py-2 bg-green-50 border border-green-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </div>
                        <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Mitigation Active</span>
                    </div>
                </div>
            )}

            <div className="h-[180px] w-full -ml-4">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="timestamp" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Blue solid line: historical trend */}
                            <Line
                                type="monotone"
                                dataKey="historicalAqi"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />
                            {/* Purple dashed line: AI forecast — no per-Line data prop to avoid index cut-off */}
                            <Line
                                type="monotone"
                                dataKey="forecastAqi"
                                stroke="#a855f7"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-100 italic">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No history found</p>
                    </div>
                )}
            </div>

            {aiReasoning && (
                <div className="mt-3 p-2 bg-blue-50/50 border border-blue-100/50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">AI Insight</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-700 leading-tight italic">
                        "{aiReasoning}"
                    </p>
                </div>
            )}

            {chartData.filter((d: any) => d.forecastAqi !== undefined && !isNaN(d.forecastAqi) && d.historicalAqi === undefined).length > 0 && (() => {
                const forecastBreakdown = chartData.filter((d: any) => d.forecastAqi !== undefined && !isNaN(d.forecastAqi) && d.historicalAqi === undefined);
                return (
                    <div className="mt-4">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">30m Forecast Breakdown</h3>
                        <div className="grid grid-cols-6 gap-1">
                            {forecastBreakdown.map((p: any, i: number) => {
                                const category = NAQI_BREAKPOINTS.find(b => p.forecastAqi >= b.minAQI && p.forecastAqi <= b.maxAQI);
                                return (
                                    <div key={i} className="bg-slate-50 rounded-md p-1 border border-slate-100 text-center">
                                        <div className="text-[7px] font-black text-slate-400 uppercase mb-0.5">+{(i + 1) * 5}m</div>
                                        <div className="text-xs font-black text-slate-900">{Math.round(p.forecastAqi)}</div>
                                        <div className={`text-[6px] font-black uppercase px-1 py-0.5 rounded-sm inline-block ${category?.color || 'bg-slate-200'} text-slate-900 mt-0.5`}>
                                            {category?.category.split(' ')[0]}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            <div className="mt-auto flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-3">
                <span>Refreshed: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></span>
                    Next Update: {new Date(lastUpdate.getTime() + 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
};

export default PredictionModule;
