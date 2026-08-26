import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { ApiService, type DocumentParseResult } from '../../services/api';

interface DocumentUploadStepProps {
  file: File | null;
  onFileSelect: (file: File | null, parseResult: DocumentParseResult | null) => void;
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({ file, onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocumentParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allowedExtensions = ['.pdf', '.pptx', '.docx', '.txt', '.md'];

  const validateAndProcessFile = async (selectedFile: File) => {
    setError(null);
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError(`Unsupported format (${ext}). Supported formats: PDF, PPTX, DOCX, TXT, MD.`);
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25 MB limit.');
      return;
    }

    setIsParsing(true);
    try {
      const parseResult = await ApiService.parseDocumentPreview(selectedFile);
      setPreview(parseResult);
      onFileSelect(selectedFile, parseResult);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse document preview.');
      onFileSelect(selectedFile, null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onFileSelect(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full select-none">
      {/* Main Heading & Subtitle */}
      <div className="text-center">
        <h3
          style={{ fontFamily: "'Michroma', sans-serif" }}
          className="text-lg sm:text-xl font-bold text-white tracking-wider uppercase"
        >
          Bring your material.
        </h3>
        <p
          style={{ fontFamily: "'Exo 2', sans-serif" }}
          className="text-xs sm:text-[13px] text-slate-300 font-normal leading-relaxed max-w-xl mx-auto mt-1"
        >
          Give the boardroom something concrete to challenge and ground questions upon.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.pptx,.docx,.txt,.md"
        onChange={handleFileChange}
        className="hidden"
      />

      {!file ? (
        /* Large Liquid-Glass Drop Zone Portal */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-[24px] p-10 sm:p-14 bg-gradient-to-b from-slate-900/40 via-slate-950/60 to-[#060914]/80 border backdrop-blur-xl transition-all duration-500 cursor-pointer group flex flex-col items-center justify-center text-center overflow-hidden ${
            isDragging
              ? 'border-neon-cyan bg-cyan-950/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_40px_rgba(0,240,255,0.4)] scale-[1.01]'
              : 'border-cyan-500/25 hover:border-cyan-400/55 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_15px_40px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_50px_rgba(0,240,255,0.12)]'
          }`}
        >
          {/* Top Specular Edge */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Ambient Inner Glow Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/18 transition-colors duration-500" />

          {/* Floating Rounded Glass Upload Icon Capsule */}
          <div className="relative mb-5 group-hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-cyan-500/15 via-cyan-900/30 to-slate-950/80 border border-cyan-400/40 flex items-center justify-center text-neon-cyan shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_0_24px_rgba(0,240,255,0.3)] group-hover:shadow-[0_0_35px_rgba(0,240,255,0.55)] transition-all duration-300">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="absolute inset-0 bg-cyan-400/20 rounded-2xl blur-md -z-10" />
          </div>

          {/* Primary Upload Text */}
          <span
            style={{ fontFamily: "'Michroma', sans-serif" }}
            className="font-bold text-base sm:text-lg text-white tracking-[0.06em] uppercase group-hover:text-cyan-100 transition-colors"
          >
            Drop your presentation here
          </span>

          {/* Secondary Browse Instruction */}
          <span
            style={{ fontFamily: "'Exo 2', sans-serif" }}
            className="text-xs sm:text-[13px] text-slate-400 mt-2 font-normal tracking-wide"
          >
            or click to <span className="text-cyan-300 font-semibold underline underline-offset-4 decoration-cyan-400/50 group-hover:text-cyan-200 transition-colors">browse from your device</span>
          </span>

          {/* File Type Glass Chips */}
          <div className="flex items-center flex-wrap justify-center gap-2.5 mt-7">
            {['PDF', 'PPTX', 'DOCX', 'MARKDOWN'].map((chip) => (
              <span
                key={chip}
                className="px-3.5 py-1 rounded-full bg-slate-900/60 border border-white/[0.1] text-[10px] font-mono text-slate-300 tracking-widest uppercase hover:border-cyan-400/40 hover:text-neon-cyan hover:bg-cyan-950/30 transition-all duration-200 shadow-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* File Successfully Uploaded / Preview Glass Card */
        <div className="p-6 rounded-[22px] bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#060913]/95 border border-cyan-500/40 backdrop-blur-xl flex flex-col gap-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_15px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-neon-cyan shadow-[0_0_18px_rgba(0,240,255,0.25)]">
                {isParsing ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
              </div>
              <div>
                <h4
                  style={{ fontFamily: "'Michroma', sans-serif" }}
                  className="text-sm font-bold text-white max-w-sm truncate uppercase tracking-wider"
                >
                  {file.name}
                </h4>
                <span
                  style={{ fontFamily: "'Exo 2', sans-serif" }}
                  className="text-xs text-slate-400"
                >
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.name.split('.').pop()?.toUpperCase()} Document
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              aria-label="Remove document"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Document Grounding Verification Badge */}
          {preview && (
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neon-cyan font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  RAG GROUNDING READY ({preview.estimated_slides_or_pages || preview.chunksCount || 1} SECTIONS EXTRACTED)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                {(preview.key_entities ? preview.key_entities.length : preview.chunksCount) || 0} TECHNICAL SECTIONS
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
