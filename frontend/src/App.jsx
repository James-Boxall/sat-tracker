import { Canvas } from '@react-three/fiber';
import {Line, OrbitControls } from '@react-three/drei';
import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
const scale = 1/6371; // Simulation scale based on Earth's radius in km

const test_data = {
  "arg_of_pericenter": 36.3768,
  "bstar": 0.00021554,
  "calculated": {
    "apogee_km": 436.63,
    "orbital_period_minutes": 93.01,
    "perigee_km": 421.46,
    "position_km": [
      -2318.0924252856476,
      5668.544233388949,
      -2980.31397352432
    ],
    "semi_major_axis_km": 6800.05
  },
  "classification": "U",
  "eccentricity": 0.0011156,
  "element_set_no": 999,
  "ephemeris_type": 0,
  "epoch": "2026-01-27T15:49:54.883200",
  "epoch_day": 27.659663,
  "epoch_year": 26,
  "group": "stations",
  "inclination": 51.6319,
  "launch_number": "067",
  "launch_piece": "A",
  "launch_year": "98",
  "line_number": 2,
  "mean_anomaly": 323.7976,
  "mean_motion": 15.48229162,
  "mean_motion_ddot": 0.0,
  "mean_motion_dot": 0.00011148,
  "name": "ISS (ZARYA)",
  "norad_id": 25544,
  "ra_of_asc_node": 275.1786,
  "rev_at_epoch": 54997,
  "tle_line1": "1 25544U 98067A   26027.65966300  .00011148  00000+0  21554-3 0  9996",
  "tle_line2": "2 25544  51.6319 275.1786 0011156  36.3768 323.7976 15.48229162549971"
}

const line_data = [[  747.40532078,  6705.27193918,   884.55605564],
       [  309.5257385 ,  6790.70260114,   330.31569538],
       [ -131.74075819,  6801.83146954,  -227.5496887 ],
       [ -571.56673491,  6738.57335877,  -782.91997637],
       [-1005.14554311,  6601.65965785, -1329.7088041 ],
       [-1427.74436284,  6392.62834074, -1861.93089678],
       [-1834.75610788,  6113.80485775, -2373.76787152],
       [-2221.74956674,  5768.27427573, -2859.63171952],
       [-2584.51720314,  5359.84515849, -3314.22523615],
       [-2919.12010098,  4893.00578131, -3732.59874777],
       [-3221.92960749,  4372.87335138, -4110.20257119],
       [-3489.66529938,  3805.13695878, -4442.93473248],
       [-3719.42896733,  3195.99501091, -4727.18356211],
       [-3908.73437924,  2552.08790928, -4959.86486642],
       [-4055.53264044,  1880.42671694, -5138.45344988],
       [-4158.23301632,  1188.31854125, -5261.00882321],
       [-4215.71912019,   483.28932745, -5326.19498043],
       [-4227.36039556,  -226.99527061, -5333.29416172],
       [-4193.01883981,  -934.81029988, -5282.21454195],
       [-4113.05092753, -1632.45256866, -5173.4917986 ],
       [-3988.30469985, -2312.32172907, -5008.28452315],
       [-3820.11199413, -2967.00073896, -4788.36345056],
       [-3610.27580098, -3589.3350331 , -4516.09449709],
       [-3361.05275494, -4172.50969578, -4194.41562275],
       [-3075.13079489, -4710.12388341, -3826.80757304],
       [-2755.60207213, -5196.26170181, -3417.25860913],
       [-2405.93123782, -5625.55870598, -2970.22340565],
       [-2029.91930802, -5993.26316623, -2490.57638049],
       [-1631.66338016, -6295.29124146, -1983.55981833],
       [-1215.51255808, -6528.27522132, -1454.72725477],
       [ -786.02052774, -6689.60404942,  -909.88269624],
       [ -347.8953097 , -6777.45542047,  -355.01635503],
       [   94.05320967, -6790.81885381,   203.76232582],
       [  534.96730172, -6729.50928295,   760.29350395],
       [  969.99625887, -6594.17085858,  1308.43671273],
       [ 1394.3513542 , -6386.27083517,  1842.14063268],
       [ 1803.36014572, -6108.08359116,  2355.51190475],
       [ 2192.51938776, -5762.66500984,  2842.88204983],
       [ 2557.54584587, -5353.81761622,  3298.87160427],
       [ 2894.42436436, -4886.04701459,  3718.45064856],
       [ 3199.45260116, -4364.5102991 ,  4096.9949917 ],
       [ 3469.28192169, -3794.95720864,  4430.33737175],
       [ 3700.95402335, -3183.66486913,  4714.81313678],
       [ 3891.93294428, -2537.36700906,  4947.29997481],
       [ 4040.13218641, -1863.17855333,  5125.2513603 ],
       [ 4143.93675309, -1168.51649852,  5246.72347458],
       [ 4202.21996235,  -461.01795795,  5310.39543537],
       [ 4214.35494753,   251.54375857,  5315.58273554],
       [ 4180.2207991 ,   961.34418971,  5262.24384447],
       [ 4100.20333576,  1660.59307281,  5150.97996868],
       [ 3975.19052284,  2341.61919403,  4983.02800615],
       [ 3806.56258445,  2996.95393876,  4760.24676456],
       [ 3596.17688591,  3619.41274042,  4485.09655198],
       [ 3346.34769775,  4202.17361829,  4160.61229317],
       [ 3059.82099439,  4738.85198617,  3790.37037814],
       [ 2739.74448966,  5223.57090919,  3378.44951346],
       [ 2389.63316904,  5651.02599076,  2929.38592031],
       [ 2013.330642  ,  6016.54409189,  2448.12330522],
       [ 1614.96670603,  6316.1351245 ,  1939.95811548],
       [ 1198.91158263,  6546.53622206,  1410.48067843]]

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




