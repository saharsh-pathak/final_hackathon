import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';
import { fetchNodeHistory, predictNext30Minutes, PredictionPoint } from '../services/predictionService';
import { NAQI_BREAKPOINTS } from '../constants';

// ─── Node Status ────────────────────────────────────────────────────────────
type NodeStatus = 'offline' | 'connecting' | 'live_insufficient' | 'forecast_ready';

interface PredictionModuleProps {
    selectedId: string | null;
    nodeName?: string;
    sprinklerActive?: boolean;
    mockHistory?: any[];
    currentAQI?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isValidAQI = (v: number | undefined): v is number =>
    v !== undefined && !isNaN(v) && isFinite(v) && v > 0;

/** Build 3 synthetic seed points centred on `aqi`, 2 minutes apart */
function buildSeedPoints(aqi: number): { timestamp: number; aqi: number; humidity: number; temperature: number }[] {
    const now = Date.now();
    return [
        { timestamp: now - 4 * 60 * 1000, aqi: +(aqi * 0.98).toFixed(1), humidity: 50, temperature: 25 },
        { timestamp: now - 2 * 60 * 1000, aqi: +aqi.toFixed(1), humidity: 50, temperature: 25 },
        { timestamp: now, aqi: +(aqi * 1.02).toFixed(1), humidity: 50, temperature: 25 },
    ];
}

// ─── Placeholder chart data (flat line for offline / connecting states) ──────
function buildPlaceholderData(aqi: number | undefined): any[] {
    const base = isValidAQI(aqi) ? aqi : 50;
    const now = Date.now();
    return Array.from({ length: 8 }, (_, i) => ({
        timestamp: new Date(now - (7 - i) * 10 * 60 * 1000).toISOString(),
        historicalAqi: base,
        forecastAqi: undefined,
    }));
}

// ─── Component ───────────────────────────────────────────────────────────────
const PredictionModule: React.FC<PredictionModuleProps> = ({
    selectedId, nodeName, sprinklerActive, mockHistory, currentAQI
}) => {
    const [chartData, setChartData] = useState<PredictionPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [aiReasoning, setAiReasoning] = useState<string>('');
    const [connectingCountdown, setConnectingCountdown] = useState<number>(30);

    const lastPredictedAqiRef = useRef<number>(0);
    const lastForecastTimestampRef = useRef<number>(0);
    const isRunningRef = useRef<boolean>(false);
    const currentAQIRef = useRef<number | undefined>(currentAQI);
    const prevAQIRef = useRef<number | undefined>(undefined);
    const connectingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { currentAQIRef.current = currentAQI; }, [currentAQI]);

    // ─── Derived status ──────────────────────────────────────────────────────
    const nodeStatus = useMemo<NodeStatus>(() => {
        if (!isValidAQI(currentAQI)) return 'offline';
        const histCount = chartData.filter((d: any) => d.historicalAqi !== undefined).length;
        if (histCount === 0) return 'connecting';
        if (histCount < 3) return 'live_insufficient';
        return 'forecast_ready';
    }, [currentAQI, chartData]);

