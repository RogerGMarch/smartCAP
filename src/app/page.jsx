"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Clock, Users, Phone, MapPin, Menu } from 'lucide-react';


const Map = dynamic(() => import('./components/Map'), {
  ssr: true,
});

const getOccupancyColor = (occupancy) => {
  if (occupancy < 50) return 'bg-green-100 text-green-800';
  if (occupancy < 75) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const HealthcareFacilityMap = () => {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      console.log('Starting fetch of facilities data.');
      try {
        const res = await fetch('/data/caps_final.csv');
        console.log('Fetch response received.');
        const buffer = await res.arrayBuffer();
        console.log('Array buffer obtained from response.');
        const decoder = new TextDecoder('utf-16');
        const csvText = decoder.decode(buffer);
        console.log('CSV text decoded successfully.');
        const lines = csvText.split('\n');
        console.log(`CSV parsed into ${lines.length} lines.`);
        const headers = lines[0].split('\t');
        console.log('CSV headers:', headers);
        const data = lines
          .slice(1)
          .map(line => {
            const values = line.split('\t');
            const item = {};
            headers.forEach((header, index) => {
              item[header.trim()] = values[index] ? values[index].trim() : '';
            });
            return item;
          })
          .filter(item => Object.keys(item).length > 0);

        console.log('Raw data parsed, mapping facilities.');
        const mappedFacilities = data.map((item) => ({
          id: item.register_id,
          name: item.name, // using the "name" field from the CSV
          waitTime: item.simulated_wait_time,
          occupancy: item.occupancy_percentage,
          address:
            [item.addresses_road_name, item.addresses_start_street_number, item.addresses_end_street_number, item.addresses_postal_code]
              .filter(Boolean)
              .join(" ") || "Address not provided",
          phone: item.values_value,
          currentPatients: item.current_occupancy,
          location: {
            lat: parseFloat(item.geo_epgs_4326_lat),
            lng: parseFloat(item.geo_epgs_4326_lon),
          },
        }));

        console.log(`Mapping complete. ${mappedFacilities.length} facilities loaded.`);
        setFacilities(mappedFacilities);
        console.log('Facilities state updated successfully.');
      } catch (error) {
        console.error('Error fetching facilities:', error);
      }
    }
    fetchData();
  }, []);



  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const filteredFacilities = facilities.filter(facility =>
    facility.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header with title, menu bar and sidebar toggle */}
      <header className="relative z-40 bg-[#7BACFC] shadow p-4 flex justify-between items-center text-white">
        <div className="flex items-center space-x-4">
          <button onClick={toggleSidebar} className="sm:hidden text-white focus:outline-none">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Healthcare Facilities</h1>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/" className="hover:text-blue-200">
                Home
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-blue-200">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-blue-200">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <div className="flex flex-1 relative">
        {/* Sliding Sidebar with facility details */}
        <div
          className={`
            fixed top-16 bottom-0 left-0 z-30 w-64 p-4 overflow-y-auto transition-transform duration-300 bg-white shadow 
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Search Input to filter facilities */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by facility name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring"
            />
          </div>
          {[...filteredFacilities]
            .sort((a, b) => parseFloat(b.occupancy) - parseFloat(a.occupancy))
            .map((facility, index) => (
              <Card
                key={`${facility.id}-${index}`}
                className="mb-4 cursor-pointer transform hover:-translate-y-1 transition-all duration-200"
                onClick={() => {
                  console.log(`Facility selected: ${facility.name} (ID: ${facility.id})`);
                  setSelectedFacility(facility);
                }}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{facility.name}</CardTitle>
                  <Badge className={getOccupancyColor(facility.occupancy)}>
                    {facility.occupancy}% Occupied
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Wait time: {facility.waitTime} mins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Current patients: {facility.currentPatients}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{facility.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{facility.phone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Map container */}
        <div className="flex-1 ml-0 sm:ml-64 bg-gray-50 p-6 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-md h-full relative">
            <Map facilities={facilities} selectedFacility={selectedFacility} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthcareFacilityMap;