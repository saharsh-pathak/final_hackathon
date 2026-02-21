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

    const refreshPredictions = async () => {
        if (!selectedId) return;
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
                console.warn(`⚠️ No history found (real or mock) for ${dbPath}`);
                setChartData([]);
                setAiReasoning('');
                setLoading(false);
                return;
            }

            // SYNC LIVE REAING: If we have a live currentAQI, ensure it's the latest point in history
            if (currentAQI !== undefined) {
                // For demo, ensure the live reading also falls within our satisfactory [20, 95] window
                const demoAqi = Math.max(20, Math.min(95, currentAQI));
                const livePoint = { timestamp: Date.now(), aqi: demoAqi };
                // If live point is newer than latest history, append it
                if (livePoint.timestamp > (history.length > 0 ? history[history.length - 1].timestamp : 0)) {
                    console.log(`📡 [Real-time Sync/Demo Clamp] Injecting live reading ${demoAqi} into history`);
                    history = [...history, livePoint];
                }
            }

            // Get historical data for chart
            const latestTimestamp = history[history.length - 1].timestamp;
            const ONE_HOUR = 60 * 60 * 1000;
            const chartHistory: PredictionPoint[] = history
                .filter(h => (latestTimestamp - h.timestamp) <= ONE_HOUR)
                .map(h => ({
                    timestamp: new Date(h.timestamp).toISOString(),
                    aqi: Math.max(20, Math.min(95, h.aqi)),
                    type: 'historical' as const
                }));

            // Fetch AI/Regression forecast
            const { predictions, reasoning } = await predictNext30Minutes(history);

            setChartData([...chartHistory, ...predictions]);
            setAiReasoning(reasoning || '');
            setLastUpdate(new Date());
            if (currentAQI) lastPredictedAqiRef.current = currentAQI;
        } catch (e) {
            console.error("Prediction Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const drift = Math.abs((currentAQI || 0) - lastPredictedAqiRef.current);
        // Refresh only if first run (0), ID change, or signficant drift (> 10%)
        if (lastPredictedAqiRef.current === 0 || drift > 5) {
            refreshPredictions();
        }

        const interval = setInterval(refreshPredictions, 5 * 60 * 1000); // 5 mins
        return () => clearInterval(interval);
    }, [selectedId, currentAQI]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isForecast = data.type === 'forecast';
            const val = data.aqi;
            const category = NAQI_BREAKPOINTS.find(b => val >= b.minAQI && val <= b.maxAQI);

            return (
                <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">
                        {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} {isForecast ? '(Forecast)' : '(Historical)'}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black">{val}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black text-slate-900 ${category?.color || 'bg-slate-200'}`}>
                            {category?.category || 'Unknown'}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const formatXAxis = (tickItem: string) => {
        return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const historyPoints = useMemo(() => chartData.filter(d => d.type === 'historical'), [chartData]);
    const forecastPoints = useMemo(() => chartData.filter(d => d.type === 'forecast'), [chartData]);

    const forecastChartData = useMemo(() => {
        const lastHistorical = historyPoints[historyPoints.length - 1];
        return lastHistorical ? [lastHistorical, ...forecastPoints] : forecastPoints;
    }, [historyPoints, forecastPoints]);

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
                            <Line
                                type="monotone"
                                dataKey="aqi"
                                data={historyPoints}
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="aqi"
                                data={forecastChartData}
                                stroke="#a855f7"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={false}
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

            {forecastPoints.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">30m Forecast Breakdown</h3>
                    <div className="grid grid-cols-6 gap-1">
                        {forecastPoints.map((p, i) => {
                            const category = NAQI_BREAKPOINTS.find(b => p.aqi >= b.minAQI && p.aqi <= b.maxAQI);
                            return (
                                <div key={i} className="bg-slate-50 rounded-md p-1 border border-slate-100 text-center">
                                    <div className="text-[7px] font-black text-slate-400 uppercase mb-0.5">+{(i + 1) * 5}m</div>
                                    <div className="text-xs font-black text-slate-900">{Math.round(p.aqi)}</div>
                                    <div className={`text-[6px] font-black uppercase px-1 py-0.5 rounded-sm inline-block ${category?.color || 'bg-slate-200'} text-slate-900 mt-0.5`}>
                                        {category?.category.split(' ')[0]}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-auto flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-3">
                <span>Refreshed: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="flex items-center gap-1">
                    {forecastPoints[0]?.isAI && <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded-sm">AI POWERED</span>}
                </span>
            </div>
        </div>
    );
};

export default PredictionModule;
