import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Send, 
  Play, 
  User as UserIcon, 
  Briefcase, 
  Sparkles, 
  Database, 
  TrendingUp, 
  ShieldAlert,
  Loader2,
  Moon,
  MessageSquare,
  Activity,
  History,
  Info,
  ListTodo,
  CheckCircle,
  Target,
  Mic,
  MicOff,
  Volume2,
  Upload,
  FileText,
  Trash2,
  FileCheck
} from 'lucide-react';
import { SimulationWebSocketClient } from './services/websocket';
import { VoiceAudioService } from './services/voice';
import { VoiceAudioPlayer } from './services/audioPlayer';
import type { SimulationEvent } from '@reflection-ai/shared';

interface Scenario {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: string;
  configurationJson: {
    difficulty: string;
    duration_minutes: number;
    allowed_personas: string[];
  };
}

interface Persona {
  id: number;
  name: string;
  slug: string;
  role: string;
  description: string;
  voiceId: string;
}

interface Turn {
  id?: number;
  speakerType: 'user' | 'agent';
  personaId: number | null;
  text: string;
  sequenceNumber: number;
}

export default function App() {
  // Navigation states
  const [view, setView] = useState<'setup' | 'room'>('setup');

  // Metadata arrays
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Setup selections
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<number[]>([]);

  // Active Simulation states
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // Real-time status states
  const [activeSpeakerId, setActiveSpeakerId] = useState<number | null>(null);
  const [thinkingAgentIds, setThinkingAgentIds] = useState<number[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<number, string>>({});
  // Phase 5: Track each agent's concern label and satisfaction reason for display
  const [agentConcernLabels, setAgentConcernLabels] = useState<Record<number, { label: string; score: number; reason: string }>>({});

  // Debug Panel / Trace states
  const [showDebug, setShowDebug] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'objectives' | 'debug'>('objectives');
  const [latentQuestions, setLatentQuestions] = useState<any[]>([]);
  const [eventStream, setEventStream] = useState<SimulationEvent[]>([]);
  const [latestProposals, setLatestProposals] = useState<any[]>([]);
  const [latestDecision, setLatestDecision] = useState<any>(null);

  // References
  const wsClientRef = useRef<SimulationWebSocketClient | null>(null);
  const voiceServiceRef = useRef<VoiceAudioService | null>(null);
  const voicePlayerRef = useRef<VoiceAudioPlayer | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Voice States
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'IDLE' | 'LISTENING' | 'USER_SPEAKING' | 'USER_SILENCE' | 'PROCESSING' | 'AI_SPEAKING' | 'INTERRUPTED' | 'ERROR'>('IDLE');
  const [partialTranscript, setPartialTranscript] = useState('');

  // Load scenarios and personas on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [scRes, peRes] = await Promise.all([
          fetch('http://localhost:3000/api/scenarios'),
          fetch('http://localhost:3000/api/personas')
        ]);
        const scData = await scRes.json();
        const peData = await peRes.json();

        if (scData.success) setScenarios(scData.scenarios);
        if (peData.success) setPersonas(peData.personas);

        // Auto select first scenario
        if (scData.scenarios?.length > 0) {
          setSelectedScenario(scData.scenarios[0]);
        }
      } catch (err) {
        console.error('Failed to load initial metadata:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Scroll transcript to bottom on new turns
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Clean up websocket client on unmount
  useEffect(() => {
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.close();
      }
    };
  }, []);

  // Scenario selection logic updates allowed personas
  const handleSelectScenario = (sc: Scenario) => {
    setSelectedScenario(sc);
    // Auto check appropriate default personas for scenario
    const allowedSlugs = sc.configurationJson?.allowed_personas || [];
    const matched = personas
      .filter(p => allowedSlugs.includes(p.slug))
      .map(p => p.id);
    setSelectedPersonaIds(matched);
  };

  const handleTogglePersona = (id: number) => {
    if (selectedPersonaIds.includes(id)) {
      setSelectedPersonaIds(selectedPersonaIds.filter(x => x !== id));
    } else {
      setSelectedPersonaIds([...selectedPersonaIds, id]);
    }
  };

  // Document upload state
  const [uploadedDoc, setUploadedDoc] = useState<{ fileName: string; fileBase64: string; chunksCount: number; summaryText: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadStatus, setDocUploadStatus] = useState<string>('');

  const handleDocumentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    setDocUploadStatus(`Parsing ${file.name} using Docling Engine...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const res = await fetch('http://localhost:3000/api/documents/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileBase64: base64 })
          });
          const data = await res.json();
          if (data.success) {
            setUploadedDoc({
              fileName: file.name,
              fileBase64: base64,
              chunksCount: data.chunksCount,
              summaryText: data.summaryText
            });
            setDocUploadStatus(`✓ ${file.name} parsed (${data.chunksCount} chunks). Ready for LLM question generation!`);
          } else {
            alert('Failed to parse document: ' + (data.error?.message || 'Unknown error'));
          }
        } catch (err: any) {
          console.error('Doc parse error:', err);
          alert('Failed to parse document: ' + err.message);
        } finally {
          setIsUploadingDoc(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File read error:', err);
      setIsUploadingDoc(false);
    }
  };

  const handleStartSimulation = async () => {
    if (!selectedScenario || selectedPersonaIds.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          personaIds: selectedPersonaIds
        })
      });
      const data = await response.json();

      if (data.success && data.session) {
        const sId = data.session.id;
        setSessionId(sId);
        setTurns([]);
        setEventStream([]);
        setLatestProposals([]);
        setLatestDecision(null);

        // If a document was uploaded, ingest it into the session to generate document-specific questions
        if (uploadedDoc) {
          try {
            await fetch(`http://localhost:3000/api/sessions/${sId}/documents`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: uploadedDoc.fileName,
                fileBase64: uploadedDoc.fileBase64
              })
            });
          } catch (docErr) {
            console.error('Document session ingestion failed:', docErr);
          }
        }


        // Connect to WebSocket gateway
        wsClientRef.current = new SimulationWebSocketClient(
          String(sId),
          handleIncomingEvent,
          (state) => setConnectionState(state),
          (responseId, sequenceNumber, audioBuffer, isFinal, sampleRate) => {
            voicePlayerRef.current?.enqueue(responseId, sequenceNumber, audioBuffer, isFinal, sampleRate);
          }
        );
        wsClientRef.current.connect();

        voicePlayerRef.current = new VoiceAudioPlayer();

        voiceServiceRef.current = new VoiceAudioService(
          // Stream every audio chunk to server
          (pcmData) => {
            wsClientRef.current?.sendAudioChunk(pcmData);
          },
          // Browser VAD detected speech start → tell server to start buffering
          () => {
            console.log('[App] VAD: speech started → sending voice.speech.started');
            wsClientRef.current?.sendControlEvent('voice.speech.started');
            setVoiceState('USER_SPEAKING');
          },
          // Browser VAD detected speech end → tell server to stop and transcribe
          () => {
            console.log('[App] VAD: speech ended → sending voice.input.stop');
            wsClientRef.current?.sendControlEvent('voice.input.stop');
            setVoiceState('PROCESSING');
          }
        );

        
        // Fetch session details (including pre-generated questions)
        try {
          const sDetailsRes = await fetch(`http://localhost:3000/api/sessions/${sId}`);
          const sDetailsData = await sDetailsRes.json();
          if (sDetailsData.success) {
            setLatentQuestions(sDetailsData.questions || []);
            if (sDetailsData.turns && sDetailsData.turns.length > 0) {
              setTurns(sDetailsData.turns);
            }
          }
        } catch (fetchErr) {
          console.error('Failed to load session details/questions:', fetchErr);
        }
        
        setView('room');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncomingEvent = (event: SimulationEvent) => {
    // Append to debug stream
    setEventStream(prev => [event, ...prev.slice(0, 49)]);

    switch (event.type) {
      case 'voice.session.started':
        setVoiceState('LISTENING');
        break;

      case 'voice.speech.started':
        setVoiceState('USER_SPEAKING');
        voicePlayerRef.current?.flush();
        voiceServiceRef.current?.flushPlaybackQueue();
        break;

      case 'voice.transcript.partial':
        setPartialTranscript(event.payload.text);
        break;

      case 'voice.transcript.final':
        setPartialTranscript('');
        break;

      case 'voice.transcript.empty':
        setPartialTranscript('');
        setVoiceState('LISTENING');
        break;

      case 'voice.processing.started':
        setVoiceState('PROCESSING');
        break;

      case 'voice.ai.response.started':
        setVoiceState('AI_SPEAKING');
        break;

      case 'voice.ai.audio.chunk':
        // Raw audio buffer chunk is handled by the binary WebSocket callback
        break;

      case 'voice.ai.response.completed':
        setVoiceState('LISTENING');
        break;

      case 'voice.ai.response.interrupted':
        setVoiceState('INTERRUPTED');
        voicePlayerRef.current?.cancel(event.payload.responseId);
        voiceServiceRef.current?.flushPlaybackQueue();
        break;

      case 'voice.error':
        setVoiceState('ERROR');
        break;

      case 'USER_SPEECH_FINAL':
        setTurns(prev => [
          ...prev,
          {
            speakerType: 'user',
            personaId: null,
            text: event.payload.text,
            sequenceNumber: prev.length + 1
          }
        ]);
        // Set all active agents to thinking
        setThinkingAgentIds(selectedPersonaIds);
        setAgentStatuses(prev => {
          const updated = { ...prev };
          selectedPersonaIds.forEach(id => {
            updated[id] = 'OBSERVING';
          });
          return updated;
        });
        break;

      case 'SEMANTIC_ANALYSIS_STARTED':
        setAgentStatuses(prev => {
          const updated = { ...prev };
          selectedPersonaIds.forEach(id => {
            updated[id] = 'THINKING';
          });
          return updated;
        });
        break;

      case 'AGENT_PROPOSAL':
        setLatestProposals(prev => {
          const filtered = prev.filter(p => p.personaId !== event.payload.personaId);
          return [...filtered, event.payload];
        });
        setAgentStatuses(prev => ({
          ...prev,
          // Phase 5: Show the actual recommended action (FOLLOW_UP, CHALLENGE, etc.)
          [event.payload.personaId]: event.payload.recommendedAction === 'ASK_FOLLOWUP'
            ? 'FOLLOW_UP'
            : event.payload.recommendedAction === 'CHALLENGE' || event.payload.recommendedAction === 'DISAGREE'
            ? 'CHALLENGING'
            : event.payload.recommendedAction === 'REACT' || event.payload.recommendedAction === 'AGREE'
            ? 'REACTING'
            : 'PROPOSING'
        }));
        break;

      case 'AGENT_INTERNAL_MESSAGE':
        setAgentStatuses(prev => {
          const fromId = Number(event.payload.fromPersonaId);
          if (isNaN(fromId)) return prev;
          const type = event.payload.messageType;
          let newStatus = 'DELIBERATING';
          if (type === 'AGREEMENT') newStatus = 'AGREEING';
          else if (type === 'CHALLENGE' || type === 'DISAGREEMENT') newStatus = 'CHALLENGING';
          return {
            ...prev,
            [fromId]: newStatus
          };
        });
        break;

      case 'ORCHESTRATOR_DECISION':
        setLatestDecision(event.payload);
        // Turn off thinking for all except the selected speaker
        const selectedSpeaker = event.payload.selectedPersonaId;
        if (selectedSpeaker) {
          setThinkingAgentIds([selectedSpeaker]);
        } else {
          setThinkingAgentIds([]);
        }
        setAgentStatuses(prev => {
          const updated = { ...prev };
          selectedPersonaIds.forEach(id => {
            updated[id] = id === selectedSpeaker ? 'SELECTED' : 'WAITING';
          });
          return updated;
        });
        break;

      case 'RESPONSE_GENERATION_STARTED':
        setActiveSpeakerId(event.payload.personaId);
        setAgentStatuses(prev => ({
          ...prev,
          [event.payload.personaId]: 'SPEAKING'
        }));
        break;

      case 'RESPONSE_GENERATION_COMPLETED':
        setActiveSpeakerId(null);
        setThinkingAgentIds([]);
        setTurns(prev => [
          ...prev,
          {
            speakerType: 'agent',
            personaId: event.payload.personaId,
            text: event.payload.text,
            sequenceNumber: prev.length + 1
          }
        ]);
        setAgentStatuses(prev => ({
          ...prev,
          [event.payload.personaId]: 'WAITING'
        }));
        break;

      case 'QUESTION_UPDATED':
        setLatentQuestions(prev => {
          const idx = prev.findIndex(q => q.id === event.payload.questionId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              status: event.payload.status,
              satisfactionScore: Number(event.payload.score)
            };
            return updated;
          }
          return prev;
        });
        break;

      case 'QUESTION_SATISFIED':
        setLatentQuestions(prev => {
          const idx = prev.findIndex(q => q.id === event.payload.questionId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              status: 'SATISFIED',
              satisfactionScore: Number(event.payload.score || 1.0)
            };
            return updated;
          }
          return prev;
        });
        break;

      // ── PHASE 5 NEW EVENTS ───────────────────────────────────────────────

      case 'BOARDROOM_OBSERVATION' as any:
        // All agents move to OBSERVING state when global observation broadcast fires
        setAgentStatuses(prev => {
          const updated = { ...prev };
          selectedPersonaIds.forEach(id => { updated[id] = 'OBSERVING'; });
          return updated;
        });
        break;

      case 'AGENT_CONCERN_UPDATED' as any:
        // Update the concern label shown under each agent avatar
        setAgentConcernLabels(prev => ({
          ...prev,
          [event.payload.personaId]: {
            label: event.payload.concernStatus === 'SATISFIED'
              ? '✓ Satisfied'
              : event.payload.concernStatus === 'PARTIALLY_SATISFIED'
              ? `◑ ${Math.round((event.payload.satisfactionScore || 0) * 100)}% satisfied`
              : event.payload.concernStatus === 'CONTRADICTED'
              ? '⚡ Contradiction'
              : '○ Unresolved',
            score: event.payload.satisfactionScore || 0,
            reason: event.payload.satisfactionReason || ''
          }
        }));
        // If contradicted, set status to CHALLENGING
        if (event.payload.concernStatus === 'CONTRADICTED') {
          setAgentStatuses(prev => ({ ...prev, [event.payload.personaId]: 'CHALLENGING' }));
        } else if (event.payload.concernStatus === 'PARTIALLY_SATISFIED') {
          setAgentStatuses(prev => ({ ...prev, [event.payload.personaId]: 'FOLLOW_UP' }));
        }
        break;

      // ────────────────────────────────────────────────────────────────────

      case 'DOCUMENT_INGESTED' as any:
        if (event.payload?.documentName) {
          setUploadedDoc(prev => prev ? { ...prev, fileName: event.payload.documentName } : {
            fileName: event.payload.documentName,
            fileBase64: '',
            chunksCount: event.payload.questionsCount || 1,
            summaryText: 'Parsed by Docling RAG Engine'
          });
        }
        // Refetch questions to display LLM document concerns in UI
        if (sessionId) {
          fetch(`http://localhost:3000/api/sessions/${sessionId}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.questions) {
                setLatentQuestions(data.questions);
              }
            }).catch(console.error);
        }
        break;

      case 'ERROR':
        console.error('Simulation error event received:', event.payload);
        break;
      default:
        break;
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !wsClientRef.current) return;
    try {
      wsClientRef.current.sendText(inputMessage);
      setInputMessage('');
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleToggleVoiceMode = async () => {
    if (!isVoiceMode) {
      try {
        voicePlayerRef.current?.start();
        await voiceServiceRef.current?.startRecording();
        wsClientRef.current?.sendControlEvent('voice.session.start');
        setIsVoiceMode(true);
        setVoiceState('LISTENING');
      } catch (err) {
        console.error('Failed to access microphone:', err);
        alert('Microphone access denied or error occurred.');
      }
    } else {
      voiceServiceRef.current?.stopRecording();
      voiceServiceRef.current?.flushPlaybackQueue();
      voicePlayerRef.current?.flush();
      wsClientRef.current?.sendControlEvent('voice.session.stop');
      setIsVoiceMode(false);
      setVoiceState('IDLE');
      setPartialTranscript('');
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await fetch(`http://localhost:3000/api/sessions/${sessionId}/end`, { method: 'POST' });
    } catch (err) {
      console.error('End session call failed:', err);
    }

    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopRecording();
      voiceServiceRef.current.flushPlaybackQueue();
      voiceServiceRef.current = null;
    }
    if (voicePlayerRef.current) {
      voicePlayerRef.current.flush();
      voicePlayerRef.current = null;
    }
    setIsVoiceMode(false);
    setVoiceState('IDLE');

    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }

    setSessionId(null);
    setView('setup');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-white">
        <Loader2 className="w-12 h-12 text-[#00f2fe] animate-spin mb-4" />
        <h2 className="text-xl font-display font-medium tracking-wide">Loading ReflectionAi Panel...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-950 text-slate-200 flex flex-col font-sans selection:bg-teal-neon/30 relative overflow-hidden">
      {/* Dynamic Background Neon Glow Spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-neon/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-neon/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-violet-neon to-pink-neon rounded-xl shadow-lg shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg tracking-wider bg-gradient-to-r from-teal-neon via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              REFLECTION AI
            </span>
            <span className="ml-2 text-[10px] uppercase font-bold tracking-widest text-teal-neon px-2 py-0.5 bg-teal-neon/10 rounded-full border border-teal-neon/20">
              BOARDROOM v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {view === 'room' && (
            <div className="flex items-center space-x-2 bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-white/5">
              <span className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">
                {connectionState}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${showDebug ? 'bg-teal-neon/15 border-teal-neon/40 text-teal-neon' : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'}`}
            title="Toggle Dashboard Sidebar"
          >
            <Terminal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {view === 'setup' ? (
        /* SETUP PAGE */
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:py-12 flex flex-col justify-center relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight text-white mb-4 leading-tight">
              Practice with an <span className="bg-gradient-to-r from-teal-neon to-cyan-400 bg-clip-text text-transparent glow-text-primary">AI panel</span>, not an empty room.
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Define your scenario, handpick your board of expert personas, and defend your architectural choices in a stateful simulation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Scenarios (Left) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-base font-display font-bold text-white flex items-center space-x-2">
                  <Briefcase className="w-4.5 h-4.5 text-teal-neon" />
                  <span>1. Select Scenario</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map(sc => (
                  <div
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className={`glass-card p-5 cursor-pointer text-left relative overflow-hidden transition-all duration-300 ${selectedScenario?.id === sc.id ? 'border-teal-neon/60 bg-teal-neon/5 ring-1 ring-teal-neon/30' : ''}`}
                  >
                    <h4 className="font-display font-bold text-white text-base mb-1.5">{sc.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[48px]">{sc.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-widest font-extrabold bg-space-950 border border-white/5 px-2 py-1 rounded text-teal-neon">
                        {sc.type.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-extrabold bg-space-950 border border-white/5 px-2 py-1 rounded text-violet-neon">
                        {sc.configurationJson?.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personas (Right) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-base font-display font-bold text-white flex items-center space-x-2">
                  <UserIcon className="w-4.5 h-4.5 text-violet-neon" />
                  <span>2. Selected Panel ({selectedPersonaIds.length})</span>
                </h3>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {personas.map(pe => {
                  const isChecked = selectedPersonaIds.includes(pe.id);
                  const isAllowed = selectedScenario?.configurationJson?.allowed_personas.includes(pe.slug);

                  return (
                    <div
                      key={pe.id}
                      onClick={() => handleTogglePersona(pe.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${isChecked ? 'bg-violet-neon/10 border-violet-neon/40 shadow-sm shadow-violet-neon/10' : 'bg-space-900/60 border-white/5 hover:border-white/10'} ${!isAllowed ? 'opacity-40 hover:opacity-60' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg transition-colors ${isChecked ? 'bg-violet-neon/20 text-violet-neon' : 'bg-space-950 text-slate-500'}`}>
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h5 className="font-display font-bold text-white text-sm leading-none mb-1">{pe.name}</h5>
                          <p className="text-[10px] text-slate-400 font-semibold">{pe.role}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isChecked ? 'border-violet-neon bg-violet-neon text-white font-extrabold text-[10px]' : 'border-white/20 bg-transparent'}`}>
                        {isChecked && '✓'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 3: Optional Document Upload (PDF / PPTX / DOCX / TXT) */}
              <div className="pt-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                  <h3 className="text-sm font-display font-bold text-white flex items-center space-x-2">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>3. Attach Document (PDF, PPTX, DOCX)</span>
                  </h3>
                  <span className="text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                    Docling RAG & LLM
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.pptx,.docx,.txt"
                    onChange={handleDocumentFileChange}
                    className="hidden"
                    id="doc-upload-input"
                  />
                  
                  {!uploadedDoc ? (
                    <label
                      htmlFor="doc-upload-input"
                      className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${isUploadingDoc ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-white/10 hover:border-cyan-400/40 bg-space-900/40 hover:bg-space-900/80'}`}
                    >
                      {isUploadingDoc ? (
                        <div className="flex flex-col items-center space-y-2">
                          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                          <p className="text-xs text-cyan-300 font-medium animate-pulse">{docUploadStatus}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center space-y-1">
                          <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-800/30 text-cyan-400 mb-1">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-white">Click or drag PDF, PPTX, or DOCX</p>
                          <p className="text-[10px] text-slate-400">Docling parses file & LLM generates document-specific questions</p>
                        </div>
                      )}
                    </label>
                  ) : (
                    <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="truncate text-left">
                          <p className="text-xs font-bold text-white truncate">{uploadedDoc.fileName}</p>
                          <p className="text-[10px] text-cyan-300">
                            Parsed by Docling ({uploadedDoc.chunksCount} chunks). Questions ready.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUploadedDoc(null); setDocUploadStatus(''); }}
                        className="p-1.5 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                disabled={selectedPersonaIds.length === 0}
                onClick={handleStartSimulation}
                className="w-full btn-glow-primary py-4 px-6 flex items-center justify-center space-x-2 font-display text-sm md:text-base tracking-wide uppercase transition-all duration-300 relative overflow-hidden"
              >
                <Play className="w-4.5 h-4.5 fill-current" />
                <span className="font-bold">Launch Practicing Session</span>
              </button>
            </div>
          </div>
        </main>
      ) : (

        /* SIMULATION ROOM */
        <main className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Simulation grid header */}
            <div className="p-6 border-b border-white/5 bg-slate-950/30 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h2 className="text-xl font-display font-extrabold text-white">{selectedScenario?.name}</h2>
                  {uploadedDoc && (
                    <span className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-full shadow-sm shadow-cyan-500/20">
                      <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Document RAG Active: {uploadedDoc.fileName}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {uploadedDoc
                    ? `Panel is analyzing "${uploadedDoc.fileName}" using Docling RAG & generating questions on the fly based on your answers.`
                    : 'Panel consists of HR and technical representatives evaluating claims in real-time.'}
                </p>
              </div>
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-red-950/30 hover:bg-red-900/40 text-red-400 font-display font-semibold text-sm rounded-xl border border-red-900/30 transition-all"
              >
                End Session
              </button>
            </div>

            {/* Panel Avatars */}
            <div className="px-6 py-8 bg-[#0b101b] border-b border-white/5 flex justify-center gap-10 md:gap-14 overflow-x-auto">
              {personas
                .filter(p => selectedPersonaIds.includes(p.id))
                .map(p => {
                  const isSpeaking = activeSpeakerId === p.id;
                  const isThinking = thinkingAgentIds.includes(p.id);
                  const currentStatus = agentStatuses[p.id] || 'WAITING';

                  let statusText = currentStatus;
                  let ringClass = 'border-white/5 bg-slate-900';
                  let textClass = 'text-slate-500';

                  if (currentStatus === 'SPEAKING' || currentStatus === 'SELECTED') {
                    ringClass = 'speaker-active-pulse border-teal-400 bg-teal-950/20';
                    textClass = 'text-teal-400';
                  } else if (currentStatus === 'THINKING' || currentStatus === 'DELIBERATING' || currentStatus === 'PROPOSING') {
                    ringClass = 'agent-thinking-pulse border-violet-500 bg-violet-950/20';
                    textClass = 'text-violet-400';
                  } else if (currentStatus === 'AGREEING' || currentStatus === 'REACTING') {
                    ringClass = 'border-emerald-400 bg-emerald-950/20';
                    textClass = 'text-emerald-400';
                  } else if (currentStatus === 'CHALLENGING' || currentStatus === 'CONCERNED') {
                    ringClass = 'border-rose-500 bg-rose-950/20';
                    textClass = 'text-rose-500';
                  } else if (currentStatus === 'FOLLOW_UP') {
                    ringClass = 'agent-thinking-pulse border-orange-400 bg-orange-950/20';
                    textClass = 'text-orange-400';
                  } else if (currentStatus === 'OBSERVING') {
                    ringClass = 'border-amber-400 bg-amber-950/20';
                    textClass = 'text-amber-400';
                  }

                  return (
                    <div key={p.id} className="flex flex-col items-center min-w-[100px] group">
                      <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center mb-3 transition-all duration-300 relative ${ringClass}`}>
                        <UserIcon className={`w-9 h-9 ${isSpeaking ? 'text-[#00f2fe]' : isThinking ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                        {isSpeaking && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-teal-400 rounded-full border-2 border-[#090d16] flex items-center justify-center text-[8px] text-black font-extrabold">
                            🎙
                          </span>
                        )}
                      </div>
                      <span className="font-display font-bold text-sm text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium mb-1.5">{p.role}</span>
                      <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border bg-slate-900 border-white/5 ${textClass}`}>
                        {statusText === 'FOLLOW_UP' ? 'Follow Up' : statusText}
                      </span>
                      {/* Phase 5: Show concern evaluation label */}
                      {agentConcernLabels[p.id] && currentStatus !== 'SPEAKING' && currentStatus !== 'WAITING' && (
                        <span
                          className="text-[8px] text-slate-500 mt-0.5 max-w-[100px] text-center truncate"
                          title={agentConcernLabels[p.id].reason}
                        >
                          {agentConcernLabels[p.id].label}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Transcript & Message Box */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/15">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {turns.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 max-w-sm mx-auto text-center space-y-3">
                    <MessageSquare className="w-10 h-10 text-slate-600 animate-bounce" />
                    <p className="text-sm">The boardroom is quiet. Send a message to state your project profile and start the simulation.</p>
                  </div>
                ) : (
                  turns.map((t, idx) => {
                    const isUser = t.speakerType === 'user';
                    const agent = isUser ? null : personas.find(p => p.id === t.personaId);

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-full bg-violet-950/40 border border-violet-500/30 flex items-center justify-center text-violet-400">
                            <UserIcon className="w-4.5 h-4.5" />
                          </div>
                        )}
                        <div className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl ${isUser ? 'bg-gradient-to-br from-[#00f2fe]/10 to-[#4facfe]/10 border border-[#00f2fe]/30 rounded-tr-none text-right' : 'bg-[#0f172a] border border-white/5 rounded-tl-none'}`}>
                          <div className="flex items-center gap-2 mb-1 justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {isUser ? 'Candidate' : agent?.name}
                            </span>
                            <span className="text-[8px] text-slate-500 font-semibold">
                              #{t.sequenceNumber}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed text-left">{t.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/5 bg-[#0b101b]">
                {isVoiceMode && (
                  <div className="max-w-4xl mx-auto px-5 py-3.5 bg-slate-900/90 border border-teal-500/25 rounded-2xl mb-3 flex items-center justify-between gap-6 shadow-[0_0_25px_rgba(0,242,254,0.05)] transition-all">
                    <div className="flex items-center gap-3">
                      {voiceState === 'USER_SPEAKING' ? (
                        <div className="flex items-center gap-1 text-red-500 mr-1.5">
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                        </div>
                      ) : voiceState === 'AI_SPEAKING' ? (
                        <div className="flex items-center gap-1 text-[#00f2fe] mr-1.5">
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                          <span className="wave-bar"></span>
                        </div>
                      ) : voiceState === 'PROCESSING' ? (
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mr-1.5" />
                      ) : voiceState === 'LISTENING' ? (
                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse mr-1.5 shadow-[0_0_10px_#10b981]" />
                      ) : (
                        <span className="w-2.5 h-2.5 bg-slate-500 rounded-full mr-1.5" />
                      )}
                      <span className="text-xs font-bold uppercase tracking-widest font-display text-slate-300">
                        {voiceState === 'IDLE' && '🎙 Initializing VAD...'}
                        {voiceState === 'LISTENING' && '🎙 Listening...'}
                        {voiceState === 'USER_SPEAKING' && '🔴 Candidate Speaking...'}
                        {voiceState === 'PROCESSING' && '⏳ Deliberating...'}
                        {voiceState === 'AI_SPEAKING' && '🔊 Panel Speaking...'}
                        {voiceState === 'INTERRUPTED' && '↩ Interrupted'}
                        {voiceState === 'ERROR' && '❌ Error'}
                      </span>
                    </div>
                    <div className="text-xs text-teal-400 font-medium truncate flex-1 text-right italic font-display">
                      {partialTranscript ? `"${partialTranscript}"` : 'Waiting for voice input...'}
                    </div>
                  </div>
                )}
                <div className="max-w-4xl mx-auto flex items-center space-x-3 bg-slate-900/90 rounded-2xl border border-white/5 p-2 focus-within:border-[#00f2fe]/40 transition-all">
                  <button
                    onClick={handleToggleVoiceMode}
                    className={`p-3 rounded-xl transition-all flex items-center justify-center ${isVoiceMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
                    title={isVoiceMode ? "Stop voice mode" : "Start voice mode"}
                  >
                    {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isVoiceMode ? "Voice mode active. Speak or type a message..." : "Describe your design architecture, scale figures, or query choice..."}
                    className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 text-sm focus:outline-none px-3"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="p-3 bg-gradient-to-tr from-[#00f2fe] to-[#4facfe] text-black font-extrabold rounded-xl hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CANONICAL INTERACTIVE SIDEBAR */}
          <div className={`w-96 border-l border-white/5 bg-[#0b101b] flex flex-col overflow-hidden transition-all duration-300 ${showDebug ? 'translate-x-0' : 'hidden translate-x-full'}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
              <span className="font-display font-bold text-sm text-white flex items-center space-x-2">
                <Target className="w-4.5 h-4.5 text-[#00f2fe]" />
                <span>Simulation Dashboard</span>
              </span>
              <button 
                onClick={() => setShowDebug(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Hide
              </button>
            </div>

            {/* Tabs */}
            <div className="p-1.5 border-b border-white/5 bg-slate-950/40 flex items-center justify-around text-xs font-semibold">
              <button
                onClick={() => setSidebarTab('objectives')}
                className={`flex-1 py-2 text-center border-b-2 transition-all duration-200 flex items-center justify-center space-x-1.5 ${sidebarTab === 'objectives' ? 'border-[#00f2fe] text-[#00f2fe]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Objectives ({latentQuestions.length})</span>
              </button>
              <button
                onClick={() => setSidebarTab('debug')}
                className={`flex-1 py-2 text-center border-b-2 transition-all duration-200 flex items-center justify-center space-x-1.5 ${sidebarTab === 'debug' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Diagnostics</span>
              </button>
            </div>

            {/* Sidebar Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4">
              {sidebarTab === 'objectives' ? (
                <div className="space-y-4">
                  {latentQuestions.length > 0 ? (
                    latentQuestions.map((q) => {
                      const agent = personas.find(p => p.id === q.personaId);
                      const scorePct = Math.round(q.satisfactionScore * 100);
                      let badgeColor = 'bg-slate-900 border-white/5 text-slate-400';
                      let scoreBarColor = 'bg-slate-800';
                      
                      if (q.status === 'SATISFIED') {
                        badgeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                        scoreBarColor = 'bg-emerald-400';
                      } else if (q.status === 'PARTIALLY_ANSWERED') {
                        badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                        scoreBarColor = 'bg-amber-400';
                      }
                      
                      return (
                        <div key={q.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-3 transition-all hover:border-white/10">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {agent?.name || 'Panel'}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {q.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-200 font-medium leading-relaxed">
                            "{q.question}"
                          </p>
                          
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                              <span>Satisfaction</span>
                              <span>{scorePct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${scoreBarColor}`}
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 italic bg-slate-950/20 rounded-xl p-4 border border-dashed border-white/5 text-center">
                      No active objectives loaded. Send a message to start.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Orchestrator Decision */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#00f2fe] mb-3 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Orchestration Decision</span>
                    </h4>
                    {latestDecision ? (
                      <div className="bg-slate-900/60 border border-[#00f2fe]/20 rounded-xl p-3.5 text-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300">Selected Speaker:</span>
                          <span className="px-2 py-0.5 rounded bg-[#00f2fe]/10 border border-[#00f2fe]/20 text-[#00f2fe] font-bold">
                            {personas.find(p => p.id === latestDecision.selectedPersonaId)?.name || 'NONE (WAIT)'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-300 block mb-1">Reason:</span>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{latestDecision.reason}</p>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Confidence:</span>
                          <span className="font-bold text-white">{(latestDecision.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic bg-slate-950/20 rounded-xl p-4 border border-dashed border-white/5">
                        Waiting for decision matrix.
                      </div>
                    )}
                  </div>

                  {/* Agent Proposals */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-violet-400 mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Agent Proposals</span>
                    </h4>
                    {latestProposals.length > 0 ? (
                      <div className="space-y-2">
                        {latestProposals.map((p, idx) => (
                          <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-xl p-3 text-xs">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-slate-200">
                                {personas.find(x => x.id === p.personaId)?.name}
                              </span>
                              <span className="text-[10px] font-semibold text-violet-400">
                                {p.action}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">"{p.content || 'Wait...'}"</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-white/5 pt-1.5">
                              <span>Priority: {p.priority}</span>
                              <span>Confidence: {p.confidence}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic bg-slate-950/20 rounded-xl p-4 border border-dashed border-white/5">
                        Waiting for agent bids.
                      </div>
                    )}
                  </div>

                  {/* Live Events Stream */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Canonical Events Stream</span>
                    </h4>
                    <div className="space-y-1.5 font-mono text-[9px] text-slate-400">
                      {eventStream.map((evt, idx) => (
                        <div key={idx} className="p-2 bg-slate-950/60 rounded border border-white/5 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="text-emerald-400 font-bold">{evt.type}</span>
                            <span className="text-slate-600">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <span className="text-slate-500">Source: {evt.source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
