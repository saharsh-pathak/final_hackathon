
import React, { useState, useEffect, useMemo } from 'react';
import { LocationData, AQICategory, SprinklerStatus, SprinklerState } from './types';
import { TEMP_AQI_LOCATIONS, NAQI_BREAKPOINTS, OFFICIAL_STATION_DATA, MAP_CENTER } from './constants';
import { calculateAQI, generateMockHistory, simulateNodeData, generateMockPredictions, simulateSprinklerImpact, subscribeToNode1, Node1FirebaseData } from './services/aqiService';
import AQIMap from './components/AQIMap';
import PredictionModule from './components/PredictionModule';
import SprinklerControl from './components/SprinklerControl';

const App: React.FC = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [officialStation, setOfficialStation] = useState<LocationData>(OFFICIAL_STATION_DATA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sprinklerStatus, setSprinklerStatus] = useState<SprinklerStatus>({
    state: SprinklerState.INACTIVE,
    threshold: 80, // Target AQI
    autoMode: true // Always on — automatic mode is the only mode
  });
  const [sprinklerHistory, setSprinklerHistory] = useState<any[]>([]);
  const [zoneLastTreated, setZoneLastTreated] = useState<{ [zoneId: string]: Date }>({});
  const [node1LiveData, setNode1LiveData] = useState<Node1FirebaseData | null>(null);
  const [node1Connected, setNode1Connected] = useState(false);
  const [historyModal, setHistoryModal] = useState<boolean>(false);
  // Genuine readings from ESP32 via Firebase, capped at 10
  const [node1History, setNode1History] = useState<Array<{
    timestamp: string; aqi: number; pm25: number; pm10: number;
    humidity: number; temperature: number; relayStatus: string;
  }>>([]);

  // Firebase live subscription for Node-1
  useEffect(() => {
    console.log('🔥 Subscribing to Firebase Node1...');
    const unsubscribe = subscribeToNode1((data) => {
      console.log('📡 Firebase Node1 update:', data);
      setNode1LiveData(data);
      setNode1Connected(true);

      // Append genuine ESP32 reading to history (capped at 10)
      const newReading = {
        timestamp: new Date(data.timestamp * 1000).toISOString(),
        aqi: data.aqi,
        pm25: data.pm25,
        pm10: parseFloat((data.pm25 * 1.6).toFixed(1)),
        humidity: data.humidity,
        temperature: data.temperature,
        relayStatus: data.relayStatus
      };
      setNode1History(prev => {
        const updated = [newReading, ...prev];
        return updated.slice(0, 10); // max 10 entries
      });

      // Update Node-1 in locations state with live ESP32 data
      setLocations(prev => prev.map(loc => {
        if (loc.id === 'node-1') {
          const pm25 = data.pm25 || 0;
          const { aqi, category } = data.aqi > 0
            ? { aqi: data.aqi, category: calculateAQI(pm25).category }
            : calculateAQI(pm25);
          return {
            ...loc,
            currentReading: {
              ...loc.currentReading,
              aqi,
              pm25,
              pm10: pm25 * 1.6,
              humidity: data.humidity,
              temperature: data.temperature,
              timestamp: new Date(data.timestamp * 1000).toISOString()
            }
          };
        }
        return loc;
      }));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initData = async () => {
      console.log('🚀 Initializing Enhanced TEMP AQI System...');
      setLoading(true);

      try {
        // Node-1 starts with a sensible fallback; Firebase subscription will overwrite with live data
        // as soon as the onValue listener fires (typically within ~500ms)
        const node1Base = { pm25: 85, pm10: 136, ...calculateAQI(85) };

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

        // Generate realistic mock history that matches current sensor readings
        // Current values: Node1=139, Node2=154, Node3=198, Node4=131
        const now = new Date();
        const mockHistory = [
          {
            timestamp: new Date(now.getTime() - 30 * 60000).toISOString(), // 30 min ago
            duration: 3.2,
            aqiBefore: 238,
            aqiAfter: 198, // Matches Node 3 current reading
            affectedZones: ['NH24 Highway Exit'],
            zoneCount: 1,
            zoneId: data[2]?.id // Node 3
          },
          {
            timestamp: new Date(now.getTime() - 55 * 60000).toISOString(), // 55 min ago
            duration: 2.8,
            aqiBefore: 186,
            aqiAfter: 154, // Matches Node 2 current reading
            affectedZones: ['Phase 2 Market Complex'],
            zoneCount: 1,
            zoneId: data[1]?.id // Node 2
          },
          {
            timestamp: new Date(now.getTime() - 80 * 60000).toISOString(), // 1h 20m ago
            duration: 3.5,
            aqiBefore: 167,
            aqiAfter: 139, // Matches Node 1 current reading
            affectedZones: ['Phase 1 Market'],
            zoneCount: 1,
            zoneId: data[0]?.id // Node 1
          },
          {
            timestamp: new Date(now.getTime() - 105 * 60000).toISOString(), // 1h 45m ago
            duration: 3.0,
            aqiBefore: 158,
            aqiAfter: 131, // Matches Node 4 current reading
            affectedZones: ['Sanjay Vihar'],
            zoneCount: 1,
            zoneId: data[3]?.id // Node 4
          },
          {
            timestamp: new Date(now.getTime() - 135 * 60000).toISOString(), // 2h 15m ago
            duration: 3.1,
            aqiBefore: 285,
            aqiAfter: 238,
            affectedZones: ['NH24 Highway Exit'],
            zoneCount: 1,
            zoneId: data[2]?.id
          },
          {
            timestamp: new Date(now.getTime() - 160 * 60000).toISOString(), // 2h 40m ago
            duration: 2.9,
            aqiBefore: 223,
            aqiAfter: 186,
            affectedZones: ['Phase 2 Market Complex'],
            zoneCount: 1,
            zoneId: data[1]?.id
          }
        ];

        setSprinklerHistory(mockHistory);

        // Initialize zone last treated times
        const initialZoneTimes: { [zoneId: string]: Date } = {};
        mockHistory.forEach(entry => {
          if (entry.zoneId && (!initialZoneTimes[entry.zoneId] || new Date(entry.timestamp) > initialZoneTimes[entry.zoneId])) {
            initialZoneTimes[entry.zoneId] = new Date(entry.timestamp);
          }
        });
        setZoneLastTreated(initialZoneTimes);

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

  const handleTriggerSprinkler = () => {
    if (sprinklerStatus.state === SprinklerState.ACTIVE) return;

    // Select the zone with highest AQI that hasn't been treated recently
    const COOLDOWN_MINUTES = 20;
    const now = new Date();

    const availableZones = locations
      .filter(loc => loc.type === 'TEMP_NODE')
      .filter(loc => {
        const lastTreated = zoneLastTreated[loc.id];
        if (!lastTreated) return true;
        const minutesSince = (now.getTime() - lastTreated.getTime()) / 60000;
        return minutesSince >= COOLDOWN_MINUTES;
      })
      .sort((a, b) => b.currentReading.aqi - a.currentReading.aqi); // Highest AQI first

    if (availableZones.length === 0) {
      console.log('⏳ All zones on cooldown.');
      return;
    }

    const targetZone = availableZones[0];
    const aqiBefore = targetZone.currentReading.aqi;

    // Dynamic Duration Algorithm: Scales with AQI (Pollution) and Inversely with Humidity
    const baseDuration = 3.0;
    const aqiFactor = aqiBefore / 150;
    const humidityFactor = (100 - (targetZone.currentReading.humidity || colonyAverageHumidity)) / 100;
    const calculatedDuration = Math.min(Math.max(baseDuration * aqiFactor * humidityFactor, 2), 10);
    const roundedDuration = Math.round(calculatedDuration * 10) / 10;

    setSprinklerStatus(prev => ({ ...prev, state: SprinklerState.ACTIVE }));

    console.log(`💧 Activating sprinkler for ${targetZone.name} (AQI: ${aqiBefore})`);

    setTimeout(() => {
      const aqiAfter = simulateSprinklerImpact(aqiBefore);

      const newEntry = {
        timestamp: new Date().toISOString(),
        duration: roundedDuration,
        aqiBefore,
        aqiAfter,
        affectedZones: [targetZone.name],
        zoneCount: 1,
        zoneId: targetZone.id
      };

      setSprinklerHistory(prev => [newEntry, ...prev]);
      setSprinklerStatus(prev => ({
        ...prev,
        state: SprinklerState.INACTIVE,
        lastActivation: new Date().toISOString()
      }));

      // Update only the treated zone's AQI
      setLocations(prev => prev.map(loc => {
        if (loc.id === targetZone.id) {
          const newPM = loc.currentReading.pm25 * (aqiAfter / aqiBefore);
          const { aqi, category } = calculateAQI(newPM);
          return {
            ...loc,
            currentReading: { ...loc.currentReading, pm25: newPM, aqi, category }
          };
        }
        return loc;
      }));

      // Update zone last treated timestamp
      setZoneLastTreated(prev => ({
        ...prev,
        [targetZone.id]: new Date()
      }));

      console.log(`✅ ${targetZone.name} treated: ${aqiBefore} → ${aqiAfter} AQI`);
    }, 5000);
  };

  // Automatic Trigger Logic: Forecast-Aware Proactive Maintenance
  // Checks both current AQI readings AND 30-min forecast peak to decide when to activate
  const forecastPeakAQI = useMemo(() => {
    if (locations.length === 0) return 0;
    let peak = 0;
    locations.filter(l => l.type === 'TEMP_NODE').forEach(loc => {
      if (loc.predictions) {
        loc.predictions.forEach(p => {
          if (p.aqi > peak) peak = p.aqi;
        });
      }
    });
    return peak;
  }, [locations]);

  useEffect(() => {
    if (sprinklerStatus.state === SprinklerState.ACTIVE) return;

    const TARGET_AQI = 80;
    const MAINTENANCE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

    const shouldTrigger = () => {
      // 1. Critical Mitigation: current AQI is very high
      if (colonyAverageAQI >= 200) {
        console.log('🚨 Critical Mitigation Triggered (current AQI)');
        return true;
      }

      // 2. Forecast-based Pre-emptive Trigger: forecast predicts high AQI
      if (forecastPeakAQI >= 200) {
        if (!sprinklerStatus.lastActivation) return true;
        const lastTime = new Date(sprinklerStatus.lastActivation).getTime();
        if (Date.now() - lastTime > MAINTENANCE_COOLDOWN_MS) {
          console.log('🔮 Forecast Pre-emptive Trigger (predicted AQI:', forecastPeakAQI, ')');
          return true;
        }
      }

      // 3. Proactive Maintenance: current AQI above target
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
  }, [colonyAverageAQI, forecastPeakAQI, sprinklerStatus.state, sprinklerStatus.lastActivation]);

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

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[8px] font-black text-slate-400 uppercase block">Colony Average</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">{colonyAverageAQI} AQI</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Node Grid, Sprinkler Control, and Map */}
          <div className="lg:col-span-7 space-y-8">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {locations.filter(l => l.type === 'TEMP_NODE').map(loc => {
                const info = getAqiInfo(loc.currentReading.category);
                const lastTreated = zoneLastTreated[loc.id];
                const minutesSince = lastTreated ? (new Date().getTime() - lastTreated.getTime()) / 60000 : 999;
                const isRecentlyTreated = minutesSince < 60;
                const isLiveNode = loc.id === 'node-1' && node1Connected;
                const isNode1 = loc.id === 'node-1';
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setSelectedId(loc.id);
                      if (isNode1) setHistoryModal(true);
                    }}
                    className={`p-5 rounded-lg text-left border-4 transition-all relative ${selectedId === loc.id ? 'bg-white border-blue-900 shadow-2xl -translate-y-1' : isRecentlyTreated ? 'bg-white border-green-400 shadow-md hover:shadow-lg' : 'bg-white border-transparent hover:border-slate-100 shadow-sm'}`}
                  >
                    {isLiveNode && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[8px] font-black text-green-600 uppercase">LIVE</span>
                      </div>
                    )}
                    <div className={`w-8 h-1.5 rounded-full mb-4 ${info?.color}`} />
                    <h4 className="text-[9px] font-black text-slate-500 line-clamp-1 mb-1 uppercase tracking-tight">{loc.name}</h4>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-black text-slate-900">{loc.currentReading.aqi}</span>
                      <span className="text-[10px] font-bold text-slate-400">AQI</span>
                    </div>
                    {isNode1 && (
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">View History →</span>
                    )}
                  </button>
                );
              })}
            </div>

            <SprinklerControl
              status={sprinklerStatus}
              history={sprinklerHistory}
              forecastPeakAQI={forecastPeakAQI}
              onTrigger={handleTriggerSprinkler}
              onSetThreshold={(val) => setSprinklerStatus(p => ({ ...p, threshold: val }))}
            />

            <AQIMap locations={locations} selectedId={selectedId} onSelectLocation={setSelectedId} clusters={{}} />
          </div>

          {/* Right Column: Node Details and Predictions */}
          <div className="lg:col-span-5 space-y-8">
            {selectedLocation ? (
              <>
                <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
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
                      <div className={`px-6 py-4 rounded-lg text-center ${getAqiInfo(selectedLocation.currentReading.category)?.color} text-white shadow-2xl`}>
                        <div className="text-4xl font-black tracking-tighter">{selectedLocation.currentReading.aqi}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1">AQI</div>
                      </div>
                    </div>

                    {selectedLocation.type === 'OFFICIAL' ? (
                      <div className="bg-slate-50 rounded-lg p-6 border border-slate-100 mb-8">
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
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">PM2.5</span>
                          <span className="text-xl font-black text-slate-800">{selectedLocation.currentReading.pm25.toFixed(2)}</span>
                        </div>
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">PM10</span>
                          <span className="text-xl font-black text-slate-800">{selectedLocation.currentReading.pm10.toFixed(2)}</span>
                        </div>
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Humidity</span>
                          <span className="text-xl font-black text-slate-800">{selectedLocation.currentReading.humidity?.toFixed(1) || '--'}%</span>
                        </div>
                        {selectedLocation.id === 'node-1' && node1LiveData && (
                          <>
                            <div className="p-5 rounded-lg bg-blue-50 border border-blue-100">
                              <span className="text-[9px] font-black text-blue-400 uppercase block mb-1">Temperature</span>
                              <span className="text-xl font-black text-blue-800">{node1LiveData.temperature.toFixed(1)}°C</span>
                            </div>
                            <div className={`p-5 rounded-lg col-span-2 border ${node1LiveData.relayStatus === 'ON'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-slate-50 border-slate-100'
                              }`}>
                              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Relay / Sprinkler</span>
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${node1LiveData.relayStatus === 'ON' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                                  }`} />
                                <span className={`text-xl font-black ${node1LiveData.relayStatus === 'ON' ? 'text-green-700' : 'text-slate-500'
                                  }`}>{node1LiveData.relayStatus}</span>
                              </div>
                            </div>
                          </>
                        )}
                        <div className="p-5 rounded-lg bg-slate-50 border border-slate-100 col-span-3">
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
                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-[8px] font-black uppercase">Hyperlocal Zone</div>
                          </div>
                        </div>
                      </div>
                    )}


                  </div>
                </div>

                <PredictionModule predictions={selectedLocation.predictions} />
              </>
            ) : (
              <div className="h-[500px] flex items-center justify-center p-12 bg-white rounded-lg border-4 border-dashed border-slate-100 text-slate-300 font-black text-center text-xl uppercase tracking-tighter">
                Click a marker on the map <br /> to reveal analytics.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Node-1 ESP32 History Modal (genuine Firebase readings only) ── */}
      {historyModal && (() => {
        const node1Loc = locations.find(l => l.id === 'node-1');
        const modalInfo = node1Loc ? getAqiInfo(node1Loc.currentReading.category) : undefined;
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setHistoryModal(false)}
          >
            <div
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Colour bar */}
              <div className={`h-2 w-full ${modalInfo?.color ?? 'bg-blue-900'}`} />

              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">Live ESP32 Readings — Node 1</span>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{node1Loc?.name ?? 'Sensor Node 1'}</h2>
                </div>
                <div className="flex items-center gap-4">
                  {node1LiveData && (
                    <div className={`px-4 py-2 rounded-lg text-white text-sm font-black ${modalInfo?.color ?? 'bg-blue-900'}`}>
                      {node1LiveData.aqi} AQI
                    </div>
                  )}
                  <button
                    onClick={() => setHistoryModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-lg transition-colors"
                    aria-label="Close"
                  >×</button>
                </div>
              </div>

              {/* Table */}
              <div className="p-8 overflow-y-auto" style={{ maxHeight: '65vh' }}>
                {node1History.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 font-black uppercase text-xs">Waiting for ESP32 data…</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-100">
                        {['Time', 'AQI', 'PM2.5', 'PM10', 'Humidity', 'Temp', 'Relay'].map(h => (
                          <th key={h} className="text-[8px] font-black text-slate-400 uppercase tracking-widest pb-3 text-left pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {node1History.map((r, i) => {
                        const { aqi, category } = calculateAQI(r.pm25);
                        const rInfo = getAqiInfo(category);
                        const ts = new Date(r.timestamp);
                        return (
                          <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="py-3 pr-3">
                              <span className="font-black text-slate-800 block">{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              <span className="text-[9px] text-slate-400">{ts.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </td>
                            <td className="py-3 pr-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-black text-white ${rInfo?.color ?? 'bg-slate-400'}`}>{r.aqi}</span>
                            </td>
                            <td className="py-3 pr-3 font-black text-slate-700">{r.pm25.toFixed(1)}</td>
                            <td className="py-3 pr-3 font-black text-slate-700">{r.pm10.toFixed(1)}</td>
                            <td className="py-3 pr-3 font-black text-slate-700">{r.humidity.toFixed(0)}%</td>
                            <td className="py-3 pr-3 font-black text-slate-700">{r.temperature.toFixed(1)}°C</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black ${r.relayStatus === 'ON' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                }`}>{r.relayStatus}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {node1History.length === 0 ? 'No readings yet' : `${node1History.length} genuine reading${node1History.length > 1 ? 's' : ''} · max 10`}
                </span>
                <button
                  onClick={() => setHistoryModal(false)}
                  className="px-5 py-2 bg-blue-900 text-white text-xs font-black rounded-lg hover:bg-blue-800 transition-colors uppercase tracking-widest"
                >Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default App;
