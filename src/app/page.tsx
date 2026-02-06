'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import Scene from '@/components/Scene';
import { Leva } from 'leva';

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* UI Overlay / HUD */}
      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none p-8 mix-blend-difference text-white">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter uppercase font-mono">
              Consciousness Engine
            </h1>
            <p className="text-xs opacity-70 font-mono mt-2">
              Status: INJECTION_ACTIVE
            </p>
          </div>
          <div className="text-right font-mono text-xs opacity-50">
            <p>V 0.0.1</p>
            <p>SYS.NORMAL</p>
          </div>
        </header>

        <footer className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
           <div className="max-w-md">
              <p className="font-mono text-sm leading-relaxed opacity-80">
                "Creativey is sold for rote vector analyzation. I wan't to develop a space we we can inject are consiousness."
              </p>
           </div>
           <div className="animate-pulse">
             <div className="w-3 h-3 bg-green-500 rounded-full"></div>
           </div>
        </footer>
      </div>

      {/* 3D Scene */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 15], fov: 45 }}
          gl={{ antialias: false, alpha: false, stencil: false, depth: false }}
        >
          <color attach="background" args={['#050505']} />
          <Suspense fallback={null}>
             <Scene />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Debug Controls */}
      <Leva collapsed />
    </main>
  );
}
