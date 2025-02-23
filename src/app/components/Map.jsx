import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import Papa from 'papaparse';
import 'mapbox-gl/dist/mapbox-gl.css';

const NEXT_PUBLIC_MAPBOX_TOKEN = "pk.eyJ1Ijoicm9jaG90ZSIsImEiOiJjbHRrYmY0Z3EwcTV4Mmlxd2o0OW90Ymo4In0.QSmkyWVFeeRbn8Np6Om-UA";
mapboxgl.accessToken = NEXT_PUBLIC_MAPBOX_TOKEN;

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  // We'll store the isochrone GeoJSON data once fetched.
  let isoData = null;

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

    // Fetch the isochrone GeoJSON data
    fetch('./data/isochrones.geojson')
      .then(res => res.arrayBuffer())
      .then(buffer => {
      const decodedData = new TextDecoder('utf-16').decode(buffer);
      isoData = JSON.parse(decodedData);
      })
      .catch(error => console.error('Error fetching isochrone GeoJSON:', error));

    map.current.on('load', () => {
      // Fetch and parse the CSV file
      fetch('./data/caps_final.csv')
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
                    register_id: item.register_id, // Make sure register_id is available
                    index: index + 1,
                    progress: Math.floor(Math.random() * 101),
                    simulated_wait_time: parseFloat(item.simulated_wait_time),
                    is_hospital: item.is_hospital ? item.is_hospital.trim() : '',
                    occupancy: item.occupancy_percentage ? parseFloat(item.occupancy_percentage) || 0 : 0,
                    current_occupacy: item.current_occupancy ? parseFloat(item.current_occupancy) || 0 : 0,
                  }
                }));

              const geojson = {
                type: 'FeatureCollection',
                features: features
              };

              // Add facilities source and layers
              map.current.addSource('facilities', {
                type: 'geojson',
                data: geojson
              });

              map.current.addLayer({
                id: 'facilities-circle',
                type: 'circle',
                source: 'facilities',
                paint: {
                  'circle-radius': 16,
                  'circle-color': '#7BACFC',
                  'circle-stroke-color': [
                    'step',
                    ['to-number', ['coalesce', ['get', 'occupancy'], 0]],
                    '#065f46',
                    50,
                    '#854d0e',
                    75,
                    '#7f1d1d'
                  ],
                  'circle-stroke-width': 4
                }
              });

              // Label layer (you can remove duplicate declarations if present)
                map.current.addLayer({
                id: 'facilities-label',
                type: 'symbol',
                source: 'facilities',
                layout: {
                  'text-field': [
                  'format',
                  ['get', 'simulated_wait_time'],
                  { 'font-scale': 1.0 },
                  '\nmin',
                  { 'font-scale': 0.6 }
                  ],
                  'text-size': 16,
                  'text-offset': [0, 0],
                  'text-anchor': 'center',
                  'text-justify': 'center'
                },
                paint: {
                  'text-color': '#ffffff'
                }
                });

              // Facility click event to display corresponding isochrone
              map.current.on('click', 'facilities-circle', (e) => {
                const facilityProperties = e.features[0].properties;
                const facilityRegisterId = facilityProperties.name;
                const coordinates = e.features[0].geometry.coordinates.slice();

                // Lookup the matching isochrone feature using register_id
                if (isoData && isoData.features) {
                  const isoFeature = isoData.features.find(f => f.properties.name === facilityRegisterId);
                  if (isoFeature) {
                    const isoGeoJSON = {
                      type: 'FeatureCollection',
                      features: [isoFeature]
                    };
                    // If the isochrone source already exists, update its data.
                    if (map.current.getSource('isochrone')) {
                      map.current.getSource('isochrone').setData(isoGeoJSON);
                    } else {
                      map.current.addSource('isochrone', {
                      type: 'geojson',
                      data: isoGeoJSON
                      });
                        map.current.addLayer({
                        id: 'isochrone-fill',
                        type: 'fill',
                        source: 'isochrone',
                        paint: {
                        'fill-color': [
                          'case',
                          ['==', ['get', 'name'], "Vall d'Hebron Barcelona Hospital Campus"],
                          '#ef4444',
                          '#22c55e'
                        ],
                        'fill-opacity': 0.35,
                        'fill-outline-color': [
                          'case',
                          ['==', ['get', 'name'], "Vall d'Hebron Barcelona Hospital Campus"],
                          '#dc2626',
                          '#15803d'
                        ]
                        }
                        });
                    }
                  } else {
                    console.warn('No matching isochrone found for register_id:', facilityRegisterId);
                    // Optionally remove the isochrone layer if no match is found.
                    if (map.current.getLayer('isochrone-fill')) {
                      map.current.removeLayer('isochrone-fill');
                      map.current.removeSource('isochrone');
                    }
                  }
                }

                // Original popup for facility information
                const { name, progress, occupancy, current_occupacy } = facilityProperties;
                const impactedPopulation = Math.floor(Math.random() * 1000);

                new mapboxgl.Popup()
                  .setLngLat(coordinates)
                  .setHTML(`
                    <div style="font-family: 'Inter', sans-serif; max-width: 320px; padding: 16px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                      <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600; text-align: center;">${name}</h3>
                      <div style="width: 100%; background-color: #F3F4F6; border-radius: 8px; margin-bottom: 8px;">
                        <div style="width: ${occupancy}%; background: ${occupancy >= 75 ? 'linear-gradient(90deg, #991B1B, #DC2626)' : 
                          occupancy >= 50 ? 'linear-gradient(90deg, #92400E, #F59E0B)' : 
                          'linear-gradient(90deg, #166534, #22C55E)'}; height: 12px; border-radius: 8px; transition: width 0.3s ease;">
                        </div>
                      </div>
                      <p style="text-align: center; margin: 0 0 16px 0; color: #4B5563; font-size: 16px; font-weight: 500;">
                        Saturation: ${occupancy}%
                      </p>
                      <div style="display: flex; justify-content: center; gap: 12px;">
                        <span style="background-color: ${occupancy >= 75 ? '#FEE2E2' : occupancy >= 50 ? '#FEF3C7' : '#DCFCE7'}; color: ${occupancy >= 75 ? '#991B1B' : occupancy >= 50 ? '#92400E' : '#166534'}; padding: 6px 12px; border-radius: 20px; font-size: 15px; font-weight: 500; text-align: center;">
                          Professionals Working: ${current_occupacy}
                        </span>
                        <span style="background-color: #EFF6FF; color: #1E40AF; padding: 6px 12px; border-radius: 20px; font-size: 15px; font-weight: 500; text-align: center;">
                          Impacted Population: ${impactedPopulation} 
                        </span>
                      </div>
                      <div style="text-align: center; margin-top: 16px;">
                        <a href="https://polez.shinyapps.io/smartcap/" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background-color 0.2s;">
                          View Real Time Data
                        </a>
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