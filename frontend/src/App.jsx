import { Canvas, useLoader} from '@react-three/fiber';
import {Line, OrbitControls, Html,  } from '@react-three/drei';
import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import "./App.css"


const scale = 1/6371; // Simulation scale based on Earth's radius in km


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


function Satellite_render_test({satellite: satelliteData, colour, position}) {
  // Remove the interval and position state from here
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
 
  const hoverTimeoutRef = useRef(null);

  
  // Function to generate a color from a string
  const stringToColour = (str) => {
    let hash = 0;
    str.split('').forEach(char => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash)
    })
    let colour = '#'
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff
      colour += value.toString(16).padStart(2, '0')
    }
    return colour
  }
  
  // Determine colour between given and random
  const UsedColour = colour || stringToColour(satelliteData.norad_id.toString());
  
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
      <mesh position={position}>  {/* Use passed position */}
        <sphereGeometry args={[0.01, 10, 10]}/>
        <meshStandardMaterial color={UsedColour} />
        
        {(hovered || active) && (
          <Html center pointerEvents='none'>
            <div className="satellite-info">
              Name: {satelliteData.name} <br />
              norad_id: {satelliteData.norad_id} <br />
            </div>
          </Html>
        )}
        <mesh>
          <sphereGeometry args={[0.05, 10, 10]}/>
          <meshBasicMaterial transparent opacity={0.1} wireframe={false} />
        </mesh>
      </mesh>
      <Orbit_path_new satellitedata={satelliteData} color={UsedColour} opacity={1}/>
    </group>
  );
}

function Batch_render_satellites({ satellites, positions }) { 
  if (satellites.length === 0) {
    return null;
  }
  
  return (
    <>
      {satellites.map((data, index) => (
        <Satellite_render_test 
          key={data.norad_id} 
          satellite={data} 
          colour={null} 
          position={positions[index] || [0, 0, 0]}
        />
      ))}
    </>
  )
}

function App() {
  const [items, setItems] = useState([])
  const [input, setInput] = useState('')
  const [satellites, setSatellites] = useState([])
  const [positions, setPositions] = useState([])

  const addOnStartup = [25544, 48274, 49271]; // NORAD IDs to add on startup

   useEffect(() => {
    const loadInitialSatellites = async () => { // ISS and others
      
      const satelliteData = await Promise.all(
        addOnStartup.map(id => fetchSatellite(id))
      );
      
      setSatellites(satelliteData);
      setItems(addOnStartup);
      
      const initialPositions = satelliteData.map(sat => getCurrentPosition(sat));
      setPositions(initialPositions);
    };
    
    loadInitialSatellites();
  }, []);
  


  // Memoize satrec objects
  const satrecs = useMemo(() => {
    return satellites.map(sat => 
      satellite.twoline2satrec(sat.tle_line1, sat.tle_line2)
    );
  }, [satellites]);

  // Single interval for all satellites
  useEffect(() => {
    if (satellites.length === 0) return;

    const interval = setInterval(() => {
      console.log('Updating positions for all satellites');
      const now = new Date();
      const newPositions = satrecs.map(satrec => {
        const posVel = satellite.propagate(satrec, now);
        
        if (!posVel.error && posVel.position) {
          const pos = posVel.position;
          return [pos.x * scale, pos.y * scale, pos.z * scale];
        }
        return [0, 0, 0];
      });
      
      setPositions(newPositions);
    }, 1000);

    return () => clearInterval(interval);
  }, [satrecs]);

  const handleAdd = async () => { 
    if (input) {
      setItems(prev => [...prev, input])
      setInput('')
      const satelliteData = await fetchSatellite(input)  
      
      if (satelliteData) {
        setSatellites(prev => [...prev, satelliteData])
        // Calculate initial position
        const initialPos = getCurrentPosition(satelliteData)
        setPositions(prev => [...prev, initialPos])
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
    setSatellites([]);
    setPositions([]);
  }

  function RemoveButton ({index}) {
    function handleRemove() {
      setItems(prev => prev.filter((_, i) => i !== index));
      setSatellites(prev => prev.filter((_, i) => i !== index));
      setPositions(prev => prev.filter((_, i) => i !== index));
    }
    return (
      <button className = 'remove-button' onClick={handleRemove}>Remove</button>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1b1e2b' }}>
      <Canvas>
        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        
        <The_Earth data={[1, 16, 16]} />
        <axesHelper args={[5]} />
        <Batch_render_satellites satellites={satellites} positions={positions} />
      </Canvas>

      <div className='add-content-container' style={{ position: 'absolute', top: 20, left: 20 }}>
        <ul className='satellite-list'> 
          <li className="top-row">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="NORAD ID"
              className='input'
            />
            <button className='button' onClick={handleAdd}>Add</button>
            <button className='button' onClick={handleReset}>Reset</button>
          </li>
          
          {satellites.map((satellite_data, index) => (
            <li className='list-item' key={satellite_data.norad_id}>
              <span className='list-content'>
                {satellite_data.name} (NORAD ID: {satellite_data.norad_id})
              </span>
              <RemoveButton className='remove-button' index={index} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;