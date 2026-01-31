import React, {useMemo} from 'react';
import { Line } from '@react-three/drei';
import { generateOrbitCoordinates } from '../utils/orbitCalculations.jsx';




export function Orbit_path_new({satellitedata, color, lineWidth, opacity}) {
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