import { createPortal } from "react-dom";
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SlideDrawer({ isOpen, onClose, title, children, width = "max-w-2xl", headerClassName = "p-6", bodyClassName = "p-6 flex-1 overflow-y-auto" }) {
  
  // Prevent scrolling on the body when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" 
            onClick={onClose}
          />
          
          {/* Drawer Panel */}
          <motion.div 
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`relative z-10 w-full ${width} bg-white shadow-2xl h-full flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b border-slate-100 ${headerClassName}`}>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
              <button 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all rounded-full" 
                onClick={onClose} 
                aria-label="Close panel"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable Body */}
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