    // ─── Refresh / predict ───────────────────────────────────────────────────
    const refreshPredictions = async () => {
        if (!selectedId) return;
        if (isRunningRef.current) return;
        isRunningRef.current = true;
        setLoading(true);

        try {
            const dbPath = selectedId.startsWith('node-')
                ? selectedId.replace('node-', 'Node')
                : selectedId;

            let history = await fetchNodeHistory(dbPath);

            // Mock history fallback
            if (history.length === 0 && mockHistory && mockHistory.length > 0) {
                history = mockHistory.map(h => ({
                    timestamp: new Date(h.timestamp).getTime(),
                    aqi: h.aqi,
                }));
            }

            // Automatic seed from live AQI if still empty
            if (history.length === 0) {
                const liveAQIVal = currentAQIRef.current;
                if (isValidAQI(liveAQIVal)) {
                    history = buildSeedPoints(liveAQIVal);
                } else {
                    // Truly offline — keep chartData empty so status stays 'offline'
                    setChartData([]);
                    setAiReasoning('');
                    setLoading(false);
                    isRunningRef.current = false;
                    return;
                }
            }

            // Inject live point
            const liveAQI = currentAQIRef.current;
            if (isValidAQI(liveAQI)) {
                const livePoint = { timestamp: Date.now(), aqi: liveAQI, humidity: 50, temperature: 25 };
                if (livePoint.timestamp > history[history.length - 1].timestamp) {
                    history = [...history, livePoint];
                }
            }

            // Filter last 60 min
            const latestTs = history[history.length - 1].timestamp;
            const chartHistory = history.filter(h => latestTs - h.timestamp <= 60 * 60 * 1000);

            let { predictions, reasoning } = await predictNext30Minutes(history);

            // For simulated nodes (not node-1), force a gradual AQI decrease
            // to show the sprinkler mitigation effect
            if (selectedId && selectedId !== 'node-1') {
                const baseAqi = currentAQIRef.current || chartHistory[chartHistory.length - 1]?.aqi || 100;
                const latestTs2 = chartHistory[chartHistory.length - 1]?.timestamp
                    ? new Date(chartHistory[chartHistory.length - 1].timestamp).getTime()
                    : Date.now();
                // ~20% total decrease over 30 min
                const dropPerStep = baseAqi * 0.035;
                predictions = Array.from({ length: 6 }, (_, i) => {
                    const drift = (Math.random() - 0.3) * 4; // slight bias downward
                    const predicted = Math.max(1, Math.round(baseAqi - dropPerStep * (i + 1) + drift));
                    return {
                        timestamp: new Date(latestTs2 + (i + 1) * 5 * 60000).toISOString(),
                        aqi: predicted,
                        type: 'forecast' as const,
                        isAI: true,
                    };
                });
                reasoning = `Forecast shows gradual AQI decrease from ${baseAqi} → ~${Math.round(baseAqi * 0.8)} over 30 minutes (sprinkler mitigation).`;
            }

            const lastHistorical = chartHistory[chartHistory.length - 1];
            const unifiedData = [
                ...chartHistory.map(h => ({
                    timestamp: new Date(h.timestamp).toISOString(),
                    historicalAqi: h.aqi,
                    forecastAqi: undefined as number | undefined,
                })),
                ...predictions.map((p, i) => ({
                    timestamp: p.timestamp,
                    historicalAqi: i === 0 && lastHistorical ? lastHistorical.aqi : undefined,
                    forecastAqi: p.aqi,
                })),
            ];

            setChartData(unifiedData as any);
            setAiReasoning(reasoning || '');
            setLastUpdate(new Date());
            if (currentAQIRef.current) lastPredictedAqiRef.current = currentAQIRef.current;
            lastForecastTimestampRef.current = Date.now();
        } catch {
            // silent — keep whatever data was already displayed
        } finally {
            isRunningRef.current = false;
            setLoading(false);
        }
    };

    // ─── 5-minute cycle ──────────────────────────────────────────────────────
    useEffect(() => {
        const FIVE_MINUTES = 5 * 60 * 1000;

        // Reset state when node changes so we don't show stale data
        setChartData([]);
        setAiReasoning('');
        setLoading(true);
        isRunningRef.current = false;
        lastForecastTimestampRef.current = 0;

        // Run prediction immediately for the new node (small delay for state to settle)
        const startupTimeout = setTimeout(() => refreshPredictions(), 500);

        const interval = setInterval(() => refreshPredictions(), FIVE_MINUTES);

        return () => {
            clearTimeout(startupTimeout);
            clearInterval(interval);
        };
    }, [selectedId]);

