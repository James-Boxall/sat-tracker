import { Canvas } from '@react-three/fiber';
import {Line, OrbitControls } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { sqrt } from 'three/tsl';

const scale = 1*1/(6,371); // Simulation scale based on Earth's radius in km

function Circle({ position, color, size }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <mesh 
      position={position}
      scale={hovered ? 1.5 : 1}
      onPointerOver={(e) => {
        e.stopPropagation();  // Prevent triggering parent elements
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <circleGeometry args={[size, 32]} />
      <meshStandardMaterial color={hovered ? 'yellow' : color} />
    </mesh>
  );
}


function Orbit_path({a, b, rotation}) {
  const [hovered, setHovered] = useState(false);
 
  let centre_offset;
  
    if (a === b) {
      centre_offset = 0;
    } else {
      centre_offset = Math.sqrt(Math.abs(a*a - b*b));
    }
    
  
  const points = useMemo(() => new THREE.EllipseCurve(centre_offset, 0, a, b, 0, 2 * Math.PI, false, 0).getPoints(100), [])
  return(
    <Line 
      points={points} 
      color="turquoise"
      lineWidth={hovered ? 4 : 2} 
      rotation={rotation}
      transparent
      opacity={hovered ? 1 : 0.5}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    />
  )





}


function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1b1e2b' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]}/>
          <meshStandardMaterial color="orange" />
          
        </mesh>
        <Circle position={[-2, 0, 0]} color="red" size={0.5} />
        <Orbit_path a = {5} b = {3} rotation={[0,0,0]} />
        <axesHelper args={[5]} /> 
      </Canvas>
    </div>
  );
}

export default App;
