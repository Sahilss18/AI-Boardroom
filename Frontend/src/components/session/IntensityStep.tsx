import React from 'react';
import { Flame, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

interface IntensityStepProps {
  intensity: 'CALM' | 'STANDARD' | 'AGGRESSIVE' | 'ADVERSARIAL';
  onIntensityChange: (intensity: 'CALM' | 'STANDARD' | 'AGGRESSIVE' | 'ADVERSARIAL') => void;
}

export const IntensityStep: React.FC<IntensityStepProps> = ({ intensity, onIntensityChange }) => {
  const levels = [
    {
      id: 'CALM' as const,
      title: 'CALM',
      subtitle: 'Constructive & Supportive',
      desc: 'Polite, thorough inquiries with generous response windows. Best for early conceptual rehearsal and deck reviews.',
      icon: ShieldCheck,
      color: '#00ff87',
      hex: '#00ff87',
      badge: 'LOW FRICTION'
    },
    {
      id: 'STANDARD' as const,
      title: 'STANDARD',
      subtitle: 'Balanced Board Scrutiny',
      desc: 'Realistic executive deliberation with standard cross-examination on metrics, architecture, and revenue timelines.',
      icon: Zap,
      color: '#00f0ff',
      hex: '#00f0ff',
      badge: 'RECOMMENDED'
    },
    {
      id: 'AGGRESSIVE' as const,
      title: 'AGGRESSIVE',
      subtitle: 'Direct Interruption & Skepticism',
      desc: 'High skepticism. The AI panel challenges unsupported claims rapidly, testing your ability to defend under fire.',
      icon: AlertTriangle,
      color: '#ff9f00',
      hex: '#ff9f00',
      badge: 'HIGH PRESSURE'
    },
    {
      id: 'ADVERSARIAL' as const,
      title: 'ADVERSARIAL',
      subtitle: 'Maximum Hostile Pressure Test',
      desc: 'Relentless cross-examination with frequent barge-in interruptions and zero tolerance for buzzwords. For battle-hardening.',
      icon: Flame,
      color: '#f43f5e',
      hex: '#f43f5e',
      badge: 'MAX RESISTANCE'
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full select-none">
      <div className="text-center">
        <h3
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-tight"
        >
          Boardroom Intensity.
        </h3>
        <p
          style={{ fontFamily: "'Exo 2', sans-serif" }}
          className="text-sm text-slate-300 font-normal mt-1.5"
        >
          Tune the adversarial challenge and interruption threshold of the boardroom.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {levels.map((lvl) => {
          const Icon = lvl.icon;
          const isSelected = intensity === lvl.id;
          return (
            <button
              key={lvl.id}
              onClick={() => onIntensityChange(lvl.id)}
              className={`p-6 rounded-[22px] border text-left transition-all duration-300 relative flex flex-col justify-between cursor-pointer overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-[0_0_30px_rgba(0,240,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] scale-[1.01]'
                  : 'bg-slate-950/40 border-white/[0.08] hover:border-white/[0.22] hover:bg-slate-900/60'
              }`}
              style={{
                borderColor: isSelected ? lvl.hex : undefined,
              }}
            >
              {/* Top Specular Edge */}
              <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner"
                    style={{
                      borderColor: `${lvl.hex}50`,
                      backgroundColor: `${lvl.hex}15`,
                      color: lvl.hex,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border tracking-wider uppercase"
                    style={{
                      borderColor: `${lvl.hex}40`,
                      color: lvl.hex,
                      backgroundColor: `${lvl.hex}10`,
                    }}
                  >
                    {lvl.badge}
                  </span>
                </div>

                <h4
                  style={{ fontFamily: "'Michroma', sans-serif" }}
                  className="text-base font-bold text-white uppercase tracking-wider"
                >
                  {lvl.title}
                </h4>
                <div
                  style={{ fontFamily: "'Exo 2', sans-serif", color: lvl.hex }}
                  className="text-xs font-semibold tracking-wider mt-0.5 mb-2 uppercase"
                >
                  {lvl.subtitle}
                </div>

                <p
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                  className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal"
                >
                  {lvl.desc}
                </p>
              </div>

              {isSelected && (
                <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-neon-cyan">
                  <span className="tracking-wider">ACTIVE CONFIGURATION</span>
                  <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_6px_#00f0ff]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
