import { Satellite_render_test } from "./SatelliteRender";


export function Batch_render_satellites({ satellites, positions, dateRef, renderTrigger }) { 
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
          dateRef ={dateRef}
          renderTrigger = {renderTrigger}
        />
      ))}
    </>
  )
}

