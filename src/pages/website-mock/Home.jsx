import React from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, Building2, Factory, ShieldCheck, 
  PhoneCall, Headset, UserCheck, Truck, 
  ChevronRight, Award, Clock
} from 'lucide-react';

import heroImage from '../../assets/mock/hero_chiller_1780422257756.png';
import residentialImage from '../../assets/mock/residential_hvac_1780422269002.png';
import commercialImage from '../../assets/mock/commercial_hvac_1780422279714.png';
import industrialImage from '../../assets/mock/industrial_hvac_1780422289674.png';
import federalImage from '../../assets/mock/federal_hvac_1780422309048.png';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

// Brand Colors
// Primary Blue: #3e6b85
// Hover Blue: #2b4a5d
// Green Accent: #7DBD7C
// Text Dark: #333333

export default function Home() {
  return (
    <div className="flex-1 w-full relative bg-white text-[#333333] font-['Georgia',serif]">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-[#2b4a5d]">
         <motion.div 
           initial={{ scale: 1.05 }}
           animate={{ scale: 1 }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className="absolute inset-0"
         >
            {/* The original site used a linear gradient over the hero image */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#141414]/60 to-[#141414]/80 z-10"></div>
            <img 
               src={heroImage} 
               alt="Pilar Services HVAC" 
               className="w-full h-full object-cover opacity-80 mix-blend-overlay"
            />
         </motion.div>

         <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col items-center text-center mt-12 font-sans">
            <motion.div 
               initial="hidden"
               animate="visible"
               variants={staggerContainer}
               className="max-w-4xl flex flex-col items-center"
            >
               <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7DBD7C]/20 border border-[#7DBD7C]/50 text-[#7DBD7C] font-bold text-xs uppercase tracking-widest mb-8 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-[#7DBD7C] animate-pulse"></span>
                  24hr. Service
               </motion.div>
               
               <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6 font-['Russo_One',sans-serif]">
                 Precision Climate Control <br className="hidden md:block" />
                 <span className="text-[#7DBD7C]">For Florida.</span>
               </motion.h1>
               
               <motion.p variants={fadeUp} className="text-lg md:text-2xl text-slate-200 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
                 Air Conditioning & Refrigeration. Florida's premier mechanical contractor since 1991.
               </motion.p>
               
               <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-6 justify-center w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-10 py-4 bg-[#3e6b85] hover:bg-[#2b4a5d] text-white rounded-md font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3">
                     Schedule Service <ChevronRight size={20}/>
                  </button>
                  <a href="tel:305-888-2421" className="w-full sm:w-auto px-10 py-4 bg-white hover:bg-gray-100 text-[#3e6b85] rounded-md font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3">
                     <PhoneCall size={20}/> (305) 888-2421
                  </a>
               </motion.div>
            </motion.div>
         </div>
      </section>

      {/* 2. TRUST BANNER */}
      <section className="bg-white py-12 border-b border-gray-200 overflow-hidden relative">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-bold uppercase tracking-widest text-gray-400 mb-8 font-sans">Trusted by our commercial partners</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center">
               <img src="https://pilarservices.com/wp-content/uploads/2021/05/tbelllogo.png" alt="Taco Bell" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
               <img src="https://pilarservices.com/wp-content/uploads/2021/06/usps2-300x194.jpeg" alt="USPS" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
               <img src="https://pilarservices.com/wp-content/uploads/2021/06/amtrak2-300x200.jpeg" alt="Amtrak" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
               <img src="https://pilarservices.com/wp-content/uploads/2021/06/upslogo-252x300.png" alt="UPS" className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
               <img src="https://pilarservices.com/wp-content/uploads/2021/06/pizzahut-300x169.jpg" alt="Pizza Hut" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
            </div>
         </div>
      </section>

      {/* 3. SERVICES GRID */}
      <section className="py-24 bg-gray-50 relative font-sans">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true, margin: "-100px" }}
               variants={staggerContainer}
               className="text-center max-w-3xl mx-auto mb-16"
            >
               <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#3e6b85] tracking-tight mb-4 font-['Russo_One',sans-serif]">Our Services</motion.h2>
               <motion.p variants={fadeUp} className="text-xl text-gray-600 font-medium">From residential properties to massive industrial complexes, our certified technicians execute with precision.</motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                  { title: 'Residential', icon: Wrench, img: residentialImage },
                  { title: 'Commercial', icon: Building2, img: commercialImage },
                  { title: 'Industrial', icon: Factory, img: industrialImage },
                  { title: 'Federal', icon: ShieldCheck, img: federalImage },
               ].map((srv, idx) => (
                  <motion.div 
                     initial={{ opacity: 0, y: 30 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.5, delay: idx * 0.1 }}
                     key={idx} 
                     className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl transition-all duration-300 group border border-gray-100 flex flex-col"
                  >
                     <div className="h-48 relative overflow-hidden">
                        <img src={srv.img} alt={srv.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2b4a5d]/90 to-transparent"></div>
                        <div className="absolute bottom-4 left-6 text-white flex items-center gap-3">
                           <div className="w-10 h-10 bg-[#7DBD7C] rounded-full flex items-center justify-center shadow-lg"><srv.icon size={20} /></div>
                           <h3 className="text-xl font-bold">{srv.title}</h3>
                        </div>
                     </div>
                     <div className="p-6 flex-grow flex flex-col justify-between">
                        <div>
                           <p className="text-gray-500 text-sm leading-relaxed mb-4 font-['Georgia',serif]">Expert {srv.title.toLowerCase()} HVAC repair, maintenance, and complete system installations.</p>
                        </div>
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#7DBD7C] group-hover:text-[#3e6b85] transition-colors">
                           Learn More <ChevronRight size={16} />
                        </span>
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* 4. ABOUT US & COMMITMENT */}
      <section className="py-24 bg-white relative overflow-hidden font-sans border-t border-gray-100">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
               <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="w-full lg:w-1/2 relative"
               >
                  <img 
                     src="https://pilarservices.com/wp-content/uploads/2021/05/PSI_About-wearecommitted-image.jpg" 
                     alt="HVAC Technician" 
                     className="w-full h-auto rounded-[2rem] shadow-2xl relative z-10"
                  />
                  {/* Floating badge */}
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     viewport={{ once: true }}
                     transition={{ delay: 0.6, type: "spring" }}
                     className="absolute -left-6 -bottom-6 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] z-20 flex items-center gap-4 border border-gray-100"
                  >
                     <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-[#7DBD7C]">
                        <Award size={28} />
                     </div>
                     <div>
                        <div className="text-3xl font-bold text-[#3e6b85] mb-1">30+</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Years Experience</div>
                     </div>
                  </motion.div>
               </motion.div>
               
               <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="w-full lg:w-1/2"
               >
                  <h5 className="text-[#7DBD7C] font-['Russo_One',sans-serif] text-xl mb-2">We Are Committed</h5>
                  <h3 className="text-4xl font-bold text-[#3e6b85] mb-6">To Your Comfort.</h3>
                  <div className="text-gray-600 font-['Georgia',serif] text-lg space-y-4 mb-8">
                     <p>
                        Established in 1991, our family-owned-and-operated HVAC business has been cooling the South for more than 3 decades. We firmly believe that choosing the right HVAC company should be NO SWEAT.
                     </p>
                     <p>
                        Our commitment to your comfort is long-term. We offer expert installation and maintenance by a skilled team of factory-trained professionals.
                     </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-full border border-gray-200">
                        <Clock className="text-[#3e6b85]" size={24} />
                        <span className="font-bold text-gray-700">24/7 Availability</span>
                     </div>
                     <div className="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-full border border-gray-200">
                        <UserCheck className="text-[#3e6b85]" size={24} />
                        <span className="font-bold text-gray-700">Factory Trained</span>
                     </div>
                  </div>
               </motion.div>
            </div>
         </div>
      </section>

      {/* 5. PROCESS TIMELINE */}
      <section className="py-24 bg-slate-50 relative font-sans border-t border-gray-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true }}
               variants={staggerContainer}
               className="text-center max-w-3xl mx-auto mb-16"
            >
               <motion.h3 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-4 font-['Russo_One',sans-serif] text-[#3e6b85]">How We Serve You</motion.h3>
               <motion.p variants={fadeUp} className="text-lg text-[#7DBD7C] font-bold uppercase tracking-widest">A seamless, rapid-response dispatch process</motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
               {[
                  { step: '1', title: 'From Customer', icon: PhoneCall, desc: 'You call us with an emergency or service request.' },
                  { step: '2', title: 'To Our Call Center', icon: Headset, desc: 'Our dedicated team answers immediately, 24/7.' },
                  { step: '3', title: 'Tech Assigned', icon: UserCheck, desc: 'The closest certified HVAC technician is notified.' },
                  { step: '4', title: 'Tech Dispatched', icon: Truck, desc: 'Our fully-stocked van arrives at your location.' },
               ].map((item, idx) => (
                  <motion.div 
                     initial={{ opacity: 0, y: 30 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.5, delay: idx * 0.15 }}
                     key={idx} 
                     className="bg-white rounded-[2rem] p-8 border border-gray-100 hover:border-gray-200 transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] shadow-sm text-center relative overflow-hidden group"
                  >
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3e6b85] to-[#7DBD7C] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-[#3e6b85] mx-auto mb-6 shadow-inner border border-gray-100 group-hover:bg-[#3e6b85] group-hover:text-white transition-colors duration-500">
                        <item.icon size={32} />
                     </div>
                     <div className="text-[#7DBD7C] font-black text-xs uppercase tracking-widest mb-3">STEP {item.step}</div>
                     <h4 className="text-xl font-bold text-[#3e6b85] mb-4">{item.title}</h4>
                     <p className="text-gray-500 text-sm leading-relaxed font-['Georgia',serif]">{item.desc}</p>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 bg-gray-100 text-center px-4 font-sans border-t border-gray-200">
         <h2 className="text-3xl md:text-4xl font-bold text-[#3e6b85] tracking-tight mb-6 font-['Russo_One',sans-serif]">Ready to upgrade your comfort?</h2>
         <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto font-['Georgia',serif]">Contact Pilar Services today. We are the people you can count on for all your home and business comfort needs.</p>
         <button className="bg-[#7DBD7C] hover:bg-[#6ab069] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_8px_30px_rgb(125,189,124,0.3)] hover:shadow-[0_8px_30px_rgb(125,189,124,0.5)] transform hover:-translate-y-1">
            Request a Service Call
         </button>
      </section>

    </div>
  );
}