function generateOrbitCoordinates(satellitedata, numPoints = 100) {

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
            coordinates.push([pos.x*scale, pos.y*scale, pos.z*scale]);
        }
    }
    coordinates.push([coordinates[0][0], coordinates[0][1], coordinates[0][2]]); // Close the loop
    return coordinates;
}

function getCurrentPosition(satellitedata) {
    // Parse TLE
    const satrec = satellite.twoline2satrec(satellitedata.tle_line1, satellitedata.tle_line2);
    
    // Get current time
    const now = new Date();
    
    // Propagate to current time
    const posVel = satellite.propagate(satrec, now);
    
    // Check for errors
    if (posVel.error || !posVel.position) {
        console.error('Error propagating satellite position');
        return null;
    }
    
    const pos = posVel.position;
    return [pos.x*scale, pos.y*scale, pos.z*scale];
}


function Orbit_path_new({satellitedata, color, lineWidth, opacity}) {
  const points = useMemo(() => generateOrbitCoordinates(satellitedata), [satellitedata]);
  
  return (
    <Line 
      points={points} 
      color={color || 'white'}
      lineWidth={lineWidth || 2} 
      transparent
      opacity={opacity}
    />
  );
}



function Satellite_render_test({satellite: satelliteData, colour}) {
  const [position, setPosition] = useState(() => getCurrentPosition(satelliteData));
  

  const satrec = useMemo(() => 
    satellite.twoline2satrec(satelliteData.tle_line1, satelliteData.tle_line2),
    [satelliteData.tle_line1, satelliteData.tle_line2]
  );
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const posVel = satellite.propagate(satrec, now); // Using the library
      
      if (!posVel.error && posVel.position) {
        const pos = posVel.position;
        setPosition([pos.x*scale, pos.y*scale, pos.z*scale]);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [satrec]);
  
  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[0.01, 16, 16]}/>
        <meshStandardMaterial color={colour} />
      </mesh>
      <Orbit_path_new satellitedata={satelliteData} color={colour} opacity={1}/>
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
        <Satellite_render_test satellite={test_data} colour={'cyan'} />
        <Satellite_render_test satellite={test_data_2} colour={'lime'} />
        <Satellite_render_test satellite={test_data_3} colour={'magenta'} />

      </Canvas>
    </div>
  );
}

export default App;
