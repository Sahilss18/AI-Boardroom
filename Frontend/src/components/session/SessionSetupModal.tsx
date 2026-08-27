import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DocumentUploadStep } from './DocumentUploadStep';
import { AgentCountStep } from './AgentCountStep';
import { PersonaSelectStep } from './PersonaSelectStep';
import { IntensityStep } from './IntensityStep';
import { SessionSummaryStep } from './SessionSummaryStep';
import { ApiService, type DocumentParseResult } from '../../services/api';

interface SessionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionReady: (sessionId: number, selectedPersonaIds: string[], documentFile: File | null) => void;
}

export const SessionSetupModal: React.FC<SessionSetupModalProps> = ({
  isOpen,
  onClose,
  onSessionReady,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Session State
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<DocumentParseResult | null>(null);
  const [agentCount, setAgentCount] = useState<number>(3);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([
    'cto',
    'cfo',
    'business-analyst',
  ]);
  const [intensity, setIntensity] = useState<'CALM' | 'STANDARD' | 'AGGRESSIVE' | 'ADVERSARIAL'>('STANDARD');

  // Initialization State
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStage, setInitStage] = useState('');
  const [initError, setInitError] = useState<string | null>(null);

  // Toggle Persona Selection
  const handleTogglePersona = (agentId: string) => {
    setSelectedPersonaIds((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      } else {
        if (prev.length < agentCount) {
          return [...prev, agentId];
        }
        return prev;
      }
    });
  };

  // Adjust count & slice persona array if necessary
  const handleAgentCountChange = (count: number) => {
    setAgentCount(count);
    if (selectedPersonaIds.length > count) {
      setSelectedPersonaIds((prev) => prev.slice(0, count));
    }
  };

  // Step Navigation Validation
  const canProceed = () => {
    if (currentStep === 3 && selectedPersonaIds.length !== agentCount) {
      return false;
    }
    return true;
  };

  // Backend Initialization Call
  const handleInitialize = async () => {
    setIsInitializing(true);
    setInitError(null);

    try {
      setInitStage('Allocating adversarial boardroom space in Redis...');
      const session = await ApiService.createSession({
        title: documentFile ? `Review: ${documentFile.name}` : 'Live Pitch Simulation',
        description: 'Interactive adversarial boardroom turn-by-turn simulation.',
        document_text: parseResult?.parsed_text || '',
        active_persona_ids: selectedPersonaIds,
        mode: 'adversarial',
        max_duration_seconds: 1200,
        tts_voice: 'en-US-Standard-C',
      });

      if (documentFile) {
        setInitStage('Generating vector embeddings in Qdrant & building knowledge graph...');
        await ApiService.uploadDocument(session.id, documentFile);
      }

      setInitStage('Electing initial active speaker via LangGraph...');
      setTimeout(() => {
        setIsInitializing(false);
        onSessionReady(session.id, selectedPersonaIds, documentFile);
      }, 700);

    } catch (err: any) {
      console.error('Session initialization error:', err);
      setInitError(err?.message || 'Failed to initialize session. Is the backend server running on port 3000?');
      setIsInitializing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#040711]/75 backdrop-blur-2xl overflow-y-auto select-none">
      
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 cyber-grid-overlay pointer-events-none opacity-20" />
      
      {/* Large Blurred Cyan Light Source (Left) */}
      <div className="absolute top-1/2 left-[12%] -translate-y-1/2 w-[650px] h-[500px] bg-cyan-500/[0.12] rounded-full blur-[170px] pointer-events-none" />
      
      {/* Soft Indigo/Violet Light Source (Right) */}
      <div className="absolute top-1/2 right-[12%] -translate-y-1/2 w-[600px] h-[480px] bg-indigo-500/[0.09] rounded-full blur-[170px] pointer-events-none" />

      {/* Main Liquid-Glass Modal Window (Fixed Uniform Size Across All Steps) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl h-[600px] sm:h-[620px] max-h-[92vh] rounded-[28px] bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#050813]/96 border border-cyan-500/25 hover:border-cyan-400/40 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col my-auto transition-colors duration-500"
      >
        {/* Top Inner Specular Light Edge */}
        <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-20" />

        {/* Organic Liquid-Glass Glow Aura at Bottom-Left */}
        <div 
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-[65px] pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle at 35% 65%, #00f0ff 0%, transparent 70%)' }}
        />

        {/* Fluid Cyan Bottom Rim Line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-35 bg-gradient-to-r from-cyan-500/80 via-cyan-400/20 to-transparent pointer-events-none z-20" />

        {/* AI System-Status Header Bar (Fixed Header) */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/30 backdrop-blur-xl relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_10px_#00f0ff]" />
            <span
              style={{ fontFamily: "'Michroma', sans-serif" }}
              className="text-[11px] sm:text-xs font-bold text-white tracking-[0.12em] uppercase opacity-95"
            >
              SESSION CONFIGURATION // STEP 0{currentStep} OF 0{totalSteps}
            </span>
          </div>

          {/* Minimal Futuristic Close Button */}
          <button
            onClick={onClose}
            aria-label="Close setup modal"
            className="w-8 h-8 rounded-full border border-white/10 hover:border-cyan-400/40 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thin Luminous Liquid Progress Bar */}
        <div className="w-full bg-slate-950/80 h-[2px] relative z-10 overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-500 shadow-[0_0_14px_rgba(0,240,255,0.9)] transition-all duration-400 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Body Content (Scrollable Uniform Body Area) */}
        <div className="p-6 sm:p-7 flex-1 min-h-0 flex flex-col justify-start overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full my-auto"
              >
                <DocumentUploadStep
                  file={documentFile}
                  onFileSelect={(f, res) => {
                    setDocumentFile(f);
                    setParseResult(res);
                  }}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full my-auto"
              >
                <AgentCountStep
                  agentCount={agentCount}
                  onCountChange={handleAgentCountChange}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full my-auto"
              >
                <PersonaSelectStep
                  maxCount={agentCount}
                  selectedIds={selectedPersonaIds}
                  onTogglePersona={handleTogglePersona}
                />
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full my-auto"
              >
                <IntensityStep
                  intensity={intensity}
                  onIntensityChange={setIntensity}
                />
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full my-auto"
              >
                <SessionSummaryStep
                  file={documentFile}
                  parseResult={parseResult}
                  selectedPersonaIds={selectedPersonaIds}
                  intensity={intensity}
                  isInitializing={isInitializing}
                  initStage={initStage}
                  error={initError}
                  onInitialize={handleInitialize}
                  onBack={() => setCurrentStep(4)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Locked Footer Control Bar for Steps 1 through 4 (Except Step 5) */}
        {currentStep < totalSteps && (
          <div className="px-6 py-4 border-t border-white/[0.08] bg-slate-950/70 backdrop-blur-xl flex items-center justify-between relative z-20 shrink-0">
            {/* BACK Button */}
            <button
              onClick={() => setCurrentStep((p) => Math.max(1, p - 1))}
              disabled={currentStep === 1}
              style={{ fontFamily: "'Michroma', sans-serif" }}
              className={`px-5 py-2.5 rounded-xl border text-[11px] tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer ${
                currentStep === 1
                  ? 'border-white/[0.05] text-slate-600 opacity-40 cursor-not-allowed bg-transparent'
                  : 'border-white/[0.09] hover:border-white/[0.2] bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {/* CONTINUE Button: Physical Illuminated Cyan Glass Control */}
            <button
              onClick={() => setCurrentStep((p) => Math.min(totalSteps, p + 1))}
              disabled={!canProceed()}
              style={{ fontFamily: "'Michroma', sans-serif" }}
              className={`relative px-7 py-3 rounded-xl border text-[11px] font-bold tracking-[0.1em] uppercase flex items-center gap-2.5 transition-all duration-300 cursor-pointer overflow-hidden ${
                canProceed()
                  ? 'border-cyan-300/80 bg-gradient-to-r from-neon-cyan via-cyan-400 to-sky-400 text-slate-950 shadow-[0_0_25px_rgba(0,240,255,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_rgba(0,240,255,0.8)] hover:scale-[1.03] active:scale-95'
                  : 'border-white/[0.06] bg-slate-900/40 text-slate-600 opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
              {canProceed() && (
                <div className="absolute inset-0 -translate-x-full hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700" />
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
