import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw } from 'lucide-react';

export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI displays for crisp lines
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Set default canvas styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // Deep slate
    
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // We must reset the transform to clear the entire physical canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasDrawn(false);
  };

  const saveSignature = () => {
    if (!hasDrawn) return;
    const canvas = canvasRef.current;
    // Export as Base64 PNG
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-lg mx-auto">
      <div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col gap-1 items-center justify-center text-center">
        <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-2">
          <PenTool size={20} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Execute Contract</h3>
        <p className="text-sm font-medium text-slate-500">
          Please sign below to digitally authorize this estimate and proceed with scheduling.
        </p>
      </div>
      
      <div className="p-6 font-sans">
        <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden aspect-[2/1] touch-none">
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <span className="text-xl font-bold text-slate-400 select-none">Draw signature here...</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <button 
            onClick={clearCanvas}
            className="text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={14} /> Clear
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="px-5 py-2 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={saveSignature}
              disabled={!hasDrawn}
              className={`px-5 py-2 rounded-lg font-bold text-white transition-all shadow-sm ${
                hasDrawn 
                  ? 'bg-[#2A9D8F] hover:bg-teal-700 active:scale-95 hover:shadow-md' 
                  : 'bg-slate-300 cursor-not-allowed hidden'
              }`}
            >
              Confirm Signature
            </button>
          </div>
        </div>
      </div>
      <div className="bg-slate-50 border-t border-slate-100 p-4 text-[11px] font-medium text-slate-400 text-center leading-relaxed font-sans">
        By signing this document, you acknowledge that you have read and agree to all terms and conditions outlined in the attached proposal. This digital signature carries the same legal binding weight as a handwritten wet signature.
      </div>
    </div>
  );
}
