import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Wrench, Building2, Factory, ShieldCheck } from 'lucide-react';
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

const industries = [
  {
    id: 'residential',
    title: 'Residential HVAC',
    icon: Wrench,
    image: residentialImage,
    description: "Your home is your sanctuary. We specialize in keeping Florida families comfortable year-round with highly efficient residential cooling and heating systems. Whether it's emergency repairs or a complete system replacement, our technicians treat your home with the utmost respect.",
    stats: ['Energy Efficient Systems', 'Indoor Air Quality Checks', 'Smart Thermostat Integration']
  },
  {
    id: 'commercial',
    title: 'Commercial HVAC',
    icon: Building2,
    image: commercialImage,
    description: "Downtime costs money. That's why businesses across Florida trust Pilar Services to maintain their critical infrastructure. We handle large-scale rooftop units, split systems, and provide comprehensive preventative maintenance contracts to keep your operations running smoothly.",
    stats: ['24/7 Emergency Dispatch', 'Preventative Maintenance', 'Large-Scale Installations']
  },
  {
    id: 'industrial',
    title: 'Industrial Services',
    icon: Factory,
    image: industrialImage,
    description: "Industrial facilities require specialized cooling and ventilation solutions. We have the engineering expertise to design, build, and maintain heavy-duty refrigeration, process cooling, and complex ductwork systems that meet rigorous industrial standards.",
    stats: ['Process Cooling', 'Heavy Refrigeration', 'Custom Sheet Metal']
  },
  {
    id: 'federal',
    title: 'Federal HVAC',
    icon: ShieldCheck,
    image: federalImage,
    description: "Working with government and federal facilities requires strict adherence to codes, high-security clearances, and exceptional project management. We are proud to provide highly secured, compliant HVAC installations and maintenance for federal institutions.",
    stats: ['High Security Clearance', 'Code Compliance Experts', 'Government Contracting']
  }
];

export default function Industries() {
  return (
    <div className="flex-1 w-full bg-slate-50 font-sans pt-24 md:pt-32">
      {/* HEADER */}
      <section className="py-16 md:py-24 border-b border-gray-200 bg-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div 
               initial="hidden"
               animate="visible"
               variants={staggerContainer}
               className="max-w-3xl mx-auto"
            >
               <motion.div variants={fadeUp} className="text-[#7DBD7C] font-bold text-sm uppercase tracking-widest mb-4">Sectors We Serve</motion.div>
               <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-[#3e6b85] tracking-tight mb-6 font-['Russo_One',sans-serif]">
                 Industries
               </motion.h1>
               <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-600 font-['Georgia',serif] leading-relaxed">
                 From cozy residential homes to massive, highly-secured federal complexes, we have the specialized expertise required for every sector.
               </motion.p>
            </motion.div>
         </div>
      </section>

      {/* INDUSTRIES LIST */}
      <section className="py-24">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
            {industries.map((ind, idx) => {
               const isEven = idx % 2 === 0;
               return (
                  <motion.div 
                     key={ind.id}
                     initial={{ opacity: 0, y: 50 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true, margin: "-100px" }}
                     transition={{ duration: 0.8 }}
                     className={`flex flex-col gap-12 lg:gap-20 items-center ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
                  >
                     <div className="w-full lg:w-1/2 relative group">
                        <div className="absolute inset-0 bg-[#3e6b85] rounded-[2rem] transform translate-x-4 translate-y-4 transition-transform group-hover:translate-x-6 group-hover:translate-y-6"></div>
                        <img 
                           src={ind.image} 
                           alt={ind.title} 
                           className="w-full h-[400px] object-cover rounded-[2rem] relative z-10 shadow-lg"
                        />
                     </div>
                     <div className="w-full lg:w-1/2">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-16 h-16 bg-[#7DBD7C]/20 rounded-xl flex items-center justify-center text-[#7DBD7C]">
                              <ind.icon size={32} />
                           </div>
                           <h2 className="text-3xl md:text-4xl font-bold text-[#3e6b85] font-['Russo_One',sans-serif]">{ind.title}</h2>
                        </div>
                        <p className="text-gray-600 text-lg leading-relaxed font-['Georgia',serif] mb-8">
                           {ind.description}
                        </p>
                        <ul className="space-y-3 mb-10">
                           {ind.stats.map((stat, i) => (
                              <li key={i} className="flex items-center gap-3">
                                 <div className="w-2 h-2 rounded-full bg-[#7DBD7C]"></div>
                                 <span className="text-[#3e6b85] font-bold">{stat}</span>
                              </li>
                           ))}
                        </ul>
                        <button className="px-8 py-4 border-2 border-[#3e6b85] text-[#3e6b85] hover:bg-[#3e6b85] hover:text-white font-bold rounded-full transition-colors uppercase tracking-widest text-sm shadow-sm hover:shadow-lg hover:-translate-y-1 transform">
                           Learn More
                        </button>
                     </div>
                  </motion.div>
               );
            })}
         </div>
      </section>

      {/* TRUST BANNER */}
      <section className="bg-white py-16 border-t border-gray-200 overflow-hidden text-center">
         <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-8 font-sans">Trusted by our commercial partners</p>
         <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center px-4">
            <img src="https://pilarservices.com/wp-content/uploads/2021/05/tbelllogo.png" alt="Taco Bell" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
            <img src="https://pilarservices.com/wp-content/uploads/2021/06/usps2-300x194.jpeg" alt="USPS" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
            <img src="https://pilarservices.com/wp-content/uploads/2021/06/amtrak2-300x200.jpeg" alt="Amtrak" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
            <img src="https://pilarservices.com/wp-content/uploads/2021/06/upslogo-252x300.png" alt="UPS" className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
            <img src="https://pilarservices.com/wp-content/uploads/2021/06/pizzahut-300x169.jpg" alt="Pizza Hut" className="h-10 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300" />
         </div>
      </section>
    </div>
  );
}
