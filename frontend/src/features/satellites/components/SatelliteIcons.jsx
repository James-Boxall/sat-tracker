import { Billboard } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useState } from 'react';


 function useFirstValidTexture(paths) {
  const [validPath, setValidPath] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    
    const tryLoad = (index) => {
      if (index >= paths.length || cancelled) return;
      
      loader.load(
        paths[index],
        () => { if (!cancelled) setValidPath(paths[index]); }, // onLoad
        undefined, // onProgress
        () => tryLoad(index + 1) // onError
      );
    };
    
    tryLoad(0);
    return () => { cancelled = true; };
  }, [paths]);

  return validPath;
}

export function SatelliteIcon({ satData, colour }) {
  const candidates = [
    `/icons/satellite_${satData.norad_id}_icons.png`,
    `/icons/satellite_${satData.group}_icons.png`,
    `/icons/satellite_default_icon.png`,
  ];

  const validPath = useFirstValidTexture(candidates);

  if (!validPath) return null; 

  return <SatelliteIconLoaded path={validPath} colour={colour} />;
}

function SatelliteIconLoaded({ path, colour }) {
  const texture = useLoader(THREE.TextureLoader, path);

  return (
    <Billboard>
      <mesh>
        <planeGeometry args={[0.02, 0.02]} />
        <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} color={colour} />
      </mesh>
    </Billboard>
  );
}