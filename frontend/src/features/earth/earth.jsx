import { useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import * as satellite from 'satellite.js';


export function The_Earth(data) {
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

