import { API_BASE_URL }  from '../../../utils/constants.js';



// Fetch satellite data by NORAD I
export const fetchSatellite = async (norad_id) => {
  const response = await fetch(
    `${API_BASE_URL}/api/satellite/${norad_id}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch satellite: ${response.status}`);
  }
  
  const data = await response.json();
  return data; // Return the parsed JSON data
};

// Fetch satellite data
  export const fetchStats  = async () => {
    const stats = await fetch('http://localhost:8000/api/stats');
    const data = await stats.json();
    return (data);
  }

