import { Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import { useRef, useEffect, useState, useMemo } from 'react';
import { getCurrentPosition } from './features/satellites/utils/orbitCalculations.jsx';
import { The_Earth} from './features/earth/earth.jsx';
import { fetchSatellite, fetchStats, fetchRandom, fetchGroup } from './features/satellites/utils/apiCalls.jsx';
import { Batch_render_satellites } from './features/satellites/components/BatchRender.jsx';
import { GroupListItem} from './components/GroupListItem.jsx'
import { SCALE } from './utils/constants.js'
import * as satellite from 'satellite.js';
import "./App.css"


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

  const TestFunction = () => {}
  

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
          // Y and Z flipped for THREE.js co-ords
          return [pos.x * SCALE, pos.z * SCALE, pos.y * SCALE];
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
     
      const data = await fetchRandom(n_random)
      
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
      
        const data = await fetchGroup(groupName)
        
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
        <axesHelper args = {[5]}/>
        
        
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
                  <GroupListItem
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