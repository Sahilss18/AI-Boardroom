import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { AIAgent } from '../data/agents';

interface PedestalProps {
  agent: AIAgent;
  isActive: boolean;
  distance?: number;
}

export const Pedestal: React.FC<PedestalProps> = ({ agent, isActive, distance = 0 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic references for smooth frame-by-frame reactivity
  const dynamicRefs = useRef<{
    colorHex: string;
    isActive: boolean;
    distance: number;
  }>({
    colorHex: agent.hex,
    isActive: isActive,
    distance: distance,
  });

  useEffect(() => {
    dynamicRefs.current.colorHex = agent.hex;
    dynamicRefs.current.isActive = isActive;
    dynamicRefs.current.distance = distance;
  }, [agent.hex, isActive, distance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 360;
    const height = 220;
    const themeColor = new THREE.Color(agent.hex);

    // 1. UHD WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // 2. Scene & Low-Angle Cinematic Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 1.45, 4.6);
    camera.lookAt(0, 0.22, 0);

    // 3. Three-Point Studio Lighting (Clean metallic highlights with agent accent kick)
    scene.add(new THREE.HemisphereLight(0x4a657e, 0x03060c, 0.85));

    const keyLight = new THREE.DirectionalLight(0xd8f0ff, 1.5);
    keyLight.position.set(2.5, 4.2, 3.2);
    scene.add(keyLight);

    const warmKick = new THREE.PointLight(themeColor, 0.9, 8, 2);
    warmKick.position.set(-2.0, 0.8, 1.8);
    scene.add(warmKick);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rim.position.set(-3.0, 2.5, -2.5);
    scene.add(rim);

    // 4. Procedural Dark Premium Technical HUD Top Disc Texture
    function makeTopDiscTexture(hex: string) {
      const size = 512;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      const cx = size / 2, cy = size / 2;

      // Dark obsidian tinted gradient core
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.49);
      grad.addColorStop(0, 'rgba(6, 10, 16, 0.98)');
      grad.addColorStop(0.55, 'rgba(10, 18, 28, 0.96)');
      grad.addColorStop(0.82, hex + '33');
      grad.addColorStop(0.96, hex + '88');
      grad.addColorStop(1.0, hex + 'cc');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Fine concentric technical HUD grooves
      ctx.strokeStyle = hex;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
      ctx.stroke();

      // Precision technical tick marks around perimeter
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 2.0;
      const ticks = 36;
      for (let i = 0; i < ticks; i++) {
        const angle = (i / ticks) * Math.PI * 2;
        const r1 = size * 0.43;
        const r2 = size * (i % 3 === 0 ? 0.47 : 0.45);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
        ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(c);
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      return tex;
    }

    // Base Group
    const base = new THREE.Group();
    scene.add(base);

    // 5. Projector Chassis (PBR Metals)
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x0e1620,
      metalness: 0.90,
      roughness: 0.28,
    });
    const metalMat2 = new THREE.MeshStandardMaterial({
      color: 0x141e2a,
      metalness: 0.85,
      roughness: 0.24,
    });
    const metalTrim = new THREE.MeshStandardMaterial({
      color: 0x304255,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Lower Chassis Cylinder
    const chassisLower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.22, 72), metalMat);
    chassisLower.position.y = 0.11;
    base.add(chassisLower);

    // Bevel ring between tiers
    const lowerBevel = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.88, 0.03, 72), metalTrim);
    lowerBevel.position.y = 0.225;
    base.add(lowerBevel);

    // Upper Chassis Cylinder (Dark body in between the conduit ring and top circle)
    const chassisUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.72, 0.16, 72), metalMat2);
    chassisUpper.position.y = 0.30;
    base.add(chassisUpper);

    // Chrome Lens Collar
    const lensCollar = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.48, 0.04, 72), metalTrim);
    lensCollar.position.y = 0.385;
    base.add(lensCollar);

    // 8. Glowing Power Conduit Ring (Torus) - Tinted as per agent base color
    const powerRingMat = new THREE.MeshBasicMaterial({
      color: themeColor,
      transparent: true,
      opacity: isActive ? 1.0 : 0.2,
    });
    const powerRing = new THREE.Mesh(new THREE.TorusGeometry(1.735, 0.024, 16, 96), powerRingMat);
    powerRing.rotation.x = Math.PI / 2;
    powerRing.position.y = 0.225;
    base.add(powerRing);

    // Multi-Layered Holographic High-Intensity Bloom Rings & Platform Illumination
    // Layer 1: Intense Inner Bloom
    const bloomRingMat = new THREE.MeshBasicMaterial({
      color: themeColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: isActive ? 0.85 : 0.15,
      depthWrite: false,
    });
    const bloomRing = new THREE.Mesh(new THREE.TorusGeometry(1.735, 0.048, 16, 96), bloomRingMat);
    bloomRing.rotation.x = Math.PI / 2;
    bloomRing.position.y = 0.225;
    base.add(bloomRing);

    // Layer 2: Wide Atmospheric Outer Bloom Halo
    const outerHaloMat = new THREE.MeshBasicMaterial({
      color: themeColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: isActive ? 0.65 : 0.1,
      depthWrite: false,
    });
    const outerHalo = new THREE.Mesh(new THREE.TorusGeometry(1.735, 0.092, 16, 96), outerHaloMat);
    outerHalo.rotation.x = Math.PI / 2;
    outerHalo.position.y = 0.225;
    base.add(outerHalo);

    // Layer 3: Radiant Surface Glow Ring on the metallic bevel
    const bevelGlowMat = new THREE.MeshBasicMaterial({
      color: themeColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: isActive ? 0.55 : 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const bevelGlow = new THREE.Mesh(new THREE.RingGeometry(1.58, 1.95, 64), bevelGlowMat);
    bevelGlow.rotation.x = -Math.PI / 2;
    bevelGlow.position.y = 0.226;
    base.add(bevelGlow);

    // Primary High-Intensity Point Light directly from the ring
    const ringLight = new THREE.PointLight(themeColor, isActive ? 3.6 : 0.4, 6.5, 1.8);
    ringLight.position.set(0, 0.23, 0);
    base.add(ringLight);

    // Secondary Lower Platform Illumination Light
    const platformLight = new THREE.PointLight(themeColor, isActive ? 2.4 : 0.3, 5.0, 1.8);
    platformLight.position.set(0, 0.12, 0);
    base.add(platformLight);

    // 9. Perimeter LED Dots (28 precision indicators)
    const DOT_COUNT = 28;
    const dotGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({
      color: themeColor,
    });
    const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, DOT_COUNT);
    const dm = new THREE.Matrix4();
    for (let i = 0; i < DOT_COUNT; i++) {
      const a = (i / DOT_COUNT) * Math.PI * 2;
      dm.makeTranslation(Math.cos(a) * 1.96, 0.12, Math.sin(a) * 1.96);
      dotMesh.setMatrixAt(i, dm);
    }
    base.add(dotMesh);

    // 10. Dark, Premium Technical HUD Top Disc Substrate (with rich agent color accents)
    const topTex = makeTopDiscTexture(agent.hex);
    const topDiscMat = new THREE.MeshStandardMaterial({
      color: 0x0c1622,
      map: topTex || undefined,
      metalness: 0.85,
      roughness: 0.22,
      emissive: themeColor,
      emissiveIntensity: isActive ? 0.45 : 0.1,
    });
    const topDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.30, 1.30, 0.02, 64), topDiscMat);
    topDisc.position.y = 0.40;
    base.add(topDisc);

    // Refractive Optical Glass Layer over the dark technical disc
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: themeColor,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.75,
      transparent: true,
      opacity: 0.55,
      thickness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(1.31, 1.31, 0.03, 72), lensMat);
    lens.position.y = 0.408;
    base.add(lens);

    // Illuminating Outer Top Aperture Ring Rim (High-energy neon glow)
    const topRimMat = new THREE.MeshBasicMaterial({
      color: themeColor,
      transparent: true,
      opacity: isActive ? 1.0 : 0.35,
    });
    const topRim = new THREE.Mesh(new THREE.TorusGeometry(1.31, 0.020, 16, 72), topRimMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = 0.412;
    base.add(topRim);

    // Illuminating Concentric Inner Neon Ring
    const innerRimMat = new THREE.MeshBasicMaterial({
      color: themeColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: isActive ? 0.75 : 0.15,
      depthWrite: false,
    });
    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.012, 16, 64), innerRimMat);
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.y = 0.413;
    base.add(innerRim);

    // 11. Render Loop
    let animationId: number;
    const startTime = performance.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) * 0.001;
      const { colorHex, distance: dist } = dynamicRefs.current;
      const curColor = new THREE.Color(colorHex);
      const isCenter = dist === 0;
      const isNeighbor = dist === 1;



      // Conduit power ring pulse
      if (powerRingMat) {
        const pulse = Math.sin(t * 2.8) * 0.15;
        powerRingMat.color.copy(curColor);
        const targetOpacity = isCenter ? 0.95 + pulse : isNeighbor ? 0.65 + pulse * 0.6 : 0.2;
        powerRingMat.opacity = THREE.MathUtils.lerp(powerRingMat.opacity, targetOpacity, 0.08);
      }

      // Multi-layer bloom ring animations
      if (bloomRingMat) {
        const bloomPulse = Math.sin(t * 2.8) * 0.15;
        bloomRingMat.color.copy(curColor);
        const targetBloom = isCenter ? 0.8 + bloomPulse : isNeighbor ? 0.55 + bloomPulse * 0.6 : 0.15;
        bloomRingMat.opacity = THREE.MathUtils.lerp(bloomRingMat.opacity, targetBloom, 0.08);
      }

      if (outerHaloMat) {
        const haloPulse = Math.sin(t * 2.4) * 0.2;
        outerHaloMat.color.copy(curColor);
        const targetHalo = isCenter ? 0.6 + haloPulse : isNeighbor ? 0.4 + haloPulse * 0.6 : 0.1;
        outerHaloMat.opacity = THREE.MathUtils.lerp(outerHaloMat.opacity, targetHalo, 0.08);
      }

      if (bevelGlowMat) {
        const bevelPulse = Math.sin(t * 2.6) * 0.15;
        bevelGlowMat.color.copy(curColor);
        const targetBevel = isCenter ? 0.55 + bevelPulse : isNeighbor ? 0.35 + bevelPulse * 0.6 : 0.08;
        bevelGlowMat.opacity = THREE.MathUtils.lerp(bevelGlowMat.opacity, targetBevel, 0.08);
      }

      // Dark top disc emissive intensity pulse
      if (topDiscMat) {
        topDiscMat.emissive.copy(curColor);
        const targetDisc = isCenter ? 0.45 + 0.1 * Math.sin(t * 2.6) : isNeighbor ? 0.28 : 0.1;
        topDiscMat.emissiveIntensity = THREE.MathUtils.lerp(topDiscMat.emissiveIntensity, targetDisc, 0.08);
      }

      if (lensMat) {
        lensMat.color.copy(curColor);
      }

      if (topRimMat) {
        const rimPulse = Math.sin(t * 3.0) * 0.15;
        topRimMat.color.copy(curColor);
        const targetRim = isCenter ? 0.95 + rimPulse : isNeighbor ? 0.70 + rimPulse * 0.6 : 0.30;
        topRimMat.opacity = THREE.MathUtils.lerp(topRimMat.opacity, targetRim, 0.08);
      }

      if (innerRimMat) {
        const innerPulse = Math.sin(t * 2.6) * 0.18;
        innerRimMat.color.copy(curColor);
        const targetInner = isCenter ? 0.75 + innerPulse : isNeighbor ? 0.50 + innerPulse * 0.6 : 0.15;
        innerRimMat.opacity = THREE.MathUtils.lerp(innerRimMat.opacity, targetInner, 0.08);
      }

      // Dynamically pulse light intensities and update colors
      if (ringLight) {
        ringLight.color.copy(curColor);
        const targetLight = isCenter ? 3.6 + 0.6 * Math.sin(t * 2.8) : isNeighbor ? 2.0 : 0.5;
        ringLight.intensity = THREE.MathUtils.lerp(ringLight.intensity, targetLight, 0.08);
      }

      if (platformLight) {
        platformLight.color.copy(curColor);
        const targetPlatform = isCenter ? 2.4 + 0.4 * Math.sin(t * 2.4) : isNeighbor ? 1.4 : 0.35;
        platformLight.intensity = THREE.MathUtils.lerp(platformLight.intensity, targetPlatform, 0.08);
      }

      if (warmKick) {
        warmKick.color.copy(curColor);
      }

      // Perimeter LED dots
      if (dotMat) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 2.2);
        const mult = isCenter ? pulse : isNeighbor ? 0.75 : 0.3;
        const r = (parseInt(colorHex.slice(1, 3), 16) / 255) * mult;
        const g = (parseInt(colorHex.slice(3, 5), 16) / 255) * mult;
        const b = (parseInt(colorHex.slice(5, 7), 16) / 255) * mult;
        dotMat.color.setRGB(r, g, b);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-[360px] h-[220px] flex items-center justify-center pointer-events-none select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block filter drop-shadow-[0_12px_35px_rgba(0,0,0,0.9)]"
      />
    </div>
  );
};
