import React, { useState } from 'react';
import { Navbar } from './components/landing/Navbar';
import { HeroSection } from './components/landing/HeroSection';
import { WhatIsSection } from './components/landing/WhatIsSection';
import { BoardroomRevealSection } from './components/landing/BoardroomRevealSection';
import { IntelligenceFlowSection } from './components/landing/IntelligenceFlowSection';
import { BenefitsSection } from './components/landing/BenefitsSection';
import { MarketGapSection } from './components/landing/MarketGapSection';
import { FinalCTASection } from './components/landing/FinalCTASection';
import { Footer } from './components/landing/Footer';
import { SessionSetupModal } from './components/session/SessionSetupModal';
import { LiveBoardroomView } from './components/boardroom/LiveBoardroomView';
import SideRays from './components/SideRays/SideRays';

interface ActiveSessionData {
  sessionId: number;
  selectedPersonaIds: string[];
  documentFile: File | null;
}

const SESSION_STORAGE_KEY = 'reflection_ai_active_session';

export const App: React.FC = () => {
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  
  // Persistent active session state across browser reloads
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.sessionId && parsed.selectedPersonaIds) {
          return {
            sessionId: parsed.sessionId,
            selectedPersonaIds: parsed.selectedPersonaIds,
            documentFile: parsed.fileName ? ({ name: parsed.fileName } as File) : null,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to restore active session from localStorage:', e);
    }
    return null;
  });

  // Handle Session Initialization from Wizard
  const handleSessionReady = (
    sessionId: number,
    selectedPersonaIds: string[],
    documentFile: File | null
  ) => {
    const sessionData: ActiveSessionData = {
      sessionId,
      selectedPersonaIds,
      documentFile,
    };
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          sessionId,
          selectedPersonaIds,
          fileName: documentFile?.name || null,
        })
      );
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e);
    }
    setIsSetupModalOpen(false);
    setActiveSession(sessionData);
  };

  // Clean Exit from Boardroom Simulation
  const handleExitSession = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear session from localStorage:', e);
    }
    setActiveSession(null);
  };

  // If in Live Boardroom Simulation View
  if (activeSession) {
    return (
      <LiveBoardroomView
        sessionId={activeSession.sessionId}
        selectedPersonaIds={activeSession.selectedPersonaIds}
        documentFile={activeSession.documentFile}
        onExit={handleExitSession}
      />
    );
  }

  // Cinematic Landing Page Experience with Fixed Viewport Light Rays Background
  return (
    <div className="w-full min-h-screen bg-obsidian text-slate-100 flex flex-col overflow-x-hidden selection:bg-neon-cyan/30 selection:text-neon-cyan relative">
      
      {/* Fixed Fullscreen Background WebGL SideRays (Dual Top-Right & Top-Left Light Sources) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-Right Neon Cyan / Sky Blue Light Ray Source */}
        <SideRays
          speed={1.5}
          rayColor1="#00f0ff"
          rayColor2="#38bdf8"
          intensity={1.65}
          spread={2.0}
          origin="top-right"
          tilt={3}
          saturation={1.05}
          blend={0.5}
          falloff={1.2}
          opacity={0.68}
        />

        {/* Top-Left Warm Amber / Gold Light Ray Source */}
        <SideRays
          speed={1.5}
          rayColor1="#F59E0B"
          rayColor2="#fbbf24"
          intensity={1.65}
          spread={2.0}
          origin="top-left"
          tilt={3}
          saturation={1.05}
          blend={0.5}
          falloff={1.2}
          opacity={0.68}
        />
      </div>

      {/* 1. Header Navigation */}
      <Navbar onStartSimulation={() => setIsSetupModalOpen(true)} />

      {/* 2. Section 01: Hero / ReflectionAI */}
      <HeroSection
        onStartSimulation={() => setIsSetupModalOpen(true)}
        onExplore={() => {
          const el = document.getElementById('boardroom');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 3. Section 02: What is ReflectionAI? */}
      <WhatIsSection />

      {/* 4. Section 03: Enter the Boardroom (Centerpiece 3D Carousel Stage) */}
      <BoardroomRevealSection />

      {/* 5. Section 04: How the Boardroom Thinks (Decision Graph) */}
      <IntelligenceFlowSection />

      {/* 6. Section 05: Benefits / Rehearse the Pressure */}
      <BenefitsSection />

      {/* 7. Section 06: Market Gap Comparison */}
      <MarketGapSection />

      {/* 8. Section 07: Final Call to Action */}
      <FinalCTASection
        onStartSimulation={() => setIsSetupModalOpen(true)}
        onExplore={() => {
          const el = document.getElementById('boardroom');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 9. Telemetry Diagnostic Footer */}
      <Footer />

      {/* Interactive Session Setup Modal */}
      <SessionSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onSessionReady={handleSessionReady}
      />

    </div>
  );
};

export default App;
