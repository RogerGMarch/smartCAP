import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import Papa from 'papaparse';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const getOccupancyColor = (occupancy) => {
    if (occupancy < 50) return 'bg-green-100 text-green-800';
    if (occupancy < 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/rochote/cm3tyv8c5005t01si3pw64drv',
      center: [2.190, 41.379],
      zoom: 12,
      pitch: 60,
      bearing: -17.6,
      antialias: true
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      fetch('/data/caps_updated.csv')
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const decodedCSV = new TextDecoder('utf-16').decode(buffer);
        Papa.parse(decodedCSV, {
        header: true,
        complete: (results) => {
          const features = results.data
            .filter(item =>
            item.name &&
            !isNaN(parseFloat(item.geo_epgs_4326_lat)) &&
            !isNaN(parseFloat(item.geo_epgs_4326_lon))
            )
            .map((item, index) => ({
            type: 'Feature',
            geometry: {
            type: 'Point',
            coordinates: [
            parseFloat(item.geo_epgs_4326_lon),
            parseFloat(item.geo_epgs_4326_lat)
            ]
            },
            properties: {
            name: item.name.trim(),
            index: index + 1,
            progress: Math.floor(Math.random() * 101),
            simulated_wait_time: parseFloat(item.simulated_wait_time),
            is_hospital: item.is_hospital ? item.is_hospital.trim() : '',
            occupancy: item.occupancy_percentage ? parseFloat(item.occupancy_percentage) || 0 : 0

            }
            }));

          const geojson = {
          type: 'FeatureCollection',
          features: features
          };

          map.current.addSource('facilities', {
            type: 'geojson',
            data: geojson
          });
          console.log(features);

          map.current.addLayer({
            id: 'facilities-circle',
            type: 'circle',
            source: 'facilities',
            paint: {
            'circle-radius': 10,
            'circle-color': '#7BACFC',
            'circle-stroke-color': [
            'step',
            ['to-number', ['coalesce', ['get', 'occupancy'], 0]],  // Ensure it's a number
            '#065f46',  // Green for < 50
            50,
            '#854d0e',  // Yellow for 50 - 74
            75,
            '#7f1d1d'   // Red for >= 75
            ],
            'circle-stroke-width': 1
            }
          });
         

          map.current.addLayer({
          id: 'facilities-label',
          type: 'symbol',
          source: 'facilities',
          layout: {
            'text-field': ['get', 'simulated_wait_time'],
            'text-size': 12,
            'text-offset': [0, 0],
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#ffffff'
          }
          });
          // Increase font size in facilities-label layer
          map.current.addLayer({
            id: 'facilities-label',
            type: 'symbol',
            source: 'facilities',
            layout: {
            'text-field': ['get', 'simulated_wait_time'],
            'text-size': 16, // Increased from 12 to 16
            'text-offset': [0, 0],
            'text-anchor': 'center',
            'text-justify': 'center' // Added to ensure center alignment
            },
            paint: {
            'text-color': '#ffffff'
            }
          });

          map.current.on('click', 'facilities-circle', (e) => {
          const coordinates = e.features[0].geometry.coordinates.slice();
          const { name, progress, occupancy } = e.features[0].properties;
          const impactedPopulation = Math.floor(Math.random() * 1000);

            new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
            <div style="font-family: 'Inter', sans-serif; max-width: 320px; padding: 16px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600; text-align: center;">${name}</h3>
            <div style="width: 100%; background-color: #F3F4F6; border-radius: 8px; margin-bottom: 8px;">
            <div style="width: ${progress}%; 
            background: linear-gradient(90deg, #3B82F6, #60A5FA); 
            height: 12px; 
            border-radius: 8px;
            transition: width 0.3s ease;">
            </div>
            </div>
            <p style="text-align: center; margin: 0 0 16px 0; color: #4B5563; font-size: 16px; font-weight: 500;">
            Progress: ${progress}%
            </p>
            <div style="display: flex; justify-content: center; gap: 12px;">
            <span style="background-color: ${occupancy >= 75 ? '#FEE2E2' : occupancy >= 50 ? '#FEF3C7' : '#DCFCE7'}; 
             color: ${occupancy >= 75 ? '#991B1B' : occupancy >= 50 ? '#92400E' : '#166534'}; 
             padding: 6px 12px; 
             border-radius: 20px; 
             font-size: 15px; 
             font-weight: 500;
             text-align: center;">
            Occupancy: ${occupancy}%
            </span>
            <span style="background-color: #EFF6FF; 
             color: #1E40AF; 
             padding: 6px 12px; 
             border-radius: 20px; 
             font-size: 15px; 
             font-weight: 500;
             text-align: center;">
            Impacted Population: ${impactedPopulation} 
            </span>
            </div>
            <div style="text-align: center; margin-top: 16px;">
              <a href="https://polez.shinyapps.io/smartcap/" target="_blank" style="
              display: inline-block;
              padding: 8px 16px;
              background-color: #3B82F6;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              transition: background-color 0.2s;
              ">View Real Time Data</a>
            </div>
            </div>
            `)
            .addTo(map.current);
          });

          // Add floating button
          const button = document.createElement('button');
          button.innerHTML = 'View Hospital Monitorization';
          button.className = 'shiny-app-button';
          button.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background-color: #3B82F6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
          `;
          button.onmouseover = () => button.style.backgroundColor = '#2563EB';
          button.onmouseout = () => button.style.backgroundColor = '#3B82F6';
          button.onclick = () => window.open('https://polez.shinyapps.io/smartcap/', '_blank');
          mapContainer.current.appendChild(button);
        },
        error: (error) => console.error('Error parsing CSV data:', error)
        });
      })
      .catch(error => console.error('Error fetching CSV file:', error));
    });

    return () => map.current.remove();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '600px' }} />
    </div>
  );
};

export default Map;