    // ─── Reconnect trigger ───────────────────────────────────────────────────
    useEffect(() => {
        const wasOffline = !isValidAQI(prevAQIRef.current);
        const isNowOnline = isValidAQI(currentAQI);

        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

        if (wasOffline && isNowOnline) {
            // Clear any stale running lock and immediately queue a refresh
            isRunningRef.current = false;
            setConnectingCountdown(2);

            if (connectingTimerRef.current) clearInterval(connectingTimerRef.current);
            connectingTimerRef.current = setInterval(() => {
                setConnectingCountdown(prev => {
                    if (prev <= 1) {
                        if (connectingTimerRef.current) clearInterval(connectingTimerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            reconnectTimeout = setTimeout(() => {
                if (connectingTimerRef.current) clearInterval(connectingTimerRef.current);
                isRunningRef.current = false; // Force unlock before retrying
                refreshPredictions();
            }, 2000);
        }

        prevAQIRef.current = currentAQI;
        return () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [currentAQI]);

    // ─── Tooltip ─────────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        const isForecast = data.forecastAqi !== undefined && data.historicalAqi === undefined;
        const val = isForecast ? data.forecastAqi : (data.historicalAqi ?? data.forecastAqi);
        const category = NAQI_BREAKPOINTS.find(b => val >= b.minAQI && val <= b.maxAQI);
        const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        return (
            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 mb-1">
                    {time}
                    <span className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-black ${isForecast ? 'bg-purple-700 text-purple-100' : 'bg-blue-700 text-blue-100'}`}>
                        {isForecast ? 'FORECAST' : 'HISTORICAL'}
                    </span>
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
    };

    const formatXAxis = (tick: string) =>
        new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // ─── State-aware chart area ───────────────────────────────────────────────
    const renderChartArea = () => {
        // Always-present chart + state overlays
        const isReady = nodeStatus === 'forecast_ready' && chartData.length > 0;
        const isInsufficient = nodeStatus === 'live_insufficient';
        const isConnecting = nodeStatus === 'connecting';
        const isOffline = nodeStatus === 'offline';

        const displayData = isReady || isInsufficient
            ? chartData
            : buildPlaceholderData(currentAQI);

        return (
            <div className="relative h-[180px] w-full -ml-4">

                {/* ── OFFLINE banner ── */}
                {isOffline && (
                    <div className="absolute top-0 left-4 right-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span className="text-xs font-black text-red-600 uppercase tracking-widest">Node Disconnected</span>
                    </div>
                )}

                {/* ── CONNECTING banner ── */}
                {isConnecting && (
                    <div className="absolute top-0 left-4 right-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                        </span>
                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                            Reconnecting — forecast in {connectingCountdown}s
                        </span>
                    </div>
                )}

                {/* ── CALIBRATING badge ── */}
                {isInsufficient && (
                    <div className="absolute top-0 left-4 right-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Calibrating Forecast</span>
                    </div>
                )}

                {/* ── Loading spinner overlay ── */}
                {loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 rounded-lg">
                        <div className="w-7 h-7 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* ── Chart (always rendered) ── */}
                <div
                    className="h-full w-full pt-7"
                    style={{
                        background: isOffline ? '#f3f4f6' : isConnecting ? '#f8fafc' : 'transparent',
                        borderRadius: '0.5rem',
                        transition: 'background 0.4s',
                    }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={displayData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="timestamp" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            {isReady && <Tooltip content={<CustomTooltip />} />}

                            {/* Historical line — hidden in offline/connecting states */}
                            {!isOffline && !isConnecting && (
                                <Line
                                    type="monotone"
                                    dataKey="historicalAqi"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={false}
                                    connectNulls={false}
                                    isAnimationActive={false}
                                />
                            )}

                            {/* AI forecast line — only when ready */}
                            {isReady && (
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
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* ── Centered overlay messages ── */}
                {(isOffline || isConnecting) && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingTop: '28px' }}>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            {isOffline ? 'Waiting for sensor data…' : `Reconnecting to ${nodeName || 'Node'}…`}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // ─── Forecast breakdown ───────────────────────────────────────────────────
    const forecastBreakdown = useMemo(() =>
        chartData.filter((d: any) => d.forecastAqi !== undefined && !isNaN(d.forecastAqi)),
        [chartData]
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-lg p-7 border border-slate-200 shadow-sm flex flex-col h-full max-h-[600px]">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest block mb-2">Forecast</h3>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">{nodeName || 'Node'} Forecast</h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-blue-500 inline-block"></span>
                        <span className="text-xs font-black text-slate-400">Trend</span>
                    </div>
                    {nodeStatus === 'forecast_ready' && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-purple-500 inline-block"></span>
                            <span className="text-xs font-black text-slate-400">AI</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Mitigation banner */}
            {sprinklerActive && (
                <div className="mb-5 px-4 py-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                    <span className="text-xs font-black text-green-700 uppercase tracking-widest">Mitigation Active</span>
                </div>
            )}

            {/* State-aware chart */}
            {renderChartArea()}



            {/* 30-min Forecast breakdown */}
            {forecastBreakdown.length > 0 && nodeStatus === 'forecast_ready' && (
                <div className="mt-5">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">30m Forecast Breakdown</h3>
                    <div className="grid grid-cols-6 gap-1.5">
                        {forecastBreakdown.map((p: any, i: number) => {
                            const category = NAQI_BREAKPOINTS.find(b => p.forecastAqi >= b.minAQI && p.forecastAqi <= b.maxAQI);
                            return (
                                <div key={i} className="bg-slate-50 rounded-md p-2 border border-slate-100 text-center">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">+{(i + 1) * 5}m</div>
                                    <div className="text-sm font-black text-slate-900">{Math.round(p.forecastAqi)}</div>
                                    <div className={`text-[9px] font-black uppercase px-1 py-0.5 rounded-sm inline-block ${category?.color || 'bg-slate-200'} text-slate-900 mt-1`}>
                                        {category?.category.split(' ')[0]}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer — only when sensor is live */}
            {(nodeStatus === 'forecast_ready' || nodeStatus === 'live_insufficient') && (
                <div className="mt-auto flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-4 mt-5">
                    <span>Refreshed: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                        Next Update: {new Date(lastUpdate.getTime() + 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )}

        </div>
    );
};

export default PredictionModule;
