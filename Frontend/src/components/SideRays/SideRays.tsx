import React, { useRef, useEffect } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';
import './SideRays.css';

export interface SideRaysProps {
  speed?: number;
  rayColor1?: string;
  rayColor2?: string;
  intensity?: number;
  spread?: number;
  origin?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  tilt?: number;
  saturation?: number;
  blend?: number;
  falloff?: number;
  opacity?: number;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const originToFlip = (origin: string): [number, number] => {
  switch (origin) {
    case 'top-left': return [1, 0];
    case 'bottom-right': return [0, 1];
    case 'bottom-left': return [1, 1];
    default: return [0, 0];
  }
};

export const SideRays: React.FC<SideRaysProps> = ({
  speed = 2.0,
  rayColor1 = '#EAB308',
  rayColor2 = '#96c8ff',
  intensity = 2.05,
  spread = 2.5,
  origin = 'top-right',
  tilt = 5,
  saturation = 1.4,
  blend = 0.62,
  falloff = 1.35,
  opacity = 0.80,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const uniformsRef = useRef<any>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }

    const initializeWebGL = async () => {
      if (!containerRef.current) return;

      await new Promise(resolve => setTimeout(resolve, 10));

      if (!containerRef.current) return;

      const renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio, 2),
        alpha: true
      });
      rendererRef.current = renderer;

      const gl = renderer.gl;
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';
      gl.canvas.style.display = 'block';
      gl.canvas.style.pointerEvents = 'none';

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(gl.canvas);

      const vert = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

      const frag = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;

