import { Canvas, useLoader} from '@react-three/fiber';
import {Line, OrbitControls, Html,  } from '@react-three/drei';
import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import "./App.css"
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

function The_Earth(data) {
  const texture = useLoader(THREE.TextureLoader, '/Whole_world_-_land_and_oceans_12000.jpg');
  const [hovered, setHovered] = useState(false);

  const getEarthRotation = () =>  {
    const now = new Date();
    const gmst = satellite.gstime(now);
    return gmst;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const rotation = getEarthRotation();
      setEarthRotation(rotation);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const [earthRotation, setEarthRotation] = useState(getEarthRotation());



  return (
    <mesh
    onPointerOver={(e) => {
        e.stopPropagation();  // Prevent triggering parent elements
        setHovered(true);
        document.body.style.cursor = 'pointer'; 
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    rotation = {[3.14159/2,earthRotation,0]}
    >
        <sphereGeometry args={[1,16,16]}/>
        <meshStandardMaterial map = {texture}/>
    </mesh>)};




function Satellite_render_test({satellite: satelliteData, colour}) {
  const [position, setPosition] = useState(() => getCurrentPosition(satelliteData));
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false)
  const hoverTimeoutRef = useRef(null);
  

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

  useEffect(() => {
  return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <group
      onClick={() => setActive(!active)}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        setHovered(true);
        document.body.style.cursor = 'pointer'; 
      }}
      onPointerOut={() => {
        hoverTimeoutRef.current = setTimeout(() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }, 400);
      }}
      
      >
      <mesh position={position}>
        <sphereGeometry args={[0.01, 10, 10]}/>
        <meshStandardMaterial color={colour} />
        
        {(hovered || active) && (
        <Html 
        center
        pointerEvents='none'
        >
        <div className="content">
          name: {satelliteData.name} <br />
          norad_id: {satelliteData.norad_id} <br />
        </div>
        </Html>
        )}
        <mesh>
          <sphereGeometry args={[0.05, 10, 10]}/> {/* 5x larger hitbox*/}
          <meshBasicMaterial transparent opacity={0.1} wireframe = {false} />
        </mesh>
      </mesh>
      <Orbit_path_new satellitedata={satelliteData} color={colour} opacity={1}/>
    </group>
  );
}

function Batch_render_satellites({ satellite_data_array }) { 
  console.log(satellite_data_array);
  const dataToRender = Array.isArray(satellite_data_array) ? satellite_data_array : [];
  
  if (dataToRender.length === 0) {
    return null;
  }
  console.log('Rendering batch of satellites:', dataToRender);
  return (
    <>
      {dataToRender.map((data, index) => {
        console.log(`Rendering satellite ${index}:`, data)
        return (
          <Satellite_render_test 
            key={index} 
            satellite={data} 
            colour={'orange'} 
          />
        )
      })}
    </>
  )
}

const fetchSatellite = async (norad_id) => {
  const response = await fetch(
    `http://localhost:8000//api/satellite/${norad_id}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch satellite: ${response.status}`);
  }
  
  const data = await response.json();
  return data; // Return the parsed JSON data
};



function App() {
  const [items, setItems] = useState([])
  const [input, setInput] = useState('')
  const [satellites, setSatellites] = useState([])

  


  const handleAdd = async () => { 
    if (input) {
      setItems([...items, input])
      setInput('')
      const satelliteData = await fetchSatellite(input)  
      console.log(satelliteData)
      if (satelliteData) {
        setSatellites([...satellites, satelliteData])
      }
    }
  }
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  }

  const handleReset = () => {
    setItems([]);
  }
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1b1e2b' }}>
      <Canvas>
        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        
        <The_Earth data={[1, 16, 16]} />
        <axesHelper args={[5]} />
        <Satellite_render_test satellite={test_data_2} colour={'lime'} />
        <Satellite_render_test satellite={test_data_3} colour={'magenta'} />
        <Batch_render_satellites satellite_data_array ={satellites} />
        

      </Canvas>


      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder= "NORAD ID"
        />
        <button onClick={handleAdd}>Add</button>
        <button onClick={handleReset}>Reset</button>
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
    
  );
}

export default App;
