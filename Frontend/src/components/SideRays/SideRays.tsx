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

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.38 + 0.18 * sin(cosAngle * seedA + iTime * speed)) +
    (0.28 + 0.18 * cos(-cosAngle * seedB + iTime * speed * 0.8)),
    0.0, 1.0) *
    smoothstep(-0.2, 0.95, cosAngle);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  
  // Light source placed at top-right corner
  vec2 rayPos = vec2(iResolution.x * 1.02, -0.05 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float spreadAngle = iSpread * 0.35;
  
  // Ray 1: Streaks across the top towards top-left (~170 deg)
  vec2 rayRefDir1 = normalize(vec2(cos(3.0 - spreadAngle * 0.3), sin(3.0 - spreadAngle * 0.3)));
  
  // Ray 2: Streaks across upper-middle towards center-left (~140 deg)
  vec2 rayRefDir2 = normalize(vec2(cos(2.4), sin(2.4)));
  
  // Ray 3: Streaks downwards-left (~105 deg)
  vec2 rayRefDir3 = normalize(vec2(cos(1.85 + spreadAngle * 0.4), sin(1.85 + spreadAngle * 0.4)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 34.2, 21.1, iSpeed * 0.9);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.4, 18.0, iSpeed * 0.7);
  vec4 rays3 = vec4(mix(iRayColor1, iRayColor2, 0.45), 1.0) * rayStrength(rayPos, rayRefDir3, tiltedCoord, 28.5, 14.8, iSpeed * 0.5);

  vec4 color = rays1 * (1.0 - iBlend) + rays2 * iBlend + rays3 * 0.35;

  // Normalized distance from light source
  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / max(iResolution.x, iResolution.y);
  
  // Soft, subtle brightness curve
  float brightness = (iIntensity * 0.70) / (1.0 + pow(distanceToLight * 2.0, iFalloff));
  color.rgb *= brightness;

  // Saturation tuning
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  // Soft blend opacity
  color.a = clamp(max(color.r, max(color.g, color.b)) * iOpacity, 0.0, 0.70);
  gl_FragColor = color;
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
