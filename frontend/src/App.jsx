import { Canvas, useLoader} from '@react-three/fiber';
import {Line, OrbitControls, Html, Billboard  } from '@react-three/drei';
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
  const [infoVisible, setInfoVisible] = useState(false);
 
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

const Satellite_Icon = ({ position, group }) => {
  const [texture, setTexture] = useState(null);
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const primaryPath = `/icons/satellite_${group}_icon.png`;
    
    loader.load(
      primaryPath,
      setTexture,
      undefined,
      () => {
        // On error, load fallback
        loader.load('/icons/satellite_default_icon.png', setTexture);
      }
    );
  }, [group]);
  
  if (!texture) {
    
    console.log('No texture loaded for group');
    return null;}
  
  return (
    <Billboard position={position}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </Billboard>
  );
}



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
        <Satellite_Icon position={[0,0,0]} group={satelliteData.group} />
        
        {(hovered || active) && (
          <Html center pointerEvents='none'>
            <div className="satellite-info-box">
              <ul className= 'satellite-info-list'>
                <li className= 'info-list-item'>Name: {satelliteData.name}</li>
                <li className= 'info-list-item'>NORAD id: {satelliteData.norad_id}</li>
                {infoVisible && (<>
                  <li className= 'info-list-item'>Launch Year: {satelliteData.launch_year}</li>
                  <li className= 'info-list-item'>Group: {satelliteData.group}</li>
                  <li className= 'info-list-item'>Orbital Period (minutes): {satelliteData.calculated.orbital_period_minutes}</li>
                  <li className= 'info-list-item'>Perigee (km): {satelliteData.calculated.perigee_km}</li>
                  <li className= 'info-list-item'>Apogee (km): {satelliteData.calculated.apogee_km}</li>
                  <li className= 'info-list-item'>Inclination (degrees): {satelliteData.inclination}</li>
                </>)}
                
              </ul>
              <button className = 'button' onClick= {() => setInfoVisible(!infoVisible)} > {infoVisible? 'hide info' : 'show info'} </button>
            </div>
          </Html>
        )}
        <sphereGeometry args={[0.1, 10, 10]}/>
        <meshStandardMaterial color={'white'} transparent opacity={0.1} />
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

function Group_list_item({ group, index,LoadedGroups, groupUpdate, groupLoader, groupRemover }) {

  const handleLoad = () => {
    

    if (!LoadedGroups.includes(group)) {
      groupUpdate((prev) => [...prev, group]);
      groupLoader(group);
    } else {
      groupRemover(group);
    }
  };

  return (
    <li className="list-item" key={index}>
      <span className="list-content">{group}</span>
      <button className="button" onClick={handleLoad}>
        {LoadedGroups.includes(group) ? "Remove" : "Load"}
      </button>
    </li>
  );
}

