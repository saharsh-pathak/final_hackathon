
import React, { useEffect, useRef, useState } from 'react';
import { LocationData } from '../types';
import { NAQI_BREAKPOINTS, OFFICIAL_STATION_DATA, MAP_CENTER, COLONY_POLYGON } from '../constants';

interface AQIMapProps {
  locations: LocationData[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  clusters?: any;
}

const AQIMap: React.FC<AQIMapProps> = ({ locations, selectedId, onSelectLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const layerRef = useRef<{ [key: string]: any }>({});
  const [mapReady, setMapReady] = useState(false);
  const [layers, setLayers] = useState({
    official: true,
    nodes: true,
    flow: true,
    boundary: true
  });

  const getColor = (category: string) => {
    const bp = NAQI_BREAKPOINTS.find(b => b.category === category);
    const color = bp ? bp.color.replace('bg-', '') : 'gray';
    switch (color) {
      case 'red-900': return '#7f1d1d';
      case 'red-500': return '#ef4444';
      case 'orange-500': return '#f97316';
      case 'yellow-400': return '#facc15';
      case 'green-400': return '#4ade80';
      case 'green-500': return '#22c55e';
      default: return '#64748b';
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: true
    }).setView(MAP_CENTER, 14);

    mapRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Initial Boundary Layer
    const boundary = L.polygon(COLONY_POLYGON, {
      color: '#1e3a8a',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 1,
      dashArray: '5, 10'
    }).addTo(map);
    layerRef.current['boundary'] = boundary;

    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const map = mapRef.current;

    // Layer Visibility Logic
    if (layerRef.current['boundary']) {
      if (layers.boundary) map.addLayer(layerRef.current['boundary']);
      else map.removeLayer(layerRef.current['boundary']);
    }

    // Clean up old markers
    const currentLocIds = new Set(locations.map(l => l.id));
    currentLocIds.add(OFFICIAL_STATION_DATA.id);

    Object.keys(markersRef.current).forEach(id => {
      if (!currentLocIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Cleanup Flow Lines
    Object.keys(markersRef.current).forEach(id => {
      if (id.startsWith('flow-')) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // 1. Render Official Station
    if (layers.official) {
      const loc = OFFICIAL_STATION_DATA;
      const latLng = L.latLng(loc.coordinates[0], loc.coordinates[1]);
      // ... (marker rendering logic same as before)
      // I will simplify the replacement to ensure it works correctly
      if (!markersRef.current[loc.id]) {
        const markerHtml = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 16px; border: 4px solid #1e3a8a; box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.2); background-color: white; cursor: pointer;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"/><path d="M5 21V7"/><path d="M19 21V7"/></svg>
                 <span style="font-size: 8px; font-weight: 900; color: #1e3a8a; margin-top: 2px;">CPCB</span>
              </div>
              <div style="position: absolute; -top: 10px; -right: 10px; background-color: #1e3a8a; color: white; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 10px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translate(50%, -50%);">
                REF
              </div>
            </div>
          `;
        const icon = L.divIcon({ className: 'official-marker', html: markerHtml, iconSize: [56, 56], iconAnchor: [28, 28] });
        const marker = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(`<div style="padding: 10px; font-family: 'Inter', sans-serif;"><h3 style="font-weight: 900; color: #1e3a8a; text-transform: uppercase; font-size: 12px; margin-bottom: 4px;">${loc.officialData?.name}</h3><p style="font-size: 10px; color: #64748b; font-weight: 700; margin-bottom: 8px;">${loc.officialData?.type}</p></div>`);
        markersRef.current[loc.id] = marker;

        const circle = L.circle(latLng, { radius: loc.officialData?.coverageRadius * 1000, color: '#1e3a8a', weight: 1, opacity: 0.2, fillOpacity: 0.05, dashArray: '10, 10' }).addTo(map);
        layerRef.current['official-radius'] = circle;
      }
    } else {
      if (markersRef.current[OFFICIAL_STATION_DATA.id]) {
        markersRef.current[OFFICIAL_STATION_DATA.id].remove();
        delete markersRef.current[OFFICIAL_STATION_DATA.id];
      }
      if (layerRef.current['official-radius']) {
        layerRef.current['official-radius'].remove();
        delete layerRef.current['official-radius'];
      }
    }

    // 2. Render TEMP Nodes
    if (layers.nodes) {
      locations.filter(l => l.type === 'TEMP_NODE').forEach((loc) => {
        // ... (Same marker logic)
        if (!markersRef.current[loc.id]) {
          const color = getColor(loc.currentReading.category);
          const latLng = L.latLng(Number(loc.coordinates[0]), Number(loc.coordinates[1]));
          const markerHtml = `<div style="width: 44px; height: 44px; border-radius: 50%; border: 4px solid white; background-color: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 12px;">${loc.currentReading.aqi}</div>`;
          const icon = L.divIcon({ className: 'temp-marker', html: markerHtml, iconSize: [44, 44], iconAnchor: [22, 22] });
          const marker = L.marker(latLng, { icon, zIndexOffset: 500 }).addTo(map).on('click', () => onSelectLocation(loc.id));
          markersRef.current[loc.id] = marker;
        }

        if (layers.flow && !markersRef.current['flow-' + loc.id]) {
          const officialLatLng = L.latLng(OFFICIAL_STATION_DATA.coordinates[0], OFFICIAL_STATION_DATA.coordinates[1]);
          const polyline = L.polyline([L.latLng(loc.coordinates[0], loc.coordinates[1]), officialLatLng], {
            color: '#1e3a8a', weight: 1, opacity: 0.15, dashArray: '4, 8', className: 'data-flow-line'
          }).addTo(map);
          markersRef.current['flow-' + loc.id] = polyline;
        } else if (!layers.flow && markersRef.current['flow-' + loc.id]) {
          markersRef.current['flow-' + loc.id].remove();
          delete markersRef.current['flow-' + loc.id];
        }
      });
    } else {
      locations.forEach(loc => {
        if (markersRef.current[loc.id]) {
          markersRef.current[loc.id].remove();
          delete markersRef.current[loc.id];
        }
        if (markersRef.current['flow-' + loc.id]) {
          markersRef.current['flow-' + loc.id].remove();
          delete markersRef.current['flow-' + loc.id];
        }
      });
    }

  }, [locations, selectedId, layers, onSelectLocation, mapReady]);

  return (
    <div className="relative w-full h-[550px] rounded-lg overflow-hidden shadow-2xl border-4 border-white">
      <div ref={mapContainerRef} className="w-full h-full bg-slate-50" />

      {/* Legend & UI Overlays */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-lg shadow-xl border border-slate-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-900 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18" /><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3" /><path d="M5 21V7" /><path d="M19 21V7" /></svg>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Official Station</h4>
                <p className="text-[8px] font-bold text-slate-400">1 per 10 km² Area</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">TEMP AQI Nodes</h4>
                <p className="text-[8px] font-bold text-slate-400">4 per 1 km² Hyperlocal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setLayers(l => ({ ...l, official: !l.official }))} className={`px-3 py-2 rounded text-[8px] font-black uppercase tracking-widest transition-all ${layers.official ? 'bg-blue-900 text-white shadow-lg' : 'bg-white/80 text-slate-400'}`}>Official</button>
          <button onClick={() => setLayers(l => ({ ...l, nodes: !l.nodes }))} className={`px-3 py-2 rounded text-[8px] font-black uppercase tracking-widest transition-all ${layers.nodes ? 'bg-blue-900 text-white shadow-lg' : 'bg-white/80 text-slate-400'}`}>Hyperlocal</button>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-slate-200">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Coverage: <span className="text-blue-900">Mayur Vihar Colony Zone 1</span></span>
      </div>
    </div>
  );
};

export default AQIMap;