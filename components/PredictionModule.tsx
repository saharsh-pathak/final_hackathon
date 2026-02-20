import React, { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchNodeHistory, getChartData, PredictionPoint } from '../services/predictionService';
import { NAQI_BREAKPOINTS } from '../constants';

interface PredictionModuleProps {
    selectedId: string | null;
    nodeName?: string;
    sprinklerActive?: boolean;
}

const PredictionModule: React.FC<PredictionModuleProps> = ({ selectedId, nodeName, sprinklerActive }) => {
    const [chartData, setChartData] = useState<PredictionPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const refreshPredictions = async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
            const dbPath = selectedId.startsWith('node-')
                ? selectedId.replace('node-', 'Node')
                : selectedId;

            console.log(`🔮 Fetching history for ${dbPath}...`);
            const history = await fetchNodeHistory(dbPath);

            if (history.length === 0) {
                console.warn(`⚠️ No history found for ${dbPath}`);
                setChartData([]);
                setLoading(false);
                return;
            }

            const data = getChartData(history);
            setChartData(data);
            setLastUpdate(new Date());
        } catch (e) {
            console.error("Prediction Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshPredictions();
        const interval = setInterval(refreshPredictions, 5 * 60 * 1000); // 5 mins
        return () => clearInterval(interval);
    }, [selectedId]);

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
        <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">AI Forecast Model</h3>
                    <h2 className="text-xl font-black text-slate-900">{nodeName || 'Sensor Node 1'} Forecast</h2>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                        <span className="w-2.5 h-0.5 bg-blue-500"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Trend</span>
                        <span className="w-2.5 h-0.5 border-t-2 border-dashed border-purple-500 ml-2"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Prediction</span>
                    </div>
                </div>
            </div>

            {sprinklerActive && (
                <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </div>
                        <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Mitigation Active</span>
                    </div>
                    <span className="text-[9px] font-bold text-green-600 uppercase">Sprinkler System Operational</span>
                </div>
            )}

            <div className="flex-grow h-64 w-full relative">
                {loading && chartData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold animate-pulse">
                        Calculating Regression Model...
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">No Sensor History Found</span>
                        <span className="text-[8px] font-bold opacity-60">Path: history/{selectedId?.replace('node-', 'Node') || 'Node1'}</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatXAxis}
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                                minTickGap={30}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 500]}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            <Line
                                type="monotone"
                                dataKey="aqi"
                                data={historyPoints}
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
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
                                activeDot={{ r: 4, strokeWidth: 0 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="mt-4 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-4">
                <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                <span>Linear Regression (Last 60m)</span>
            </div>
        </div>
    );
};

export default PredictionModule;