// Smooth, clean ray beam with dynamic width and shimmer
float rayBeam(vec2 raySource, vec2 rayRefDirection, vec2 coord, float beamWidth, float timeOffset) {
  vec2 sourceToCoord = coord - raySource;
  float dist = length(sourceToCoord);
  if (dist < 1.0) return 0.0;
  
  vec2 dir = sourceToCoord / dist;
  float cosAngle = dot(dir, rayRefDirection);
  if (cosAngle <= 0.0) return 0.0;
  
  // Dynamic breathing & shimmer
  float shimmer = 0.82 + 0.18 * sin(iTime * iSpeed * 1.4 + timeOffset);
  
  // Dynamic beam width breathing
  float dynWidth = beamWidth + sin(iTime * iSpeed * 0.75 + timeOffset * 1.5) * 4.5;
  
  float beam = pow(cosAngle, max(12.0, dynWidth)) * shimmer;
  return smoothstep(0.01, 0.95, beam);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  
  // Corner light source position
  vec2 rayPos = vec2(iResolution.x * 1.02, -0.04 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float spread = iSpread * 0.22;
  
  // Dynamic sweeping angular motion so the light beams sway, sweep, and drift actively
  float t = iTime * iSpeed;
  float angleOffset1 = sin(t * 0.65 + 0.0) * 0.16 + cos(t * 0.32 + 1.2) * 0.07;
  float angleOffset2 = cos(t * 0.52 + 2.1) * 0.18 + sin(t * 0.25 + 0.4) * 0.08;
  float angleOffset3 = sin(t * 0.78 + 4.3) * 0.15 + cos(t * 0.38 + 2.7) * 0.08;
  
  // 3 Distinct, silky-smooth light shafts swaying naturally into the scene
  vec2 dir1 = normalize(vec2(cos(2.98 - spread * 0.35 + angleOffset1), sin(2.98 - spread * 0.35 + angleOffset1)));
  vec2 dir2 = normalize(vec2(cos(2.48 + angleOffset2), sin(2.48 + angleOffset2)));
  vec2 dir3 = normalize(vec2(cos(1.98 + spread * 0.45 + angleOffset3), sin(1.98 + spread * 0.45 + angleOffset3)));

  float b1 = rayBeam(rayPos, dir1, tiltedCoord, 24.0, 0.0);
  float b2 = rayBeam(rayPos, dir2, tiltedCoord, 18.0, 2.1);
  float b3 = rayBeam(rayPos, dir3, tiltedCoord, 22.0, 4.3);

  vec3 col1 = iRayColor1 * b1;
  vec3 col2 = iRayColor2 * b2;
  vec3 col3 = mix(iRayColor1, iRayColor2, 0.5) * b3;

  vec3 color = mix(col1, col2, iBlend) + col3 * 0.6;

  // Clean radial distance falloff - decays smoothly to zero so background stays crystal clear
  float dist = length(coord - rayPos) / max(iResolution.x, iResolution.y);
  float falloff = exp(-dist * iFalloff * 2.2);
  color *= falloff * iIntensity;

  // Corner origin bloom for radiant light source in top corners
  float cornerBloom = exp(-dist * 5.0) * 0.3 * iIntensity;
  color += mix(iRayColor1, iRayColor2, 0.5) * cornerBloom;

  // Saturation tuning
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(gray), color, iSaturation);

  // High-precision dithering to eliminate 8-bit banding rings on dark backgrounds
  float dither = (fract(sin(dot(fragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * (1.0 / 255.0);
  color = max(vec3(0.0), color + dither);

  // Crisp alpha with rich vibrant peak opacity
  float alpha = clamp(max(color.r, max(color.g, color.b)) * iOpacity, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}`;

      const [flipX, flipY] = originToFlip(origin);
      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        iSpeed: { value: speed },
        iRayColor1: { value: hexToRgb(rayColor1) },
        iRayColor2: { value: hexToRgb(rayColor2) },
        iIntensity: { value: intensity },
        iSpread: { value: spread },
        iFlipX: { value: flipX },
        iFlipY: { value: flipY },
        iTilt: { value: tilt },
        iSaturation: { value: saturation },
        iBlend: { value: blend },
        iFalloff: { value: falloff },
        iOpacity: { value: opacity }
      };
      uniformsRef.current = uniforms;

      const geometry = new Triangle(gl);
      const program = new Program(gl, { vertex: vert, fragment: frag, uniforms });
      const mesh = new Mesh(gl, { geometry, program });
      meshRef.current = mesh;

      const updateSize = () => {
        if (!containerRef.current || !renderer) return;
        renderer.dpr = Math.min(window.devicePixelRatio, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        uniforms.iResolution.value = [w * renderer.dpr, h * renderer.dpr];
      };

      const loop = (t: number) => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) return;
        uniforms.iTime.value = t * 0.001;
        try {
          renderer.render({ scene: mesh });
          animationIdRef.current = requestAnimationFrame(loop);
        } catch (e) {
          return;
        }
      };

      window.addEventListener('resize', updateSize);
      updateSize();
      animationIdRef.current = requestAnimationFrame(loop);

      cleanupFunctionRef.current = () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
        window.removeEventListener('resize', updateSize);
        if (renderer) {
          try {
            const loseCtx = renderer.gl.getExtension('WEBGL_lose_context');
            if (loseCtx) loseCtx.loseContext();
            const canvas = renderer.gl.canvas;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
          } catch (e) {}
        }
        rendererRef.current = null;
        uniformsRef.current = null;
        meshRef.current = null;
      };
    };

    initializeWebGL();

    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
    };
  }, [speed, rayColor1, rayColor2, intensity, spread, origin, tilt, saturation, blend, falloff, opacity]);

  useEffect(() => {
    if (!uniformsRef.current) return;
    const u = uniformsRef.current;
    u.iSpeed.value = speed;
    u.iRayColor1.value = hexToRgb(rayColor1);
    u.iRayColor2.value = hexToRgb(rayColor2);
    u.iIntensity.value = intensity;
    u.iSpread.value = spread;
    const [flipX, flipY] = originToFlip(origin);
    u.iFlipX.value = flipX;
    u.iFlipY.value = flipY;
    u.iTilt.value = tilt;
    u.iSaturation.value = saturation;
    u.iBlend.value = blend;
    u.iFalloff.value = falloff;
    u.iOpacity.value = opacity;
  }, [speed, rayColor1, rayColor2, intensity, spread, origin, tilt, saturation, blend, falloff, opacity]);

  return <div ref={containerRef} className={`side-rays-container ${className}`.trim()} />;
};

export default SideRays;
