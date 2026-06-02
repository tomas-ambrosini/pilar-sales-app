import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Wrench, Building2, Factory, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import commercialImage from '../../assets/mock/commercial_hvac_1780422279714.png';
import residentialImage from '../../assets/mock/residential_hvac_1780422269002.png';
import industrialImage from '../../assets/mock/industrial_hvac_1780422289674.png';
import federalImage from '../../assets/mock/federal_hvac_1780422309048.png';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function Services() {
  return (
    <div className="flex-1 w-full bg-white font-sans pt-24 md:pt-32">
      {/* HEADER SECTION */}
      <section className="py-16 md:py-24 bg-slate-50 border-b border-gray-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
               initial="hidden"
               animate="visible"
               variants={staggerContainer}
               className="max-w-4xl"
            >
               <motion.div variants={fadeUp} className="text-[#7DBD7C] font-bold text-sm uppercase tracking-widest mb-4">Our Services</motion.div>
               <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-[#3e6b85] tracking-tight mb-8 font-['Russo_One',sans-serif]">
                 Professional <br/>HVAC Services.
               </motion.h1>
               <motion.div variants={fadeUp} className="text-lg md:text-xl text-gray-600 font-['Georgia',serif] leading-relaxed space-y-6">
                  <p>From installations and new construction to service, and maintenance contracts we can handle it all. When you need HVAC services, you can always depend on the quality work of Pilar Services, Inc.</p>
                  <p>As a fully licensed and insured HVAC contractor, it’s our pleasure to provide outstanding residential and commercial HVAC services and installations to all of Florida. With more than 30 years of experience, we’ve built up a reputation for quality, honesty, and reliability.</p>
               </motion.div>
            </motion.div>
         </div>
      </section>

      {/* CORE SERVICES GRID */}
      <section className="py-24">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {[
                  { 
                     title: 'Residential', 
                     icon: Wrench, 
                     img: residentialImage,
                     features: ['AC Repair & Maintenance', 'New System Installations', 'Indoor Air Quality Solutions', '24/7 Emergency Service']
                  },
                  { 
                     title: 'Commercial', 
                     icon: Building2, 
                     img: commercialImage,
                     features: ['Rooftop Units & Chillers', 'Preventative Maintenance Contracts', 'Ductwork & Ventilation', 'Energy Efficiency Audits']
                  },
                  { 
                     title: 'Industrial', 
                     icon: Factory, 
                     img: industrialImage,
                     features: ['Heavy-Duty Refrigeration', 'Process Cooling Systems', 'Custom Sheet Metal Fabrication', 'Compliance & Safety Inspections']
                  },
                  { 
                     title: 'Federal', 
                     icon: ShieldCheck, 
                     img: federalImage,
                     features: ['Government Facility HVAC', 'High-Security Clearances', 'Strict Code Compliance', 'Large-Scale Contracting']
                  },
               ].map((srv, idx) => (
                  <motion.div 
                     initial={{ opacity: 0, y: 30 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.6, delay: idx * 0.1 }}
                     key={idx} 
                     className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl transition-all duration-500 group flex flex-col"
                  >
                     <div className="h-64 relative overflow-hidden">
                        <img src={srv.img} alt={srv.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2b4a5d]/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 text-white flex items-center gap-3">
                           <div className="w-12 h-12 bg-[#7DBD7C] rounded-full flex items-center justify-center">
                              <srv.icon size={24} />
                           </div>
                           <h3 className="text-3xl font-black font-['Russo_One',sans-serif]">{srv.title}</h3>
                        </div>
                     </div>
                     <div className="p-8 flex-grow flex flex-col justify-between">
                        <ul className="space-y-4 mb-8">
                           {srv.features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-3">
                                 <CheckCircle2 size={20} className="text-[#7DBD7C] flex-shrink-0 mt-0.5" />
                                 <span className="text-gray-600 font-['Georgia',serif]">{feature}</span>
                              </li>
                           ))}
                        </ul>
                        <Link to="/website-mock/industries" className="inline-flex items-center gap-2 text-[#3e6b85] font-bold uppercase tracking-widest text-sm group-hover:text-[#7DBD7C] transition-colors">
                           View Projects in {srv.title} <ChevronRight size={16} />
                        </Link>
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 bg-[#2b4a5d] text-center px-4">
         <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6 font-['Russo_One',sans-serif]">We have the expertise you need.</h2>
         <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto font-['Georgia',serif]">From basic maintenance service to complex design and spec applications.</p>
         <button className="px-8 py-4 bg-[#7DBD7C] hover:bg-[#6ab069] text-white rounded-full font-bold text-lg transition-all shadow-[0_8px_30px_rgb(125,189,124,0.3)] hover:shadow-[0_8px_30px_rgb(125,189,124,0.5)] transform hover:-translate-y-1">
            Request a Service Call
         </button>
      </section>
    </div>
  );
}
