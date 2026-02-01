import { useRef, useEffect, useState } from 'react';
import { Html, Billboard } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import {Orbit_path_new} from './OrbitPath';
import {stringToColour} from '../utils/orbitCalculations';
import {SatelliteIcon} from './SatelliteIcons';



export function Satellite_render_test({satellite: satelliteData, colour, position}) {
  // Remove the interval and position state from here
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
 
  const hoverTimeoutRef = useRef(null);

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
        
        {/* temporarily using a sphere as satellite icon */}
        <Suspense fallback={null}>
          <SatelliteIcon satData = {satelliteData} colour = {UsedColour}/>
        </Suspense>
        
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
        {/*
        <sphereGeometry args={[0.1, 10, 10]}/>
        <meshStandardMaterial color={'white'} transparent opacity={0} />
        */}
      </mesh>
      <Orbit_path_new satellitedata={satelliteData} color={UsedColour} opacity={1}/>
    </group>
  );
}