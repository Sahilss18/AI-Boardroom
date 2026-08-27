import React from 'react';
import { type AIAgent, AI_AGENTS } from '../../data/agents';
import { Mic, ArrowUpRight } from 'lucide-react';

interface BoardroomMeetingGridProps {
  agentIds: string[];
  activeSpeakerId: string | number | null;
}

interface AgentMeetingTileProps {
  agent: AIAgent;
  index: number;
  isActiveSpeaker: boolean;
  totalAgents: number;
}

const AgentMeetingTile: React.FC<AgentMeetingTileProps> = ({
  agent,
  index,
  isActiveSpeaker,
}) => {
  return (
    <div
      className={`relative w-full h-full min-h-[200px] sm:min-h-[230px] rounded-[22px] sm:rounded-[26px] p-3 sm:p-4 flex flex-col justify-between overflow-hidden backdrop-blur-2xl transition-all duration-300 select-none group ${
        isActiveSpeaker
          ? 'bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-[#060914]/98 border-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
          : 'bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060914]/95 border border-white/[0.09] hover:border-white/[0.22] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_12px_28px_rgba(0,0,0,0.6)] hover:-translate-y-0.5'
      }`}
      style={{
        borderColor: isActiveSpeaker ? agent.hex : undefined,
        boxShadow: isActiveSpeaker
          ? `0 0 28px ${agent.hex}45, inset 0 0 15px ${agent.hex}15`
          : undefined,
      }}
    >
      {/* Top Inner Specular Highlight Edge */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Organic Liquid-Glass Glow Aura at Bottom-Left */}
      <div
        className={`absolute -bottom-8 -left-8 w-40 h-40 rounded-full blur-[40px] pointer-events-none transition-opacity duration-500 ${
          isActiveSpeaker ? 'opacity-55' : 'opacity-25 group-hover:opacity-50'
        }`}
        style={{
          background: `radial-gradient(circle at 35% 65%, ${agent.hex} 0%, transparent 70%)`,
        }}
      />

      {/* Subtle Fluid Bottom Rim Line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-30 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${agent.hex} 0%, transparent 65%)`,
        }}
      />

      {/* 1. Top Section: AGENT 01 Numbering + Circular Glass Mic Icon (Fixed Header) */}
      <div className="relative z-10 w-full flex items-center justify-between shrink-0 mb-1">
        {/* Agent Header Badge */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9.5px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase">
            AGENT
          </span>
          <span
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-sm sm:text-base font-bold tracking-tight text-white"
          >
            0{index + 1}
          </span>
        </div>

        {/* Floating Circular Glass Icon Container */}
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/90 border backdrop-blur-xl flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_3px_10px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105"
          style={{
            borderColor: isActiveSpeaker ? agent.hex : `${agent.hex}60`,
            boxShadow: isActiveSpeaker
              ? `0 0 14px ${agent.hex}60, inset 0 1px 1px rgba(255,255,255,0.3)`
              : `0 0 8px ${agent.hex}25`,
          }}
        >
          <Mic className="w-3.5 h-3.5" style={{ color: agent.hex }} />
        </div>
      </div>

      {/* 2. Middle Section: Hologram Character Visual (Isolated Contained Stage) */}
      <div className="relative z-10 w-full flex-1 min-h-0 flex items-center justify-center my-1 overflow-hidden">
        {/* Hologram Avatar Frame */}
        <div className="relative h-full max-h-[160px] sm:max-h-[190px] aspect-[4/5] flex items-center justify-center p-1">
          {/* Cyber Corner Brackets */}
          <div
            className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 transition-colors duration-300"
            style={{ borderColor: isActiveSpeaker ? agent.hex : 'rgba(255,255,255,0.25)' }}
          />
          <div
            className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 transition-colors duration-300"
            style={{ borderColor: isActiveSpeaker ? agent.hex : 'rgba(255,255,255,0.25)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 transition-colors duration-300"
            style={{ borderColor: isActiveSpeaker ? agent.hex : 'rgba(255,255,255,0.25)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 transition-colors duration-300"
            style={{ borderColor: isActiveSpeaker ? agent.hex : 'rgba(255,255,255,0.25)' }}
          />

          {/* Holographic Avatar Image */}
          <img
            src={agent.image}
            alt={agent.name}
            className={`w-full h-full max-h-full object-contain filter transition-all duration-300 ${
              isActiveSpeaker
                ? 'brightness-110 drop-shadow-[0_0_16px_rgba(255,255,255,0.3)] scale-[1.03]'
                : 'brightness-95 opacity-85 group-hover:opacity-100 group-hover:brightness-105'
            }`}
            style={{
              filter: isActiveSpeaker
                ? `drop-shadow(0 0 16px ${agent.hex}99) drop-shadow(0 0 28px ${agent.hex}44)`
                : `drop-shadow(0 0 8px ${agent.hex}40)`,
            }}
          />

          {/* Scanline Texture */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none opacity-30 rounded-xl" />
        </div>
      </div>

      {/* 3. Bottom Section: Agent Name Tag in Footer (Double Lines Allowed, Complete Full Visibility) */}
      <div className="relative z-10 w-full shrink-0 mt-1 pt-1.5 sm:pt-2 border-t border-white/[0.08] flex items-center justify-between min-h-[34px] sm:min-h-[38px]">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 pr-1 flex-1">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${isActiveSpeaker ? 'animate-ping' : ''}`}
            style={{ backgroundColor: agent.hex, boxShadow: `0 0 8px ${agent.hex}` }}
          />
          <span
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-[7.5px] sm:text-[8px] md:text-[8.5px] font-bold text-white uppercase tracking-tight leading-snug whitespace-normal break-words"
          >
            {agent.name}
          </span>
        </div>

        {/* Small Circular Arrow Glass Button */}
        <div
          className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border border-white/[0.12] bg-white/[0.03] flex items-center justify-center transition-all duration-300 shrink-0 ${
            isActiveSpeaker
              ? 'bg-neon-cyan/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_#00f0ff]'
              : 'text-slate-400 group-hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        </div>
      </div>
    </div>
  );
};

export const BoardroomMeetingGrid: React.FC<BoardroomMeetingGridProps> = ({
  agentIds,
  activeSpeakerId,
}) => {
  // Resolve agents from agentIds
  const agents = agentIds
    .map((id) =>
      AI_AGENTS.find(
        (a) =>
          a.id.toLowerCase() === id.toLowerCase() ||
          a.name.toLowerCase().includes(id.toLowerCase()) ||
          a.shortTitle.toLowerCase() === id.toLowerCase()
      )
    )
    .filter((a): a is AIAgent => Boolean(a));

  const total = agents.length;

  const isAgentActive = (agent: AIAgent) => {
    if (!activeSpeakerId) return false;
    const str = String(activeSpeakerId).toLowerCase();
    return (
      agent.id.toLowerCase() === str ||
      agent.name.toLowerCase().includes(str) ||
      agent.shortTitle.toLowerCase() === str
    );
  };

  // Case 1: 1 Agent -> Single Central Spotlight Tile
  if (total <= 1) {
    const singleAgent = agents[0] || AI_AGENTS[0];
    return (
      <div className="w-full h-full flex items-start justify-center">
        <div className="w-full max-w-[380px] h-full">
          <AgentMeetingTile
            agent={singleAgent}
            index={0}
            isActiveSpeaker={isAgentActive(singleAgent)}
            totalAgents={1}
          />
        </div>
      </div>
    );
  }

  // Case 2: 2 Agents -> 1 Row x 2 Columns (1*2)
  if (total === 2) {
    return (
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 w-full h-full">
        {agents.map((agent, i) => (
          <AgentMeetingTile
            key={agent.id}
            agent={agent}
            index={i}
            isActiveSpeaker={isAgentActive(agent)}
            totalAgents={2}
          />
        ))}
      </div>
    );
  }

  // Case 3: 3 Agents -> 1st Row 2 Agents, 2nd Row 1 Agent in the Middle
  if (total === 3) {
    return (
      <div className="flex flex-col gap-3 sm:gap-3.5 w-full h-full">
        {/* Row 1: 2 Agents */}
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 w-full flex-1 min-h-0">
          <AgentMeetingTile
            agent={agents[0]}
            index={0}
            isActiveSpeaker={isAgentActive(agents[0])}
            totalAgents={3}
          />
          <AgentMeetingTile
            agent={agents[1]}
            index={1}
            isActiveSpeaker={isAgentActive(agents[1])}
            totalAgents={3}
          />
        </div>

        {/* Row 2: 1 Agent Centered */}
        <div className="flex justify-center w-full flex-1 min-h-0">
          <div className="w-full sm:w-[50%] h-full">
            <AgentMeetingTile
              agent={agents[2]}
              index={2}
              isActiveSpeaker={isAgentActive(agents[2])}
              totalAgents={3}
            />
          </div>
        </div>
      </div>
    );
  }

  // Case 4: 4 Agents -> 2 Rows x 2 Columns (2*2)
  if (total === 4) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-3.5 w-full h-full">
        {agents.map((agent, i) => (
          <AgentMeetingTile
            key={agent.id}
            agent={agent}
            index={i}
            isActiveSpeaker={isAgentActive(agent)}
            totalAgents={4}
          />
        ))}
      </div>
    );
  }

  // Case 5: 5 Agents -> 1st Row 3 Agents, 2nd Row 2 Agents Centered
  if (total === 5) {
    return (
      <div className="flex flex-col gap-3 sm:gap-3.5 w-full h-full">
        {/* Row 1: 3 Agents */}
        <div className="grid grid-cols-3 gap-3 sm:gap-3.5 w-full flex-1 min-h-0">
          <AgentMeetingTile
            agent={agents[0]}
            index={0}
            isActiveSpeaker={isAgentActive(agents[0])}
            totalAgents={5}
          />
          <AgentMeetingTile
            agent={agents[1]}
            index={1}
            isActiveSpeaker={isAgentActive(agents[1])}
            totalAgents={5}
          />
          <AgentMeetingTile
            agent={agents[2]}
            index={2}
            isActiveSpeaker={isAgentActive(agents[2])}
            totalAgents={5}
          />
        </div>

        {/* Row 2: 2 Agents in the Middle */}
        <div className="flex justify-center w-full flex-1 min-h-0">
          <div className="w-full sm:w-[68%] grid grid-cols-2 gap-3 sm:gap-3.5 h-full">
            <AgentMeetingTile
              agent={agents[3]}
              index={3}
              isActiveSpeaker={isAgentActive(agents[3])}
              totalAgents={5}
            />
            <AgentMeetingTile
              agent={agents[4]}
              index={4}
              isActiveSpeaker={isAgentActive(agents[4])}
              totalAgents={5}
            />
          </div>
        </div>
      </div>
    );
  }

  // Case 6: 6 Agents -> 2 Rows x 3 Columns (2*3)
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-3 sm:gap-3.5 w-full h-full">
      {agents.slice(0, 6).map((agent, i) => (
        <AgentMeetingTile
          key={agent.id}
          agent={agent}
          index={i}
          isActiveSpeaker={isAgentActive(agent)}
          totalAgents={total}
        />
      ))}
    </div>
  );
};
