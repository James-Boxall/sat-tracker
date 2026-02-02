export const EARTH_RADIUS_KM = 6371;
export const SCALE = 1 / EARTH_RADIUS_KM;
export const STARTUP_SATELLITES = [25544, 48274, 49271];
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';