import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, useGLTF } from '@react-three/drei';
import { Box3, Group, MathUtils, Vector3 } from 'three';
import { MASCOT_MODEL_URL } from './mascotConfig';
import type { MascotEngine } from './mascotMotion';

/** Height, in world units, every model is normalised to. */
const FIGURE_HEIGHT = 2.9;

/**
 * The GLB is authored elsewhere and can arrive at any scale, origin or
 * orientation, so it is measured on load and fitted to the stage: feet on the
 * floor, centred horizontally, always the same height on screen. That keeps the
 * framing of the page independent of how the model was exported.
 */
function useFittedModel(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const root = scene.clone(true);
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const scale = FIGURE_HEIGHT / (size.y || 1);
    root.scale.setScalar(scale);
    root.position.set(
      -centre.x * scale,
      -FIGURE_HEIGHT / 2 - box.min.y * scale,
      -centre.z * scale,
    );
    return root;
  }, [scene]);
}

/**
 * Applies the shared pose. The numbers come from the same engine that drives
 * the still composition, so switching between the two never changes the feel of
 * the movement — only its fidelity.
 */
function Figure({ engine }: { engine: MascotEngine }) {
  const group = useRef<Group>(null);
  const model = useFittedModel(MASCOT_MODEL_URL);

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    const pose = engine.pose;
    node.rotation.y = MathUtils.degToRad(pose.rotateY);
    node.rotation.x = MathUtils.degToRad(pose.rotateX);
    node.position.x = pose.translateX * 0.006;
    node.position.y = -pose.translateY * 0.006;
    node.scale.setScalar(pose.scale);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

/**
 * Lighting built from the club palette rather than an HDRI: a cool off-white
 * key, a gold rim that traces the silhouette, and a low fill. No environment
 * map means nothing is fetched from a third party and the gold stays a material
 * highlight instead of becoming a glow.
 */
function Lighting({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.5} color="#F4F4F2" />
      <hemisphereLight intensity={0.35} color="#F4F4F2" groundColor="#08090B" />
      <directionalLight position={[3.4, 4.6, 3.8]} intensity={2.2} color="#F4F4F2" />
      <directionalLight position={[-4.2, 2.4, -3.2]} intensity={1.6} color="#E0BE55" />
      <pointLight position={[-2.6, -1.2, 2.6]} intensity={0.45} color="#C9A227" />
      {shadows && (
        <ContactShadows
          position={[0, -FIGURE_HEIGHT / 2, 0]}
          opacity={0.7}
          scale={7}
          blur={2.6}
          far={3}
          resolution={512}
          color="#000000"
        />
      )}
    </>
  );
}

/**
 * WebGL layer. Mounted only once a model has been confirmed to exist, so on an
 * installation without a GLB this module — and Three.js with it — is never
 * downloaded.
 */
export default function MascotScene({
  engine,
  lowPower = false,
}: {
  engine: MascotEngine;
  lowPower?: boolean;
}) {
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');

  // A hidden tab keeps no GPU work alive.
  useEffect(() => {
    const sync = () => setFrameloop(document.hidden ? 'never' : 'always');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, lowPower ? 1 : 1.8]}
      camera={{ position: [0, 0.1, 6.2], fov: 30 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <Lighting shadows={!lowPower} />
      <Suspense fallback={null}>
        <Figure engine={engine} />
      </Suspense>
    </Canvas>
  );
}
