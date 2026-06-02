import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Phone, Menu, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WebsiteLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen font-sans bg-white selection:bg-[#7DBD7C] selection:text-white flex flex-col">
      {/* Top Bar - Warning that this is a mock */}
      <div className="bg-[#2b4a5d] text-white font-bold text-[10px] uppercase tracking-widest py-1.5 px-4 flex justify-between items-center z-50 relative">
         <span>INTERNAL PREVIEW ONLY — NOT LIVE</span>
         <Link to="/" className="flex items-center gap-1 hover:text-[#7DBD7C] transition-colors font-black">
            <ArrowLeft size={12} strokeWidth={3}/> BACK TO APP
         </Link>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-[40px] left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-40 transition-all duration-500 ${
        isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] py-3 rounded-full' : 'bg-white/95 shadow-lg py-4 rounded-[2rem]'
      }`}>
        <div className="px-6 md:px-8 flex justify-between items-center">
          
          {/* Logo */}
          <Link to="/website-mock" className="flex items-center gap-4 group">
             <img src="https://pilarservices.com/wp-content/themes/EM-Genesis-Child/images/logo.jpg" alt="Pilar Logo" className="h-10 md:h-12 object-contain rounded-full shadow-sm" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 font-bold text-sm uppercase tracking-wider text-[#3e6b85] font-['Russo_One',sans-serif]">
            <Link to="/website-mock/services" className="hover:text-[#7DBD7C] transition-colors relative group py-2">
               Our Services
            </Link>
            <Link to="/website-mock/industries" className="hover:text-[#7DBD7C] transition-colors relative group py-2">
               Industries
            </Link>
            <Link to="/website-mock/faqs" className="hover:text-[#7DBD7C] transition-colors relative group py-2">
               FAQs
            </Link>
            <Link to="/website-mock/about" className="hover:text-[#7DBD7C] transition-colors relative group py-2">
               About Pilar Services
            </Link>
            <Link to="/website-mock/contact" className="hover:text-[#7DBD7C] transition-colors relative group py-2">
               Contact Us
            </Link>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-6">
             <a href="tel:305-888-2421" className="flex items-center gap-2 font-black tracking-tight text-[#3e6b85] hover:text-[#7DBD7C] transition-colors text-lg">
                <Phone size={18} className="text-[#7DBD7C]"/>
                (305) 888-2421
             </a>
             <button className="bg-[#7DBD7C] hover:bg-[#6ab069] text-white px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
               Get a Quote
             </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-[#3e6b85] hover:text-[#7DBD7C] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="fixed inset-0 z-30 bg-white pt-32 px-6 flex flex-col gap-6 md:hidden shadow-xl border-b border-gray-200"
          >
              <Link to="/website-mock/services" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-[#3e6b85] border-b border-gray-100 pb-4 font-['Russo_One',sans-serif]">Our Services</Link>
              <Link to="/website-mock/industries" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-[#3e6b85] border-b border-gray-100 pb-4 font-['Russo_One',sans-serif]">Industries</Link>
              <Link to="/website-mock/faqs" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-[#3e6b85] border-b border-gray-100 pb-4 font-['Russo_One',sans-serif]">FAQs</Link>
              <Link to="/website-mock/about" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-[#3e6b85] border-b border-gray-100 pb-4 font-['Russo_One',sans-serif]">About Pilar Services</Link>
              <Link to="/website-mock/contact" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-[#3e6b85] border-b border-gray-100 pb-4 font-['Russo_One',sans-serif]">Contact Us</Link>
              <div className="mt-8 flex flex-col gap-4">
                 <a href="tel:305-888-2421" className="flex justify-center items-center gap-2 font-bold text-xl text-[#3e6b85] bg-gray-50 py-5 rounded-md border border-gray-200">
                    <Phone size={20} className="text-[#7DBD7C]"/> (305) 888-2421
                 </a>
                 <button className="bg-[#7DBD7C] text-white px-5 py-5 rounded-full font-bold text-lg uppercase shadow-xl">
                   Get a Quote
                 </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#2b4a5d] pt-20 pb-10 relative overflow-hidden font-sans">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
            <div className="col-span-1 md:col-span-2">
               <div className="flex items-center gap-4 mb-6">
                 <div className="bg-white rounded-3xl p-3 flex items-center justify-center shadow-lg">
                    <img src="https://pilarservices.com/wp-content/themes/EM-Genesis-Child/images/logo.jpg" alt="Pilar Logo" className="h-10 object-contain rounded-2xl" />
                 </div>
               </div>
               <p className="text-slate-300 text-base leading-relaxed max-w-md mb-8 font-['Georgia',serif]">
                 Florida's premier mechanical contractor specializing in repair, service, and installation of advanced HVAC equipment since 1991.
               </p>
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border border-slate-500 hover:border-white hover:text-[#2b4a5d] hover:bg-white transition-colors cursor-pointer flex items-center justify-center text-slate-300 font-bold text-xs bg-[#1f3644]">FB</div>
                  <div className="w-10 h-10 rounded-full border border-slate-500 hover:border-white hover:text-[#2b4a5d] hover:bg-white transition-colors cursor-pointer flex items-center justify-center text-slate-300 font-bold text-xs bg-[#1f3644]">IG</div>
                  <div className="w-10 h-10 rounded-full border border-slate-500 hover:border-white hover:text-[#2b4a5d] hover:bg-white transition-colors cursor-pointer flex items-center justify-center text-slate-300 font-bold text-xs bg-[#1f3644]">IN</div>
               </div>
            </div>
            
            <div>
               <h4 className="text-[#7DBD7C] font-bold text-sm uppercase tracking-widest mb-6 font-['Russo_One',sans-serif]">Industries</h4>
               <ul className="space-y-3 text-slate-200">
                  <li><Link to="/website-mock/industries" className="hover:text-white transition-colors">Residential</Link></li>
                  <li><Link to="/website-mock/industries" className="hover:text-white transition-colors">Commercial</Link></li>
                  <li><Link to="/website-mock/industries" className="hover:text-white transition-colors">Industrial</Link></li>
                  <li><Link to="/website-mock/industries" className="hover:text-white transition-colors">Federal</Link></li>
               </ul>
            </div>

            <div>
               <h4 className="text-[#7DBD7C] font-bold text-sm uppercase tracking-widest mb-6 font-['Russo_One',sans-serif]">Contact HQ</h4>
               <ul className="space-y-3 text-slate-300 font-['Georgia',serif]">
                  <li>10200 NW 25th Street #202<br/>Doral, FL 33172</li>
                  <li className="pt-2"><a href="tel:305-888-2421" className="text-white font-bold text-xl hover:text-[#7DBD7C] transition-colors tracking-tight font-sans">(305) 888-2421</a></li>
                  <li className="text-[#7DBD7C] font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2 font-sans">
                     24/7 Dispatch
                  </li>
               </ul>
            </div>
         </div>
         
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-6 border-t border-[#1f3644] text-xs font-bold uppercase tracking-wider text-slate-400 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
            <div>&copy; {new Date().getFullYear()} Pilar Services, Inc. All rights reserved.</div>
            <div className="flex gap-6">
               <Link to="#" className="hover:text-white transition-colors">Privacy</Link>
               <Link to="#" className="hover:text-white transition-colors">Terms</Link>
            </div>
         </div>
      </footer>
    </div>
  );
}
