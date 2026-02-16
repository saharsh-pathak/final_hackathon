
import React, { useEffect, useRef } from 'react';
import { LocationData } from '../types';
import { NAQI_BREAKPOINTS } from '../constants';

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
    }).setView([28.613, 77.210], 16);

    mapRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

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

    // Clean up old markers
    const currentLocIds = new Set(locations.map(l => l.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentLocIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Render markers
    locations.forEach((loc) => {
      const isSelected = selectedId === loc.id;
      const color = getColor(loc.currentReading.category);
      const latLng = L.latLng(Number(loc.coordinates[0]), Number(loc.coordinates[1]));

      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); transition: all 0.3s; transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; background-color: ${color}; cursor: pointer;">
          <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
            <span style="color: white; font-size: 11px; font-weight: 900; line-height: 1;">${loc.currentReading.aqi}</span>
          </div>
          <div style="position: absolute; bottom: -2px; right: -2px; background-color: #1e3a8a; padding: 3px; border-radius: 50%; border: 1.5px solid white; z-index: 10;">
             <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'aqi-marker-container',
        html: markerHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      if (markersRef.current[loc.id]) {
        markersRef.current[loc.id].setIcon(icon);
        markersRef.current[loc.id].setLatLng(latLng);
        markersRef.current[loc.id].setZIndexOffset(isSelected ? 2000 : 500);
      } else {
        const marker = L.marker(latLng, { icon, zIndexOffset: isSelected ? 2000 : 500 }).addTo(map);
        marker.on('click', () => onSelectLocation(loc.id));
        markersRef.current[loc.id] = marker;
      }
    });

  }, [locations, selectedId, onSelectLocation]);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full bg-slate-100" />
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200 shadow-lg pointer-events-none">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-blue-900 bg-blue-100" />
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">TEMP Node Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AQIMap;