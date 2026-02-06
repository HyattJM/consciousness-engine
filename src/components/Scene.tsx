'use client';

import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { useControls } from 'leva';
import NeuralFlow from './NeuralFlow';

export default function Scene() {
  const { bloomIntensity, bloomLuminance, noiseOpacity } = useControls('Post Processing', {
    bloomIntensity: { value: 1.5, min: 0, max: 5 },
    bloomLuminance: { value: 0.1, min: 0, max: 1 },
    noiseOpacity: { value: 0.05, min: 0, max: 0.5 },
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 20]} />
      <OrbitControls makeDefault enableZoom={false} enablePan={false} rotateSpeed={0.5} />
      
      <NeuralFlow />

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={bloomLuminance} intensity={bloomIntensity} />
        <Noise opacity={noiseOpacity} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
}
