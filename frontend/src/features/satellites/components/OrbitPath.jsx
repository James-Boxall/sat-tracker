import React, {useMemo} from 'react';
import { Line } from '@react-three/drei';
import { generateOrbitCoordinates } from '../utils/orbitCalculations.jsx';




export function Orbit_path_new({satellitedata, color, dateRef, lineWidth, opacity, renderTrigger}) {


    const points = useMemo(() => generateOrbitCoordinates({satellitedata, dateRef}), [satellitedata, renderTrigger]);

return (
    <Line S
    points={points} 
    color={color || 'white'}
    lineWidth={lineWidth || 2} 
    transparent
    opacity={opacity}
    />
);
}