// textureManager.js - just handles the path logic now
export const getTexturePath = (group) => {
  return group 
    ? `/icons/satellite_${group}_icon.png`
    : '/icons/satellite_default_icon.png';
};