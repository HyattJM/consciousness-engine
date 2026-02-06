'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from 'leva';

const NeuralFlowParticles = () => {
   const { count, speed, flowIntensity, particleSize, colorA, colorB } = useControls('Neural Flow', {
    count: { value: 5000, min: 1000, max: 20000, step: 1000 },
    speed: { value: 0.2, min: 0, max: 2 },
    flowIntensity: { value: 1.0, min: 0.1, max: 5 },
    particleSize: { value: 0.15, min: 0.01, max: 0.5 },
    colorA: '#4a00e0',
    colorB: '#8e2de2'
  });

  // Shader references
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Generate initial positions
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
    }
    return positions;
  }, [count]);

  // Generate random offsets for noise variation
  const randoms = useMemo(() => {
    const randoms = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      randoms[i] = Math.random();
    }
    return randoms;
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: speed },
    uFlowIntensity: { value: flowIntensity },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1.0 },
    uParticleSize: { value: particleSize },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uInteractionRadius: { value: 5.0 },
    uInteractionForce: { value: 1.0 },
    uPulse: { value: 0 }
  }), [speed, flowIntensity, colorA, colorB, particleSize]);

  // Pulse state
  const pulseRef = useRef(0);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uSpeed.value = speed;
      materialRef.current.uniforms.uFlowIntensity.value = flowIntensity;
      materialRef.current.uniforms.uColorA.value.set(colorA);
      materialRef.current.uniforms.uColorB.value.set(colorB);
      materialRef.current.uniforms.uParticleSize.value = particleSize;

      // Mouse interaction
      const { mouse, viewport } = state;
      materialRef.current.uniforms.uMouse.value.set(
        (mouse.x * viewport.width) / 2, 
        (mouse.y * viewport.height) / 2, 
        0
      );

      // Pulse decay
      pulseRef.current = THREE.MathUtils.damp(pulseRef.current, 0, 4, delta);
      materialRef.current.uniforms.uPulse.value = pulseRef.current;
    }
  });

  // Handle global click for pulse
  const onPointerDown = () => {
      pulseRef.current = 1.0;
  };

  // Add listener to window (or canvas parent)
  // simpler is to just use a mesh or effect, but here we can attach to the points since they fill the screen roughly? 
  // Actually, points raycasting is expensive. Let's use a global event in the parent or just a useEffect.
  useEffect(() => {
      const handleClick = () => { pulseRef.current = 2.0; };
      window.addEventListener('pointerdown', handleClick);
      return () => window.removeEventListener('pointerdown', handleClick);
  }, []);

  // Vertex Shader update for Pulse
  const vertexShader = `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uFlowIntensity;
    uniform float uPixelRatio;
    uniform float uParticleSize;
    uniform vec3 uMouse;
    uniform float uInteractionRadius;
    uniform float uInteractionForce;
    uniform float uPulse;
    
    attribute float aRandom;
    
    varying vec3 vColor;
    varying float vAlpha;

    // ... (noise functions)
    // Simplex noise function (simplified for brevity)
    // Source: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;

      // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      //   x0 = x0 - 0.0 + 0.0 * C.xxx;
      //   x1 = x0 - i1  + 1.0 * C.xxx;
      //   x2 = x0 - i2  + 2.0 * C.xxx;
      //   x3 = x0 - 1.0 + 3.0 * C.xxx;
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

      // Permutations
      i = mod289(i); 
      vec4 p = permute( permute( permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      // Gradients: 7x7 points over a square, mapped onto an octahedron.
      // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
      //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      //Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      // Mix final noise value
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      // Calculate new position based on noise flow
      vec3 pos = position;
      
      // Time-based offset for movement
      float time = uTime * uSpeed;
      
      // Calculate noise field
      float noiseVal = snoise(vec3(pos.x * 0.1, pos.y * 0.1, pos.z * 0.1 + time));
      
      // Pulse Effect (Explosion from center or mouse)
      // Let's make it explode from the mouse position
      float distToMouse = distance(pos.xy, uMouse.xy);
      float pulseWave = smoothstep(0.0, 10.0, uPulse * 10.0 - distToMouse);
      float pulseStrength = smoothstep(1.0, 0.0, abs(distToMouse - (uPulse * 10.0))); 
      
      // Simple radial blast
      pos += normalize(pos - uMouse) * uPulse * 2.0 * (1.0 / (distToMouse + 0.1));

      // Displace position based on noise
      pos.x += snoise(vec3(pos.x, time, pos.z)) * uFlowIntensity;
      pos.y += snoise(vec3(time, pos.y, pos.x)) * uFlowIntensity;
      pos.z += snoise(vec3(pos.z, pos.x, time)) * uFlowIntensity;

      // Interaction Force (Continuous)
      float dist = distance(pos.xy, uMouse.xy);
      float strength = smoothstep(uInteractionRadius, 0.0, dist);
      
      vec3 dir = normalize(pos - uMouse);
      pos += dir * strength * uInteractionForce;

      // Calculate ViewPosition
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = uParticleSize * 100.0 * uPixelRatio * (1.0 / -mvPosition.z);

      // Pass color/alpha to fragment shader
      vAlpha = 0.5 + 0.5 * noiseVal + (uPulse * 0.5); // Brighton on pulse
    }
  `;

  // Fragment Shader
  const fragmentShader = `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    
    varying float vAlpha;

    void main() {
      // Circular particle
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      // Soft edge
      float strength = 1.0 - (r * 2.0);
      strength = pow(strength, 1.5);

      // Mix colors
      vec3 finalColor = mix(uColorA, uColorB, vAlpha);

      gl_FragColor = vec4(finalColor, strength * vAlpha);
    }
  `;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          args={[randoms, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default NeuralFlowParticles;
