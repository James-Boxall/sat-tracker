import { Canvas } from '@react-three/fiber';
import {Line, OrbitControls } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

const scale = 1/6371; // Simulation scale based on Earth's radius in km

const test_data = {
  "arg_of_pericenter": 34.3982,
  "bstar": 0.00021756,
  "calculated": {
    "apogee_km": 436.66,
    "orbital_period_minutes": 93.01,
    "perigee_km": 421.5,
    "position_km": [
      -1571.06764250032,
      6504.5816170550315,
      -1259.0211582304498
    ],
    "semi_major_axis_km": 6800.08
  },
  "classification": "U",
  "eccentricity": 0.0011149,
  "element_set_no": 999,
  "ephemeris_type": 0,
  "epoch": "2026-01-27T03:26:19.576896",
  "epoch_day": 27.14328214,
  "epoch_year": 26,
  "group": "stations",
  "inclination": 51.6321,
  "launch_number": "067",
  "launch_piece": "A",
  "launch_year": "98",
  "line_number": 2,
  "mean_anomaly": 325.7726,
  "mean_motion": 15.48216781,
  "mean_motion_ddot": 0.0,
  "mean_motion_dot": 0.00011252,
  "name": "ISS (ZARYA)",
  "norad_id": 25544,
  "ra_of_asc_node": 277.7306,
  "rev_at_epoch": 54989,
  "tle_line1": "1 25544U 98067A   26027.14328214  .00011252  00000+0  21756-3 0  9996",
  "tle_line2": "2 25544  51.6321 277.7306 0011149  34.3982 325.7726 15.48216781549897"
}

const test_data_2 = {
  "arg_of_pericenter": 12.9721,
  "bstar": 0.00033868,
  "calculated": {
    "apogee_km": 397.94,
    "orbital_period_minutes": 92.24,
    "perigee_km": 384.94,
    "position_km": [
      2515.017674806856,
      5654.147486614308,
      -2722.6039252375613
    ],
    "semi_major_axis_km": 6762.44
  },
  "classification": "U",
  "eccentricity": 0.000961,
  "element_set_no": 999,
  "ephemeris_type": 0,
  "epoch": "2026-01-27T05:29:13.184448",
  "epoch_day": 27.22862482,
  "epoch_year": 26,
  "group": "stations",
  "inclination": 41.4668,
  "launch_number": "035",
  "launch_piece": "A",
  "launch_year": "21",
  "line_number": 2,
  "mean_anomaly": 347.1363,
  "mean_motion": 15.61162625,
  "mean_motion_ddot": 0.0,
  "mean_motion_dot": 0.00029284,
  "name": "CSS (TIANHE)",
  "norad_id": 48274,
  "ra_of_asc_node": 100.1488,
  "rev_at_epoch": 27113,
  "tle_line1": "1 48274U 21035A   26027.22862482  .00029284  00000+0  33868-3 0  9992",
  "tle_line2": "2 48274  41.4668 100.1488 0009610  12.9721 347.1363 15.61162625271132"
}

const test_data_3 = {
  "arg_of_pericenter": 324.6426,
  "bstar": 0.09783900000000001,
  "calculated": {
    "apogee_km": 2245.49,
    "orbital_period_minutes": 116.41,
    "perigee_km": 807.4,
    "position_km": [
      4782.049094433369,
      4659.215427458018,
      -2653.719984441272
    ],
    "semi_major_axis_km": 7897.45
  },
  "classification": "U",
  "eccentricity": 0.0910478,
  "element_set_no": 999,
  "ephemeris_type": 0,
  "epoch": "2026-01-27T06:54:31.529088",
  "epoch_day": 27.28786492,
  "epoch_year": 26,
  "group": "stations",
  "inclination": 51.649,
  "launch_number": "037",
  "launch_piece": "PF",
  "launch_year": "11",
  "line_number": 2,
  "mean_anomaly": 29.7182,
  "mean_motion": 12.37009229,
  "mean_motion_ddot": 0.0,
  "mean_motion_dot": 0.0005386,
  "name": "FREGAT DEB",
  "norad_id": 49271,
  "ra_of_asc_node": 64.5025,
  "rev_at_epoch": 20756,
  "tle_line1": "1 49271U 11037PF  26027.28786492  .00053860  00000+0  97839-1 0  9996",
  "tle_line2": "2 49271  51.6490  64.5025 0910478 324.6426  29.7182 12.37009229207562"
}

function Orbit_path({a, b, inclination, raan, argPeri, color, lineWidth, opacity}) {
  const centre_offset = a === b ? 0 : Math.sqrt(Math.abs(a*a - b*b));
  
  const points = useMemo(() => 
    new THREE.EllipseCurve(-centre_offset, 0, a, b, 0, 2 * Math.PI, false, 0).getPoints(100), 
    [a, b, centre_offset]
  );
  
  return (
    <group rotation={[0, 0, raan]}>
      <group rotation={[inclination, 0, 0]}>
        <group rotation={[0, 0, argPeri]}>
          <Line 
            points={points} 
            color={color || 'white'}
            lineWidth={lineWidth || 2} 
            transparent
            opacity={opacity}
          />
        </group>
      </group>
    </group>
  );
}


function Satellite_render({satellite, colour}) {
  const eccentricity = satellite.eccentricity;
  const a = satellite.calculated.semi_major_axis_km * scale;
  const b = a * Math.sqrt(1 - eccentricity*eccentricity);
  const c = Math.sqrt(a*a - b*b);
  const scaled_position = satellite.calculated.position_km.map(coord => coord * scale);

  // Calculate distance from orbit
  const distanceFromCenter = Math.sqrt(
    scaled_position[0]**2 + scaled_position[1]**2 + scaled_position[2]**2
  );
  
  // For ellipse, radius varies from (a-c) to (a+c)
  const periapsis = a - c;
  const apoapsis = a + c;
  
  // How far off are we?
  const error = Math.min(
    Math.abs(distanceFromCenter - periapsis),
    Math.abs(distanceFromCenter - apoapsis)
  );
  
  const percentError = (error / a) * 100;
  
  console.log(`Satellite ${colour}:`);
  console.log(`  Error: ${error.toFixed(4)} (${percentError.toFixed(2)}%)`);

  return (
    <group>
      <mesh position={scaled_position}>
        <sphereGeometry args={[0.01, 16, 16]}/>
        <meshStandardMaterial color={colour} />
      </mesh>
      <Orbit_path 
        a={a} 
        b={b} 
        inclination={THREE.MathUtils.degToRad(satellite.inclination)}
        raan={THREE.MathUtils.degToRad(satellite.ra_of_asc_node)}
        argPeri={THREE.MathUtils.degToRad(satellite.arg_of_pericenter)}
        color={colour}
        opacity={0.5}
      />
      <Line points={[[0, 0, 0], scaled_position]} color="magenta" lineWidth={3}/>
    </group>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1b1e2b' }}>
      <Canvas>
        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        
        <mesh>
          <sphereGeometry args={[1, 16, 16]}/>
          <meshStandardMaterial color="orange" />
        </mesh>
        <axesHelper args={[5]} />
        <Satellite_render satellite={test_data} colour={'green'} />
        <Satellite_render satellite={test_data_2} colour={'red'} />
        <Satellite_render satellite={test_data_3} colour={'blue'} />
      </Canvas>
    </div>
  );
}

export default App;
