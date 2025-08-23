// src/components/background/Particles.tsx
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import './Particles.css';

interface ParticlesProps {
  count?: number;
}

const ParticleField: React.FC<ParticlesProps> = ({ count = 1000 }) => {
  const mesh = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      temp[i3] = (Math.random() - 0.5) * 20;
      temp[i3 + 1] = (Math.random() - 0.5) * 20;
      temp[i3 + 2] = (Math.random() - 0.5) * 20;
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      mesh.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.1;
      
      // Animate individual particles
      const positions = mesh.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.002;
        positions[i] += Math.cos(state.clock.elapsedTime * 0.3 + i) * 0.001;
      }
      mesh.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={mesh} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffd700"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

const ConnectedParticles: React.FC = () => {
  const mesh = useRef<THREE.Points>(null);
  const lines = useRef<THREE.LineSegments>(null);
  
  const particleCount = 50;
  
  const particles = useMemo(() => {
    const temp = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      temp[i3] = (Math.random() - 0.5) * 15;
      temp[i3 + 1] = (Math.random() - 0.5) * 15;
      temp[i3 + 2] = (Math.random() - 0.5) * 15;
    }
    return temp;
  }, []);

  const connections = useMemo(() => {
    const linePositions = [];
    const positions = particles;
    
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const i3 = i * 3;
        const j3 = j * 3;
        
        const dx = positions[i3] - positions[j3];
        const dy = positions[i3 + 1] - positions[j3 + 1];
        const dz = positions[i3 + 2] - positions[j3 + 2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 3) {
          linePositions.push(
            positions[i3], positions[i3 + 1], positions[i3 + 2],
            positions[j3], positions[j3 + 1], positions[j3 + 2]
          );
        }
      }
    }
    
    return new Float32Array(linePositions);
  }, [particles]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.002;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
    
    if (lines.current) {
      lines.current.rotation.y += 0.001;
    }
  });

  return (
    <group>
      <Points ref={mesh} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#dc2626"
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
        />
      </Points>
      
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={connections.length / 3}
            array={connections}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};

const Particles: React.FC = () => {
  return (
    <div className="particles-container">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <ParticleField count={800} />
        <ConnectedParticles />
        
        {/* Floating geometric shapes */}
        <mesh position={[5, 3, -2]} rotation={[0, 0, 0]}>
          <octahedronGeometry args={[0.3]} />
          <meshBasicMaterial 
            color="#dc2626" 
            transparent 
            opacity={0.1}
            wireframe
          />
        </mesh>
        
        <mesh position={[-4, -2, -1]} rotation={[0, 0, 0]}>
          <icosahedronGeometry args={[0.4]} />
          <meshBasicMaterial 
            color="#ffd700" 
            transparent 
            opacity={0.1}
            wireframe
          />
        </mesh>
      </Canvas>
      
      {/* CSS-based floating elements */}
      <div className="floating-elements">
        <div className="floating-shape shape-1" />
        <div className="floating-shape shape-2" />
        <div className="floating-shape shape-3" />
        <div className="floating-line line-1" />
        <div className="floating-line line-2" />
      </div>
    </div>
  );
};

export default Particles;