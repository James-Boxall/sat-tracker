import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { useRef } from 'react';
import * as satellite from 'satellite.js';

export const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vLightDirView;

  uniform vec3 lightDirection;

  void main() {
    vUv = uv;
    vNormalView = normalize(normalMatrix * normal);
    vLightDirView = normalize((viewMatrix * vec4(lightDirection, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vLightDirView;

  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform float transitionWidth; // 0.0..10.0 (cosine range) — smaller = sharper
  uniform float nightBoost;      // multiply night map to make lights pop

  void main() {
    vec3 normal = normalize(vNormalView);
    vec3 lightDir = normalize(vLightDirView);

    float cosine = dot(normal, lightDir); // -1..1

    // Clamp / sharp transition centered at cosine = 0
    // Use smoothstep for a smooth but controllable transition.
    float halfW = max(0.0001, transitionWidth * 0.5);
    float mixFactor = smoothstep(-halfW, halfW, cosine);

    vec3 dayColor = texture2D(dayMap, vUv).rgb;
    vec3 nightColor = texture2D(nightMap, vUv).rgb * nightBoost;

    vec3 color = mix(nightColor, dayColor, mixFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function The_Earth({date}) {
  const dayTexture = useLoader(THREE.TextureLoader, '/2k_earth_daymap.jpg');
  const nightTexture = useLoader(THREE.TextureLoader, '/2k_earth_nightmap.jpg');
  const meshRef = useRef();
  const shaderRef = useRef();

  dayTexture.encoding = THREE.sRGBEncoding;
  nightTexture.encoding = THREE.sRGBEncoding;
  dayTexture.needsUpdate = true;
  nightTexture.needsUpdate = true;

  useFrame(() => {
    if (!meshRef.current || !shaderRef.current) return;

    const now = date.current;

    // Rotate the Earth mesh
    const gmst = satellite.gstime(now);
    meshRef.current.rotation.y = gmst;

    // Calculate Sun Position in ECI 
    const jday = satellite.jday(now);
    const since2000 = jday - 2451545;

    const meanLongitude = (280.460 + 0.9856474 * since2000) % 360;
    const meanAnomaly = (357.528 + 0.9856003 * since2000) % 360;
    const rad = Math.PI / 180;
    const lambda = meanLongitude + 1.915 * Math.sin(meanAnomaly * rad) +
                  0.020 * Math.sin(2 * meanAnomaly * rad);
    const obliquity = 23.439 - 0.0000004 * since2000;

    // ECI Coordinates (Z is North, X is Vernal Equinox)
    const X = Math.cos(lambda * rad);
    const Y = Math.cos(obliquity * rad) * Math.sin(lambda * rad);
    const Z = Math.sin(obliquity * rad) * Math.sin(lambda * rad);

    // Update the uniform value
    shaderRef.current.uniforms.lightDirection.value.set(X, Z, -Y).normalize();
    
    // Mark the material as needing an update
    shaderRef.current.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={shaderRef}
          uniforms={{
            dayMap: { value: dayTexture },
            nightMap: { value: nightTexture },
            lightDirection: { value: new THREE.Vector3(1, 0, 0) },
            transitionWidth: { value: 0.3 }, // default: small → sharp terminator
            nightBoost: { value: 1.2 },       // boost night lights visibility
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
    </group>
  );
}

