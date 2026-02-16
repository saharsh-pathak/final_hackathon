import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Reading } from '../types';

interface Props {
  data: Reading[];
}

const TrendChart: React.FC<Props> = ({ data }) => {
  const formattedData = data.slice(-24).map(d => ({
    ...d,
    time: new Date(d.timestamp).getHours() + ":00"
  }));

  return (
    <div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis hide />
          <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Area type="monotone" dataKey="aqi" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;