function App() {
  const [items, setItems] = useState([])
  const [input, setInput] = useState('')
  const [stats, setStats] = useState({})
  const [randomInput, setRandomInput] = useState('')
  const [satellites, setSatellites] = useState([])
  const [positions, setPositions] = useState([])
  const [LoadedGroups, setLoadedGroups] = useState([])
  const [showGroup, setshowGroup] = useState(false)

  const addOnStartup = [25544, 48274, 49271]; // NORAD IDs to add on startup

  // Placeholder groups - replace with actual API call when available
  

  const fetchStats  = async () => {
    const stats = await fetch('http://localhost:8000/api/stats');
    const data = await stats.json();
    return (data);
  }

  const TestFunction = async () => {
    const stats = await fetch(`http://localhost:8000/api/satellites/weather`);
    const data = await stats.json();
    console.log(data);
  }

  


  // Load initial satellites and data on startup
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
     const loadStats = async () => {
    const data = await fetchStats();  // await the Promise
    setStats(data);
    };
    loadStats();
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
      const noradId = input.trim();
      
      // Check if satellite already exists
      if (items.includes(noradId)) {
        console.warn('Satellite already loaded');
        return;
      }
      
      try {
        const satelliteData = await fetchSatellite(noradId);
        
        if (satelliteData) {
          setSatellites(prev => [...prev, satelliteData]);
          setItems(prev => [...prev, noradId]);
          
          // Calculate initial position
          const initialPos = getCurrentPosition(satelliteData);
          setPositions(prev => [...prev, initialPos]);
          
          setInput(''); // Clear input after successful add
        }
      } catch (error) {
        console.error('Failed to load satellite:', error);
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

  const handleRemove = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setSatellites(prev => prev.filter((_, i) => i !== index));
    setPositions(prev => prev.filter((_, i) => i !== index));
  }

  const handleAddRandom = async () => {
    const n_random = parseInt(randomInput);
    
    if (!n_random || isNaN(n_random) || n_random <= 0 || !Number.isInteger(n_random)) {
      console.error('Please enter a valid positive integer for number of random satellites.');
      return;
    }
    
    try {
      // returns list of n random satellites from backend
      const response = await fetch(`http://localhost:8000/api/random_satellites/${n_random}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch random satellites: ${response.status}`);
      }
      const data = await response.json();
      console.log('Received satellites:', data);
      
      // Update state with new satellites
      const newSatellites = data.filter(sat => !satellites.some(existing => existing.norad_id === sat.norad_id));
      setSatellites(prev => [...prev, ...newSatellites]);
      setItems(prev => [...prev, ...newSatellites.map(sat => sat.norad_id)]);
      
      // Calculate initial positions for new satellites
      const newPositions = newSatellites.map(sat => getCurrentPosition(sat));
      setPositions(prev => [...prev, ...newPositions]);
      
      setRandomInput(''); // Clear input after successful add
    } catch (error) {
      console.error('Failed to load random satellites:', error);
    }
  }

  const handleRandomKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddRandom();
    }
  }
  const handleAddGroup = async (group) => {
    const groupName = group.trim();
    
    if (groupName && !LoadedGroups.includes(groupName)) {
      try {
        const response = await fetch(`http://localhost:8000/api/satellites/${groupName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch group: ${response.status}`);
        }
        const data = await response.json();
        
        // Filter out already loaded satellites
        const satelliteData = data.satellites;
        const newSatellites = satelliteData.filter(sat => !satellites.some(existing => existing.norad_id === sat.norad_id));
        // give sample if too many satellites
        if (newSatellites.length > 100) {
          newSatellites = newSatellites.sort(() => 0.5 - Math.random()).slice(0, 100);
        }
        
        setSatellites(prev => [...prev, ...newSatellites]);
        setItems(prev => [...prev, ...newSatellites.map(sat => sat.norad_id)]);

        // Calculate initial positions for new satellites
        const newPositions = newSatellites.map(sat => getCurrentPosition(sat));
        setPositions(prev => [...prev, ...newPositions]);
        
        setLoadedGroups(prev => [...prev, groupName]);
      } catch (error) {
        console.error('Failed to load group:', error);
      }
    }
  }

  const handleRemoveGroup = (group) => {
    const groupName = group.trim();
    
    if (groupName && LoadedGroups.includes(groupName)) {
      // Remove satellites belonging to this group
      setSatellites(prev => prev.filter(sat => sat.group !== groupName));
      setItems(prev => prev.filter((_, i) => satellites[i].group !== groupName));
      setPositions(prev => prev.filter((_, i) => satellites[i].group !== groupName));
      
      setLoadedGroups(prev => prev.filter(g => g !== groupName));
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1b1e2b' }}>
      <Canvas>
        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        
        <The_Earth data={[1, 16, 16]} />
        <Batch_render_satellites satellites={satellites} positions={positions} />
      </Canvas>

      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <div className="add-content-container">
          <div className="top-row">
            <h1 style = {{fontSize: 30}}>Active Satellites: {satellites.length}</h1>
            <button className="button" onClick={handleReset}>Reset All</button>
          </div>
          
          <div
            className="add-content-container"
            style={{
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            <ul className='satellite-list'>
              {satellites.map((satellite_data, index) => (
                <li className='list-item' key={satellite_data.norad_id}>
                  <span className='list-content'>
                    {satellite_data.name} (NORAD ID: {satellite_data.norad_id})
                  </span>
                  <button className='button' onClick={() => handleRemove(index)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>

          <h1 style = {{fontSize: 30}}>Loading Options:</h1>
          
          <div className="top-row">
            <h2>Load by NORAD id</h2>
            <input 
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="NORAD ID"
            />
            <button className="button" onClick={handleAdd}>Add</button>
          </div>

          <div className="top-row">
            <h2>Load by group</h2>
            <button className="button" onClick={() => setshowGroup(!showGroup)}>
              {showGroup ? "hide groups" : "show groups"}
            </button>
          </div>

          {showGroup && (
            <div
              className="add-content-container"
              style={{
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              <ul>
                {Object.keys(stats.groups).map((item, index) => (
                  <Group_list_item
                    key={index}
                    group={item}
                    index={index}
                    LoadedGroups={LoadedGroups}
                    groupUpdate={setLoadedGroups}
                    groupLoader={handleAddGroup}
                    groupRemover={handleRemoveGroup}
                  />
                ))}
              </ul>
            </div>
          )}

          <div className="top-row">
            <h2>Load at random</h2>
            <input 
              className="input"
              value={randomInput}
              onChange={(e) => setRandomInput(e.target.value)}
              onKeyDown={handleRandomKeyPress}
              placeholder="Number"
            />
            <button className="button" onClick={handleAddRandom}>Add</button>
          </div>
        </div>
         <button className="button" onClick={TestFunction}>Test</button>
      </div>
    </div>
  );
}

export default App;