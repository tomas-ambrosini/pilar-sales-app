import { createPortal } from "react-dom";
import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children, width = "max-w-lg", bodyClassName = "p-5 max-h-[80vh] overflow-y-auto" }) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-layout-wrapper">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute -inset-10 bg-slate-900/40 backdrop-blur-sm" 
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`modal-container bg-white border border-slate-200 shadow-2xl shadow-slate-900/10 relative z-10 w-full ${width} rounded-3xl overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
              <button 
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-xl md hover:bg-slate-50 border border-transparent hover:border-slate-200" 
                onClick={onClose} 
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className={bodyClassName}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
