
import React from 'react';
import { PredictionReading } from '../types';
import { NAQI_BREAKPOINTS } from '../constants';

interface PredictionModuleProps {
    predictions: PredictionReading[];
}

const PredictionModule: React.FC<PredictionModuleProps> = ({ predictions }) => {
    const getAqiColor = (aqi: number) => {
        return NAQI_BREAKPOINTS.find(b => aqi >= b.minAQI && aqi <= b.maxAQI)?.color || 'bg-slate-500';
    };

    return (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Forecast Module</h3>
                    <h2 className="text-xl font-black text-slate-900">30-Minute Forecast</h2>
                </div>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase tracking-widest">
                    ±20% Confidence
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Simplified Forecast Graph (Visual Representation) */}
                <div className="h-48 flex items-end gap-1 px-2 border-b border-slate-100">
                    {predictions.map((p, idx) => {
                        const height = (p.aqi / 500) * 100;
                        return (
                            <div
                                key={idx}
                                className={`flex-1 ${getAqiColor(p.aqi)} rounded-t-sm transition-all hover:opacity-80 relative group`}
                                style={{ height: `${height}%` }}
                            >
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[8px] p-1 rounded whitespace-nowrap z-10 transition-opacity">
                                    {new Date(p.timestamp).getHours()}:00 - AQI {p.aqi}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    <span>{new Date(predictions[0]?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Next 30 Minutes</span>
                    <span>{new Date(predictions[predictions.length - 1]?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Hourly Table */}
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                                <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">AQI</th>
                                <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {predictions.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-slate-700">
                                        {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-black text-slate-900">
                                        {p.aqi}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-black text-white ${getAqiColor(p.aqi)}`}>
                                            {p.category}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PredictionModule;
