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
  const stats = await fetch(`${API_BASE_URL}/api/stats`);
  return (stats.json());
}

// Fetch Random satellite data
export const fetchRandom = async (n_random) => {
  const response = await fetch(`${API_BASE_URL}/api/random_satellites/${n_random}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch random satellites: ${response.status}`);
  }
  return(response.json());
}

// Fetch a group of satellites
export const fetchGroup = async (groupName) => {
  const response = await fetch(`${API_BASE_URL}/api/satellites/${groupName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch group: ${response.status}`);
  }
  return(response.json());}
