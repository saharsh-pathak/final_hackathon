
import React, { useState, useEffect, useMemo } from 'react';
import { LocationData, AQICategory, SprinklerStatus, SprinklerState } from './types';
import { TEMP_AQI_LOCATIONS, NAQI_BREAKPOINTS, OFFICIAL_STATION_DATA, MAP_CENTER } from './constants';
import { calculateAQI, generateMockHistory, fetchRealAQI, simulateNodeData, generateMockPredictions, simulateSprinklerImpact } from './services/aqiService';
import AQIMap from './components/AQIMap';
import PredictionModule from './components/PredictionModule';
import SprinklerControl from './components/SprinklerControl';

const App: React.FC = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [officialStation, setOfficialStation] = useState<LocationData>(OFFICIAL_STATION_DATA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [sprinklerStatus, setSprinklerStatus] = useState<SprinklerStatus>({
    state: SprinklerState.INACTIVE,
    threshold: 80, // Target AQI
    autoMode: true
  });
  const [sprinklerHistory, setSprinklerHistory] = useState<any[]>([]);

  useEffect(() => {
    const initData = async () => {
      console.log('🚀 Initializing Enhanced TEMP AQI System...');
      setLoading(true);

      try {
        // Fetch real data for Node 1 (Phase 1 Market)
        const node1Base = await fetchRealAQI(TEMP_AQI_LOCATIONS[0].coordinates[0], TEMP_AQI_LOCATIONS[0].coordinates[1]);

        // Initialize Official Station (Patparganj) - Simulate based on real city average if API available
        // Here we just use the constant but could fetch real data too
        const offStation = { ...OFFICIAL_STATION_DATA };
        offStation.currentReading.timestamp = new Date().toISOString();
        setOfficialStation(offStation);

        const data: LocationData[] = TEMP_AQI_LOCATIONS.map((loc, idx) => {
          let nodeReading;
          if (idx === 0) {
            nodeReading = node1Base;
          } else {
            // Simulate Nodes 2, 3, 4 based on Node 1 with strategic spatial variance
            const offsets = [0, 12, 45, -8]; // Real-world variance simulation
            nodeReading = simulateNodeData(node1Base.pm25, offsets[idx]);
          }

          return {
            ...loc,
            currentReading: {
              timestamp: new Date().toISOString(),
              ...nodeReading
            },
            history: generateMockHistory(nodeReading.pm25),
            predictions: generateMockPredictions(nodeReading.pm25)
          };
        });

        setLocations(data);
        if (data.length > 0) setSelectedId(data[0].id);
        console.log('✅ Strategic initialization complete!');
      } catch (error) {
        console.error('❌ Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const allLocations = useMemo(() => [officialStation, ...locations], [officialStation, locations]);
  const selectedLocation = useMemo(() => allLocations.find(l => l.id === selectedId), [allLocations, selectedId]);

  const colonyAverageAQI = useMemo(() => {
    if (locations.length === 0) return 0;
    const sum = locations.reduce((acc, loc) => acc + loc.currentReading.aqi, 0);
    return Math.round(sum / locations.length);
  }, [locations]);

  const colonyAverageHumidity = useMemo(() => {
    if (locations.length === 0) return 45;
    const validReadings = locations.filter(l => l.currentReading.humidity !== undefined);
    if (validReadings.length === 0) return 45;
    const sum = validReadings.reduce((acc, loc) => acc + (loc.currentReading.humidity || 0), 0);
    return Math.round(sum / validReadings.length);
  }, [locations]);

  const comparisonDelta = useMemo(() => {
    return colonyAverageAQI - officialStation.currentReading.aqi;
  }, [colonyAverageAQI, officialStation]);

  const handleTriggerSprinkler = () => {
    if (sprinklerStatus.state === SprinklerState.ACTIVE) return;

    // Dynamic Duration Algorithm: Scales with AQI (Pollution) and Inversely with Humidity
    const baseDuration = 3.0;
    const aqiFactor = colonyAverageAQI / 150;
    const humidityFactor = (100 - colonyAverageHumidity) / 100;
    const calculatedDuration = Math.min(Math.max(baseDuration * aqiFactor * humidityFactor, 2), 10);
    const roundedDuration = Math.round(calculatedDuration * 10) / 10;

    setSprinklerStatus(prev => ({ ...prev, state: SprinklerState.ACTIVE }));

    const aqiBefore = colonyAverageAQI;

    setTimeout(() => {
      const aqiAfter = simulateSprinklerImpact(aqiBefore);
      const newEntry = {
        timestamp: new Date().toISOString(),
        duration: roundedDuration,
        aqiBefore,
        aqiAfter
      };

      setSprinklerHistory(prev => [newEntry, ...prev]);
      setSprinklerStatus(prev => ({
        ...prev,
        state: SprinklerState.INACTIVE,
        lastActivation: new Date().toISOString()
      }));

      // Update locations to show reduction
      setLocations(prev => prev.map(loc => {
        const newPM = loc.currentReading.pm25 * (aqiAfter / aqiBefore);
        const { aqi, category } = calculateAQI(newPM);
        return {
          ...loc,
          currentReading: { ...loc.currentReading, pm25: newPM, aqi, category }
        };
      }));
    }, 5000);
  };

  // Automatic Trigger Logic: Dual-Zone Proactive Maintenance
  useEffect(() => {
    if (!sprinklerStatus.autoMode || sprinklerStatus.state === SprinklerState.ACTIVE) return;

    const TARGET_AQI = 80;
    const MAINTENANCE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

    const shouldTrigger = () => {
      // 1. Critical Mitigation Zone
      if (colonyAverageAQI >= 200) {
        console.log('🚨 Critical Mitigation Triggered');
        return true;
      }

      // 2. Proactive Maintenance Zone
      if (colonyAverageAQI > TARGET_AQI) {
        if (!sprinklerStatus.lastActivation) return true;

        const lastTime = new Date(sprinklerStatus.lastActivation).getTime();
        const timeSince = Date.now() - lastTime;

        if (timeSince > MAINTENANCE_COOLDOWN_MS) {
          console.log('🌱 Proactive Maintenance Triggered');
          return true;
        }
      }

      return false;
    };

    if (shouldTrigger()) {
      handleTriggerSprinkler();
    }
  }, [colonyAverageAQI, sprinklerStatus.autoMode, sprinklerStatus.state, sprinklerStatus.lastActivation]);

  const getAqiInfo = (category: AQICategory) => NAQI_BREAKPOINTS.find(b => b.category === category);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-black tracking-tight uppercase text-xs">Mapping Hyperlocal Data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-lg shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">TEMP AQI Dashboard</h1>
              <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest mt-1">Strategic Urban Mitigation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showComparison ? 'bg-blue-900 text-white shadow-lg scale-105' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              Comparison View
            </button>
            <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[8px] font-black text-slate-400 uppercase block">Colony Average</span>
                <span className="text-xl font-black text-slate-900 tracking-tighter">{colonyAverageAQI} AQI</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8">
        {showComparison && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="text-center md:text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Official Reference</span>
                  <div className="text-4xl font-black tracking-tighter mt-1">{officialStation.currentReading.aqi} AQI</div>
                  <p className="text-[10px] font-bold mt-2 opacity-80 uppercase tracking-widest">DPCC Patparganj Station</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-full ${comparisonDelta > 0 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {Math.abs(comparisonDelta).toFixed(1)} AQI Variation
                  </div>
                  <div className="h-px w-32 bg-white/20 my-4"></div>
                  <p className="text-[10px] font-medium opacity-60 text-center max-w-[200px]">Hyperlocal sensors detect localized hotspots missed by official grids.</p>
                </div>
                <div className="text-center md:text-right">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">TEMP Network</span>
                  <div className="text-4xl font-black tracking-tighter mt-1">{colonyAverageAQI} AQI</div>
                  <p className="text-[10px] font-bold mt-2 opacity-80 uppercase tracking-widest">Hyperlocal Colony Average</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Map and Node Grid */}
          <div className="lg:col-span-7 space-y-8">
            <AQIMap locations={locations} selectedId={selectedId} onSelectLocation={setSelectedId} clusters={{}} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {locations.filter(l => l.type === 'TEMP_NODE').map(loc => {
                const info = getAqiInfo(loc.currentReading.category);
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedId(loc.id)}
                    className={`p-5 rounded-[2rem] text-left border-4 transition-all ${selectedId === loc.id ? 'bg-white border-blue-900 shadow-2xl -translate-y-1' : 'bg-white border-transparent hover:border-slate-100 shadow-sm'}`}
                  >
                    <div className={`w-8 h-1.5 rounded-full mb-4 ${info?.color}`} />
                    <h4 className="text-[9px] font-black text-slate-500 line-clamp-1 mb-1 uppercase tracking-tight">{loc.name}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{loc.currentReading.aqi}</span>
                      <span className="text-[10px] font-bold text-slate-400">AQI</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <SprinklerControl
              status={sprinklerStatus}
              history={sprinklerHistory}
              onTrigger={handleTriggerSprinkler}
              onToggleAuto={(val) => setSprinklerStatus(p => ({ ...p, autoMode: val }))}
              onSetThreshold={(val) => setSprinklerStatus(p => ({ ...p, threshold: val }))}
            />
          </div>

          {/* Right Column: Node Details and Predictions */}
          <div className="lg:col-span-5 space-y-8">
            {selectedLocation ? (
              <>
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                  <div className={`h-3 ${getAqiInfo(selectedLocation.currentReading.category)?.color}`} />
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block">
                          {selectedLocation.type === 'OFFICIAL' ? 'Official Reference' : 'Hyperlocal Node'}
                        </span>
                        <h2 className="text-3xl font-black text-slate-900 leading-none">{selectedLocation.name}</h2>
                        {selectedLocation.isSimulated && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 block italic">Virtualized Simulation Node</span>}
                      </div>
                      <div className={`px-6 py-4 rounded-3xl text-center ${getAqiInfo(selectedLocation.currentReading.category)?.color} text-white shadow-2xl`}>
                        <div className="text-4xl font-black tracking-tighter">{selectedLocation.currentReading.aqi}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1">AQI</div>
                      </div>
                    </div>

                    {selectedLocation.type === 'OFFICIAL' ? (
                      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-8">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Official Station Metadata</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Operator</p>
                            <p className="text-xs font-black text-slate-800">DPCC / CPCB</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Radius</p>
                            <p className="text-xs font-black text-slate-800">5.0 Kilometers</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Measured Pollutants</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedLocation.officialData?.pollutants.map(p => (
                                <span key={p} className="px-2 py-1 bg-white text-[8px] font-black rounded-lg border border-slate-200">{p}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">PM2.5</span>
                          <span className="text-xl font-black text-slate-800">{selectedLocation.currentReading.pm25.toFixed(2)}</span>
                        </div>
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">PM10</span>
                          <span className="text-xl font-black text-slate-800">{selectedLocation.currentReading.pm10.toFixed(2)}</span>
                        </div>
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Humidity</span>
                          <span className="text-xl font-black text-slate-800">{selectedLocation.currentReading.humidity?.toFixed(1) || '--'}%</span>
                        </div>
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 col-span-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16 10-4 4-4-4" /></svg>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Station Proximity</span>
                                <span className="text-sm font-black text-blue-900 tracking-tight">
                                  {(() => {
                                    const lat1 = selectedLocation.coordinates[0];
                                    const lon1 = selectedLocation.coordinates[1];
                                    const lat2 = OFFICIAL_STATION_DATA.coordinates[0];
                                    const lon2 = OFFICIAL_STATION_DATA.coordinates[1];
                                    const R = 6371; // km
                                    const dLat = (lat2 - lat1) * Math.PI / 180;
                                    const dLon = (lon2 - lon1) * Math.PI / 180;
                                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                    return (R * c).toFixed(2);
                                  })()} km from Ref Station
                                </span>
                              </div>
                            </div>
                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[8px] font-black uppercase">Hyperlocal Zone</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100 text-blue-900 shadow-inner">
                      <span className="text-[10px] font-black uppercase tracking-widest block mb-2">Category Health Insight</span>
                      <p className="text-[11px] font-bold leading-relaxed">{getAqiInfo(selectedLocation.currentReading.category)?.description}</p>
                    </div>
                  </div>
                </div>

                <PredictionModule predictions={selectedLocation.predictions} />
              </>
            ) : (
              <div className="h-[500px] flex items-center justify-center p-12 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-slate-300 font-black text-center text-xl uppercase tracking-tighter">
                Click a marker on the map <br /> to reveal analytics.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
