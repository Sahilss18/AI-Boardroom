import React from 'react';
import { motion } from 'framer-motion';
import { Carousel } from '../Carousel';

export const BoardroomRevealSection: React.FC = () => {
  return (
    <section
      id="boardroom"
      className="relative w-full py-6 sm:py-8 px-4 sm:px-6 bg-transparent overflow-hidden flex flex-col items-center"
    >
      {/* Background Ambient Glow Nebulas */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] max-w-[95vw] h-[550px] bg-cyan-500/6 blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] left-[10%] w-[350px] h-[350px] bg-purple-500/5 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto w-full flex flex-col items-center">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl text-center flex flex-col items-center gap-3 mb-14 sm:mb-18 md:mb-22 z-10"
        >
          {/* Headline */}
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold text-white tracking-tight leading-tight">
            Meet the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-sky-400">
              Room.
            </span>
          </h2>

          {/* Subheadline */}
          <p
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="text-xs sm:text-sm md:text-base text-slate-300 tracking-[0.06em] leading-relaxed max-w-2xl"
          >
            AI agents that question your numbers, challenge your assumptions, and expose the gaps.
          </p>
        </motion.div>

        {/* 3D Rotating Hologram Carousel (Centerpiece Preserved As-Is) */}
        <div className="w-full flex flex-col items-center relative z-20 pt-2 sm:pt-4">
          <Carousel />
        </div>

      </div>
    </section>
  );
};
