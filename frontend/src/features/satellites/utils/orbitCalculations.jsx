import * as satellite from 'satellite.js';
import { SCALE }  from '../../../utils/constants.js';


export function generateOrbitCoordinates(satellitedata, numPoints = 100) {

    const satrec = satellite.twoline2satrec(satellitedata.tle_line1, satellitedata.tle_line2);

    const orbitalPeriod = satellitedata.calculated.orbital_period_minutes;
    
    // Get TLE epoch as starting time
    const epoch = new Date();
    
    const coordinates = [];
    
    // Generate points along the orbit
    for (let i = 0; i < numPoints; i++) {
        // Calculate time offset in minutes
        const minutesOffset = (i / numPoints) * orbitalPeriod;
        
        // Create date for this point
        const pointTime = new Date(epoch.getTime() + minutesOffset * 60 * 1000);
        
        // Propagate to this time
        const posVel = satellite.propagate(satrec, pointTime);
        
        if (!posVel.error && posVel.position) {
            const pos = posVel.position;
            // Y and Z swapped for THREE co-ords
            coordinates.push([pos.x*SCALE, pos.z*SCALE, pos.y*SCALE]);
        }
    }
    coordinates.push([coordinates[0][0], coordinates[0][1], coordinates[0][2]]); // Close the loop
    return coordinates;
}

export function getCurrentPosition(satelliteData) {
  const satrec = satellite.twoline2satrec(
    satelliteData.tle_line1, 
    satelliteData.tle_line2
  );
  
  const now = new Date();
  const posVel = satellite.propagate(satrec, now);
  
  if (posVel.error || !posVel.position) {
    console.error('Error propagating satellite position');
    return null;
  }
  
  const pos = posVel.position;
  return [pos.x * SCALE, pos.z * SCALE, pos.y * SCALE];
}

export function stringToColour(str) {
  let hash = 0;
  str.split('').forEach(char => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  
  let colour = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += value.toString(16).padStart(2, '0');
  }
  return colour;
}

