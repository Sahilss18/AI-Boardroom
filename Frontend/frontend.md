# AI-Boardroom Frontend Architecture & Animation Specification

> **Version:** 1.0.0  
> **Target Environment:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Three.js + Framer Motion + OGL  
> **Document Scope:** Comprehensive visual, mathematical, graphical, and animation specification for the AI-Boardroom User Interface.

---

## Table of Contents

1. [Executive Overview & Visual Philosophy](#1-executive-overview--visual-philosophy)
2. [Visual Architecture & Layer Hierarchy](#2-visual-architecture--layer-hierarchy)
3. [Layer 0: Ambient Background Shader Pipeline](#3-layer-0-ambient-background-shader-pipeline)
   - [3.1 WebGL Aurora Noise Shader (`Aurora.tsx`)](#31-webgl-aurora-noise-shader-auroratsx)
   - [3.2 3D Perspective Cyber Grid & Depth Flooring](#32-3d-perspective-cyber-grid--depth-flooring)
   - [3.3 Staggered Atmospheric Glow Nebula Spheres](#33-staggered-atmospheric-glow-nebula-spheres)
4. [Layer 1: 3D Orbital Carousel Stage & Mathematics](#4-layer-1-3d-orbital-carousel-stage--mathematics)
   - [4.1 Cylindrical Fan-Out Trigonometry](#41-cylindrical-fan-out-trigonometry)
   - [4.2 Circular Wrapping Algorithm](#42-circular-wrapping-algorithm)
   - [4.3 Depth Hierarchy, Scaling & Z-Index Allocation](#43-depth-hierarchy-scaling--z-index-allocation)
   - [4.4 Framer Motion Deceleration Physics & Clock Engine](#44-framer-motion-deceleration-physics--clock-engine)
5. [Layer 2: 3D Hardware-Accelerated Pedestal Emitter (`Pedestal.tsx`)](#5-layer-2-3d-hardware-accelerated-pedestal-emitter-pedestaltsx)
   - [5.1 Three.js WebGL Rendering Pipeline & Cinematic Camera](#51-threejs-webgl-rendering-pipeline--cinematic-camera)
   - [5.2 PBR Materials & Procedural HUD Canvas Disc Substrates](#52-pbr-materials--procedural-hud-canvas-disc-substrates)
   - [5.3 Optical Transmission & Glass Refraction Engine](#53-optical-transmission--glass-refraction-engine)
   - [5.4 Multi-Layered Bloom Rings & Dynamic Point Lighting](#54-multi-layered-bloom-rings--dynamic-point-lighting)
   - [5.5 Instanced LED Indicators & Render Loop Mechanics](#55-instanced-led-indicators--render-loop-mechanics)
6. [Layer 3: Holographic Projection & Particle Engine (`Hologram.tsx`)](#6-layer-3-holographic-projection--particle-engine-hologramtsx)
   - [6.1 Volumetric Spark Particle Simulation (HTML5 Canvas 2D)](#61-volumetric-spark-particle-simulation-html5-canvas-2d)
   - [6.2 Human Hologram Avatar Composition & Floating Physics](#62-human-hologram-avatar-composition--floating-physics)
   - [6.3 Optical Scanlines, Alpha Gradient Masks & HUD Brackets](#63-optical-scanlines-alpha-gradient-masks--hud-brackets)
   - [6.4 Procedural Vector HUD Data Visualizers](#64-procedural-vector-hud-data-visualizers)
7. [Layer 4: Telemetry Card & HUD Interface Animations (`AgentInfo.tsx`)](#7-layer-4-telemetry-card--hud-interface-animations-agentinfotsx)
   - [7.1 Framer Motion Spring Dynamics & Stagger Orchestration](#71-framer-motion-spring-dynamics--stagger-orchestration)
   - [7.2 Chromatic Palette Color Morphing](#72-chromatic-palette-color-morphing)
   - [7.3 Cyber Glassmorphism & Micro-Interactions](#73-cyber-glassmorphism--micro-interactions)
8. [Boardroom Agent Persona & Semantic Color Matrix](#8-boardroom-agent-persona--semantic-color-matrix)
9. [Audio-Reactive & Realtime Multi-Agent Extensions](#9-audio-reactive--realtime-multi-agent-extensions)
10. [Performance Guidelines & Lifecycle Optimization](#10-performance-guidelines--lifecycle-optimization)

---

## 1. Executive Overview & Visual Philosophy

**AI-Boardroom** is an autonomous executive simulation interface. Unlike conventional 2D flat SaaS dashboards, the AI-Boardroom frontend is built around an immersive, **cybernetic holographic chamber**.

### Key Design Pillars:
* **Volumetric Depth & 3D Spatial Presence:** Agents do not merely sit in static cards; they occupy defined 3D coordinates in space, positioned upon illuminated physical pedestals and projecting upwards as high-definition holograms.
* **Continuous Organic Micro-Motion:** Every visual element—from background aurora ribbons to glowing conduit rings, ascending plasma sparks, and floating avatar postures—features subtle, non-distracting organic motion loops.
* **Chromatic Semantic Feedback:** Colors are tightly coupled with the agent’s functional discipline (e.g., Cyan for CTO/Systems, Emerald for Business Analyst/Growth, Amber for CFO/Finance, Purple for Operations, Pink for Academia, Rose for HR).
* **Deterministic 60/120 FPS Performance:** WebGL shaders, Canvas 2D particle simulations, CSS 3D transforms, and Three.js scenes are isolated into GPU-friendly composition layers to ensure buttery-smooth navigation across high-refresh desktop monitors and mobile displays.

```
+-----------------------------------------------------------------------------------+
|                              AI-BOARDROOM VIEWPORT                                |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | [Layer 0] WebGL Simplex Aurora Shader + Cyber Grid + Perspective Floor Grid |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | [Layer 1] 3D Orbital Carousel Stage (Framer Motion Tween Cylindrical Fan)   |  |
|  |                                                                             |  |
|  |   [Left Orbiter]       ===>      [ACTIVE AGENT]     <===      [Right Orbiter]   |  |
|  |   Scale: 0.84                    Scale: 1.0                   Scale: 0.84       |  |
|  |   Opacity: 1.0                   Opacity: 1.0                 Opacity: 1.0      |  |
|  |   RotY: +27 deg                  RotY: 0 deg                  RotY: -27 deg     |  |
|  |                                                                             |  |
|  |   +-----------------------------------------------------------------------+ |  |
|  |   | [Layer 3] Hologram Avatar Cutout + Scanlines + Canvas Sparks Particle | |  |
|  |   +-----------------------------------------------------------------------+ |  |
|  |   | [Layer 2] 3D Three.js PBR Pedestal + Glass Lens + Emissive Bloom Ring | |  |
|  |   +-----------------------------------------------------------------------+ |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | [Layer 4] HUD Telemetry Specs Panel (Framer Motion Staggered Spring Cards)  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Visual Architecture & Layer Hierarchy

The rendering tree is decoupled into distinct compositing contexts:

| Layer | Component | Rendering Engine | Function |
| :--- | :--- | :--- | :--- |
| **0.1** | `Aurora.tsx` | WebGL 2.0 (`OGL`) | Fullscreen background fluid wave simulation using Simplex Noise and 3-point color stops |
| **0.2** | `Hero.tsx` | Pure CSS / SVG Masks | Dual-axis orthogonal cyber grid + `rotateX(75deg)` perspective depth floor grid |
| **0.3** | `Hero.tsx` | CSS Keyframes | Soft-blended multi-wavelength radial ambient glow nebulas with breathing pulse loops |
| **1.0** | `Carousel.tsx` | Framer Motion (3D CSS) | 3D orbital trajectory layout calculating non-linear $(X, Z, \text{rotY}, \text{scale})$ per station |
| **2.0** | `Pedestal.tsx` | WebGL (`Three.js`) | Multi-mesh mechanical projector base with PBR metals, glass refraction, animated bloom rings & LED ring |
| **3.1** | `Hologram.tsx` | HTML5 Canvas 2D | Particle emitter generating ascending plasma sparks with sinusoidal horizontal flutter |
| **3.2** | `Hologram.tsx` | Framer Motion + CSS | Projected human cutout with organic hover oscillation, vertical alpha fade mask, and scanline overlay |
| **3.3** | `Hologram.tsx` | SVG + CSS Animations | Dynamic animated cyber reticles and custom procedural vector HUD visualizations for fallback data modes |
| **4.0** | `AgentInfo.tsx` | Framer Motion Springs | Glassmorphic HUD telemetry readouts with staggered capability reveals and color-coded status badges |

---

## 3. Layer 0: Ambient Background Shader Pipeline

### 3.1 WebGL Aurora Noise Shader (`Aurora.tsx`)

The ambient background features a custom GPU fragment shader executed on a fullscreen screen-space quad using the lightweight **OGL** WebGL library.

#### Mathematical Foundation:
1. **2D Simplex Noise (`snoise`):**  
   Evaluates skewed simplex coordinates to generate high-frequency continuous pseudo-random perturbations without visible repeating artifacts:
   $$\vec{i} = \lfloor \vec{v} + (\vec{v} \cdot \vec{C}_{yy}) \rfloor$$
   $$\vec{x}_0 = \vec{v} - \vec{i} + (\vec{i} \cdot \vec{C}_{xx})$$
2. **Exponential Waveform Distortion:**  
   The noise value is modulated by user amplitude and elevated exponentially to create fluid atmospheric "sheets" of light:
   $$h = \exp\left(\text{snoise}\left(uv_x \cdot 2.0 + t \cdot 0.1, t \cdot 0.25\right) \cdot 0.5 \cdot \text{amplitude}\right)$$
   $$\text{intensity} = 0.6 \times (uv_y \cdot 2.0 - h + 0.2)$$
3. **Smoothstep Blending & Color Ramp:**  
   The resulting intensity is smoothly feathered using Hermite interpolation:
   $$\alpha = \text{smoothstep}(\text{midPoint} - \text{blend} \cdot 0.5, \, \text{midPoint} + \text{blend} \cdot 0.5, \, \text{intensity})$$
   A 3-stop RGB linear color ramp interpolates between `#00f0ff` (Cyan), `#bd00ff` (Purple), and `#00ff87` (Emerald).
4. **Alpha Compositing:**  
   Operates with premultiplied alpha:
   ```typescript
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
   ```

### 3.2 3D Perspective Cyber Grid & Depth Flooring

To establish a physical boardroom floor plane, two intersecting grid shaders are applied:

1. **Orthogonal Wall Grid (`.cyber-grid-overlay`):**
   * $50\text{px} \times 50\text{px}$ linear gradient grid with $0.03$ cyan opacity.
   * Circular radial mask: `radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)`.
2. **Projected Perspective Floor (`.grid-floor`):**
   * $60\text{px} \times 60\text{px}$ linear grid transformed into true 3D space:
     ```css
     transform: rotateX(75deg);
     transform-origin: center bottom;
     mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0));
     ```
   * Gives the visual impression of a vast illuminated glass boardroom stage extending into the horizon.

### 3.3 Staggered Atmospheric Glow Nebula Spheres

Two large out-of-phase blurred radial gradients float in the background:
* **Nebula 1 (Cyan-500/8):** Size $400\text{px}$, blur $130\text{px}$, positioned at `top: 10%, left: 10%`, animated via keyframe `pulse-glow` over a **10s cycle**.
* **Nebula 2 (Purple-500/6):** Size $450\text{px}$, blur $140\text{px}$, positioned at `top: 40%, right: 5%`, animated over a **14s cycle**.
* The co-prime duration cycle ($10\text{s}$ vs $14\text{s}$) prevents visual repetition, ensuring an ever-shifting organic light field.

---

## 4. Layer 1: 3D Orbital Carousel Stage & Mathematics

The Carousel arranges board members in an interactive cylindrical fan layout that rotates along a curved arc in virtual 3D space.

```
             [Agent -2]                       [Agent +2]
                 \                                 /
                  \                               /
               [Agent -1]                   [Agent +1]
                     \                         /
                      \                       /
                       ====== [Agent 0] ======
                            (Active Node)
```

### 4.1 Cylindrical Fan-Out Trigonometry

For any agent index $i$ relative to the active index $A$:
Let $\Delta = \text{getWrappedDiff}(i)$.

$$\theta = \Delta \times \left(\frac{\pi}{4.6}\right)$$

The spatial coordinates in 3D CSS space are calculated as follows:

$$X = \sin(\theta) \times \text{spacing} \times 1.65$$
$$Z = (1 - \cos(\theta)) \times (-\text{depthSpacing}) - (\text{isActive} \,?\, 0 : 70)$$
$$\text{rotY} = -\theta \times \left(\frac{180}{\pi}\right) \times 0.7$$

* **Desktop Spacing Constants:** $\text{spacing} = 360\text{px}$, $\text{depthSpacing} = 210\text{px}$.
* **Mobile Spacing Constants ($< 768\text{px}$):** $\text{spacing} = 220\text{px}$, $\text{depthSpacing} = 130\text{px}$.

### 4.2 Circular Wrapping Algorithm

To achieve seamless, continuous infinite rotation across an arbitrary array length $N$:

```typescript
const getWrappedDiff = (index: number) => {
  const count = AI_AGENTS.length;
  let diff = index - activeIndex;
  while (diff > count / 2) diff -= count;
  while (diff < -count / 2) diff += count;
  return diff;
};
```

This guarantees that clicking "Next" at the final array index smoothly wraps to the initial agent without abrupt visual snapping.

### 4.3 Depth Hierarchy, Scaling & Z-Index Allocation

| Relative Position ($\Delta$) | Scale Factor | Opacity | Z-Index | Visual Purpose |
| :---: | :---: | :---: | :---: | :--- |
| **$\Delta = 0$ (Center)** | `1.00` | `1.00` | `10` | Full focus; full emitter bloom, particle ignition, and HUD focus. |
| **$|\Delta| = 1$ (Immediate)** | `0.84` | `1.00` | `9` | Adjacent board members, angled inward, solid pedestal base. |
| **$|\Delta| = 2$ (Periphery)** | `0.70` | `0.95` | `8` | Distant standby stations in background orbit. |
| **$|\Delta| > 2$ (Culled)** | `0.50` | `0.00` | `0` | Out of visible field of view; prevents DOM paint overhead. |

### 4.4 Framer Motion Deceleration Physics & Clock Engine

Transitions between active boardroom members utilize a custom **60 FPS decelerating quintic-style cubic-bezier curve**:

```typescript
transition={{
  type: 'tween',
  ease: [0.16, 1, 0.3, 1], // Decelerating ease curve
  duration: 1.2,           // 1.2 seconds total trajectory
}}
```

#### Automation & User Control Loop:
* **Auto-Play Timer:** Triggers `nextAgent()` every $3000\text{ms}$.
* **Hover Interruption:** Entering the carousel bounds pauses the timer; leaving resumes it automatically.
* **Keyboard Hotkeys:**
  * `ArrowRight`: Advances carousel to the next board member.
  * `ArrowLeft`: Steps back to previous member.
  * `Spacebar`: Toggles auto-rotation play/pause state.
* **Direct Station Picking:** Clicking any visible pedestal or character immediately centers that node and resets the auto-play timer.

---

## 5. Layer 2: 3D Hardware-Accelerated Pedestal Emitter (`Pedestal.tsx`)

Every agent stands atop a dedicated Three.js mechanical projector pedestal rendered via hardware-accelerated WebGL.

```
       +---------------------------------------------+
       |   [Refractive Optical Glass Lens (0.408y)]  |
       |  +---------------------------------------+  |
       |  | [Technical HUD Top Disc Texture (0.40y)|  |
       |  +---------------------------------------+  |
       |       [Chrome Lens Collar Bevel (0.385y)]   |
       |      [Upper Dark Metallic Chassis (0.30y)]  |
       |   === [Glowing Power Conduit Ring (0.225y)] ===  <-- Emits Dynamic Point Light
       |      [Lower Dark Metallic Chassis (0.11y)]  |
       |   * * * [28 Perimeter LED Dots (0.12y)] * * * |
       +---------------------------------------------+
              [Counter-Rotating Floor Tech Grid]
```

### 5.1 Three.js WebGL Rendering Pipeline & Cinematic Camera

* **Renderer Settings:**
  * Antialiased WebGL context with transparency enabled (`alpha: true`).
  * Clamped Device Pixel Ratio: `Math.min(window.devicePixelRatio, 2)` to eliminate GPU fill-rate bottlenecks.
  * Color Pipeline: `SRGBColorSpace` with **ACES Filmic Tone Mapping** (`toneMappingExposure = 1.25`) for cinematic metallic specular rolloff.
* **Cinematic Low-Angle Camera:**
  * FOV: $34^\circ$ (tight telephoto perspective reducing wide-angle distortion).
  * Position: `x = 0, y = 1.45, z = 4.6`.
  * LookAt Target: `(0, 0.22, 0)` focusing precisely on the illuminated projector aperture.

### 5.2 PBR Materials & Procedural HUD Canvas Disc Substrates

The chassis uses Physically Based Rendering (PBR) metallic shaders:
* **Main Lower Chassis:** `MeshStandardMaterial` with `color: 0x0e1620`, `metalness: 0.90`, `roughness: 0.28`.
* **Upper Chassis Core:** `MeshStandardMaterial` with `color: 0x141e2a`, `metalness: 0.85`, `roughness: 0.24`.
* **Bevel Trim Collars:** `MeshStandardMaterial` with `color: 0x304255`, `metalness: 0.95`, `roughness: 0.15`.

#### Procedural High-Tech Disc Surface:
Instead of loading static bitmap assets, the top substrate is generated procedurally via a high-resolution 2D offscreen canvas:
* Dark obsidian radial gradient base with agent color accents.
* Fine concentric HUD grooves ($\text{lineWidth} = 1.0\text{px} - 2.5\text{px}$).
* 36 perimeter technical tick marks calculated along radial spokes:
  $$\text{radial coordinate} = \left(cx + \cos(\text{angle}) \cdot r, \, cy + \sin(\text{angle}) \cdot r\right)$$
* Rendered as an emissive map on `topDiscMat`.

### 5.3 Optical Transmission & Glass Refraction Engine

Directly above the technical disc sits a protective optical refractive lens:
```typescript
const lensMat = new THREE.MeshPhysicalMaterial({
  color: themeColor,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.75,      // Optical light passthrough
  transparent: true,
  opacity: 0.55,
  thickness: 0.25,         // Volumetric refraction depth
  clearcoat: 1.0,          // Lacquered surface finish
  clearcoatRoughness: 0.04,
});
```

### 5.4 Multi-Layered Bloom Rings & Dynamic Point Lighting

The projector integrates a 3-tier additive glow halo surrounding the power conduit:

1. **Tier 1 (Intense Inner Core):** `TorusGeometry(1.735, 0.048)` with `AdditiveBlending`, opacity $0.85$.
2. **Tier 2 (Wide Atmospheric Halo):** `TorusGeometry(1.735, 0.092)` with `AdditiveBlending`, opacity $0.65$.
3. **Tier 3 (Bevel Surface Glow Ring):** `RingGeometry(1.58, 1.95)` mounted flat on the upper bevel step.
4. **Dynamic Lighting Emitters:**
   * **Primary Conduit Point Light:** Positioned at `(0, 0.23, 0)`, pulsing dynamically between $3.6 - 4.2$ intensity.
   * **Secondary Platform Point Light:** Positioned at `(0, 0.12, 0)` illuminating the lower floor plate.

### 5.5 Instanced LED Indicators & Render Loop Mechanics

* **28-Point Perimeter LED Array:** Rendered using `THREE.InstancedMesh` with dynamic transform matrices translated around the lower chassis rim:
  $$x = \cos\left(\frac{2\pi i}{28}\right) \times 1.96, \quad z = \sin\left(\frac{2\pi i}{28}\right) \times 1.96, \quad y = 0.12$$
* **Dynamic Color & Intensity Interpolation:** In the `animate()` loop, colors and opacities smoothly interpolate using linear interpolation:
  $$\text{val}_{\text{current}} = \text{lerp}\left(\text{val}_{\text{current}}, \, \text{val}_{\text{target}}, \, 0.08\right)$$
  This guarantees that as carousel items rotate, the lighting reacts without abrupt color flickering.

---

## 6. Layer 3: Holographic Projection & Particle Engine (`Hologram.tsx`)

Each agent’s upper representation floats in the air above the emitter aperture.

```
       +---------------------------------------------+
       | [HUD Corner Bracket]   ^    [HUD Corner Bracket] |
       |                        |                         |
       |              (Floating Avatar Cutout)            |
       |              - Brightness: 1.18x                 |
       |              - Dual Drop-Shadow Glow             |
       |              - Sine Hover: y=[-4px, 4px]         |
       |              - Horizontal Scanline Overlay       |
       |                                                  |
       |         *  .   * (Ascending Sparks)  .  *        |
       |            .  *   Canvas 2D Particles            |
       |                                                  |
       | [HUD Corner Bracket]   v    [HUD Corner Bracket] |
       +---------------------------------------------+
```

### 6.1 Volumetric Spark Particle Simulation (HTML5 Canvas 2D)

A dedicated, high-resolution Canvas 2D engine sits behind the character cutout, generating ascending plasma sparks.

#### Particle Structure:
```typescript
interface Particle {
  x: number;       // Horizontal coordinate
  y: number;       // Vertical coordinate
  vx: number;      // Horizontal velocity drift
  vy: number;      // Ascending vertical velocity (-0.6 to -1.8)
  size: number;    // Particle radius (0.8px to 2.4px)
  alpha: number;   // Base opacity
  life: number;    // Elapsed frames
  maxLife: number; // Maximum frame lifespan (50 - 110 frames)
}
```

#### Trajectory & Flutter Math:
During each frame:
$$y_{t+1} = y_t + v_y$$
$$x_{t+1} = x_t + v_x + \sin(\text{life} \times 0.06) \times 0.15$$
$$\alpha_{\text{current}} = \alpha_{\text{base}} \times \left(1 - \frac{\text{life}}{\text{maxLife}}\right) \times (\text{isActive} \,?\, 1.0 : 0.2)$$

When a particle exceeds `maxLife` or ascends past $15\%$ of canvas height, it is recycled to the emitter surface ($y = 85\%$).

### 6.2 Human Hologram Avatar Composition & Floating Physics

* **Organic Floating Motion:** The projected character oscillates smoothly along the vertical and rotational axes:
  ```typescript
  animate={{
    y: isActive ? [-4, 4, -4] : [0, 0, 0],
    rotate: isActive ? [-0.5, 0.5, -0.5] : [0, 0, 0],
  }}
  transition={{
    duration: 4.5,
    repeat: Infinity,
    ease: 'easeInOut',
  }}
  ```
* **Chromatic Radiance & Atmospheric Glow:**
  * Active Center: `filter: drop-shadow(0 0 18px ${agent.hex}cc) drop-shadow(0 0 30px ${agent.hex}55) brightness(1.18) contrast(1.05)`
  * Adjacent Member: `drop-shadow(0 0 14px ${agent.hex}aa) drop-shadow(0 0 20px ${agent.hex}44) brightness(0.96)`
  * Distant Standby: `drop-shadow(0 0 6px ${agent.hex}44) brightness(0.62) opacity(0.35)`

### 6.3 Optical Scanlines, Alpha Gradient Masks & HUD Brackets

* **Bottom Fade Hologram Alpha Mask:**  
  The character cutout does not hit the pedestal with a harsh cut; it dissolves smoothly into the light beam:
  ```css
  mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.95) 4%, black 10%);
  -webkit-mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.95) 4%, black 10%);
  ```
* **Subtle Scanline Interlacing:**  
  An overlaid CSS repeating linear gradient mimics cathode-ray / volumetric laser reconstruction:
  ```css
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    var(--agent-hex-40) 3px,
    var(--agent-hex-40) 4px
  );
  mix-blend-mode: overlay;
  opacity: 0.30;
  ```
* **Corner HUD Reticle Brackets:**  
  Four $3.5\text{px} \times 3.5\text{px}$ L-shaped neon border accents frame the projection chamber corners, establishing a precision military-grade HUD boundary.

### 6.4 Procedural Vector HUD Data Visualizers

If an image is absent or data mode is toggled, an animated SVG telemetry visualizer renders in place of the avatar:

| Icon Type | Visual Architecture | Animation Behavior |
| :--- | :--- | :--- |
| **`chart`** (BA) | 4-bar dynamic growth histogram with trend polyline | Continuous ping indicator at trend apex |
| **`matrix`** (CTO/TI) | 3-tier isometric layered system architecture grid | Continuous `animate-bob` vertical oscillation |
| **`flow`** (CFO) | Multi-node directed DAG ledger graph with dashed routes | Pulsing hub node and animated data transfers |
| **`radar`** (Manager) | Concentric target circles with sweeping radar cone | $360^\circ$ continuous sweep rotation ($8\text{s}$ cycle) |
| **`atom`** (Educator) | Multi-orbital conceptual knowledge graph | Sine-wave breathing pulse of interconnected nodes |
| **`waves`** (HR) | Harmonic vocal frequency spectrogram rings | Animated acoustic dispersion ripples |

---

## 7. Layer 4: Telemetry Card & HUD Interface Animations (`AgentInfo.tsx`)

Directly beneath the 3D stage sits the active agent's live telemetry card.

```
+-------------------------------------------------------------------------+
| [Core Module Online]                              ID: AGENT_CTO [0.02s] |
|                                                                         |
| CHIEF TECHNOLOGY OFFICER                                                |
| SYSTEM ARCHITECTURE & DEVOPS                                            |
| ----------------------------------------------------------------------- |
| Designs enterprise system architectures, conducts automated security    |
| audits, and orchestrates containerized cloud pipelines.                 |
|                                                                         |
| NEURAL SUB-PROCESSORS:                                                  |
|  [v] Multi-cloud infrastructure design                                  |
|  [v] Real-time code and security auditing                               |
|  [v] Automated scalability forecasting                                  |
| ----------------------------------------------------------------------- |
| [⚡] SYNAPSE SPEED: 4.8 TB/S                           LATENCY: < 0.2ms |
+-------------------------------------------------------------------------+
```

### 7.1 Framer Motion Spring Dynamics & Stagger Orchestration

When the active index changes, `<AnimatePresence mode="wait">` unmounts the previous card and instantiates the new telemetry readout.

#### Stagger Configuration:
```typescript
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: 'easeOut',
      staggerChildren: 0.1 // Staggers sub-processor checklist items
    } 
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: { duration: 0.3, ease: 'easeIn' } 
  }
};
```

### 7.2 Chromatic Palette Color Morphing

The card dynamically binds to the agent’s theme dictionary:
* **Background ambient glow:** Radial blur orb matches the agent's primary hex code.
* **Badges & Corner brackets:** Neon border and text shadow adjust instantly.
* **ShieldCheck icons:** Tinted with `filter: drop-shadow(0 0 4px currentColor)`.

### 7.3 Cyber Glassmorphism & Micro-Interactions

* **Glass Substrate:** `bg-slate-950/75` with `backdrop-blur-md` and `border-neon-cyan/30`.
* **Micro-Grid Overlay:** $16\text{px} \times 16\text{px}$ internal grid with $0.01$ white line opacity.
* **Interactive Light Shimmer:** Control buttons (`Connect Node`, station selectors) feature an absolute-positioned diagonal linear gradient that sweeps across on hover:
  ```css
  .shimmer-sweep {
    transform: translateX(-100%);
    transition: transform 1000ms ease;
  }
  .group:hover .shimmer-sweep {
    transform: translateX(100%);
  }
  ```

---

## 8. Boardroom Agent Persona & Semantic Color Matrix

The AI-Boardroom frontend features a specialized spectrum of cognitive cores:

| Persona | Short ID | Theme Color | Hex Code | Icon Type | Domain Focus |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Business Analyst** | `BA` | Emerald | `#00ff87` | `chart` | Predictive Forecasting, SWOT Risk Modeling, Market Roadmaps |
| **Chief Technology Officer** | `CTO` | Cyan | `#00f0ff` | `matrix` | Multi-Cloud Infrastructure, Security Auditing, Scale Diagnostics |
| **Chief Financial Officer** | `CFO` | Amber | `#ff9f00` | `flow` | Algorithmic Budget Allocation, Real-time Ledger Verification |
| **Operations Manager** | `MGR` | Purple | `#bd00ff` | `radar` | Dependency Graphing, Sprint Velocity, Bottleneck Tracking |
| **Academic Educator** | `EDU` | Pink | `#ff007a` | `atom` | Adaptive Knowledge Graphs, First-Principles Conceptual Tutoring |
| **Talent Assessor / HR** | `HR` | Rose | `#ff2a5f` | `waves` | Semantic Sentiment Profiling, Behavioral Quality Evaluation |
| **Technical Interviewer** | `TI` | Cyan | `#00f0ff` | `matrix` | AST Code Analysis, Full-Stack Architecture & System Assessment |

---

## 9. Audio-Reactive & Realtime Multi-Agent Extensions

As the AI-Boardroom connects to the backend WebSocket runtime (`apps/server` and `docs/REALTIME.md`), the frontend animation architecture is prepared for the following real-time extensions:

```
[WebSocket Event] ---> [Audio Stream / Turn State]
                                |
       +------------------------+------------------------+
       v                                                 v
[Speaking State Animation]                     [Audio-Reactive FFT Pulse]
- Active agent pedestal elevation (+15px)      - Canvas particle count x2.5
- Concentric audio shockwaves from lens        - Pedestal PointLight intensity linked to volume
- Inactive agents dim to 0.40 opacity          - Hologram scanline speed increases with pitch
```

### 1. Web Audio API Frequency Analysis:
* An `AudioContext` and `AnalyserNode` analyze real-time TTS audio streams from the backend.
* The root-mean-square (RMS) volume dynamically scales:
  * **Pedestal Ring Light Intensity:** Scaled from $3.6$ base up to $6.0$ during loud phonemes.
  * **Canvas Particle Emission Rate:** Emitter frequency spikes from 35 particles to 80 particles during speech.
  * **Avatar Scale Vibration:** Micro-scale modulation between $1.00$ and $1.02$.

### 2. Multi-Agent Turn-Taking & Debate Confrontation:
* When an agent challenges another (e.g., CTO challenging BA market scalability):
  * The stage track shifts focus between the two debating pedestals.
  * An animated neon laser connector links both projector apertures.
  * Pulsing alert halos trigger on the challenging node.

---

## 10. Performance Guidelines & Lifecycle Optimization

To sustain constant 60 FPS on lower-end devices and 120 FPS on ProMotion displays:

1. **GPU Layer Promotion:**
   * Heavy 3D elements use `transform: translate3d(...)` and `willChange: transform, opacity`.
   * `backfaceVisibility: hidden` is enforced on all carousel cards to avoid double-sided rasterization.
2. **Context & Memory Disposal:**
   * Every Three.js canvas in `Pedestal.tsx` registers strict cleanup callbacks in `useEffect`:
     ```typescript
     return () => {
       cancelAnimationFrame(animationId);
       renderer.dispose();
       scene.clear();
     };
     ```
   * OGL WebGL context in `Aurora.tsx` calls `WEBGL_lose_context.loseContext()` upon unmounting.
3. **Mobile Culling & Viewport Optimization:**
   * On viewports $< 768\text{px}$, carousel nodes with $|\Delta| > 1$ are completely omitted from the React render tree, reducing simultaneous Three.js WebGL instances from 7 down to 3.
   * DPR is strictly capped at `2.0` on ultra-high-resolution 4K and Retina screens to preserve fill rate.

---

*Authored for the AI-Boardroom Core Team. Maintained under the Saturday Motive repository.*
