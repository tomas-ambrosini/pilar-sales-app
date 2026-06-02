import React from 'react';
import { motion } from 'framer-motion';
import { Award, Target, Users, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function About() {
  return (
    <div className="flex-1 w-full bg-white font-sans pt-24 md:pt-32">
      {/* HERO SECTION */}
      <section className="py-16 md:py-24 bg-slate-50 border-b border-gray-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
               initial="hidden"
               animate="visible"
               variants={staggerContainer}
               className="flex flex-col lg:flex-row items-center gap-16"
            >
               <div className="w-full lg:w-1/2">
                  <motion.div variants={fadeUp} className="text-[#7DBD7C] font-bold text-sm uppercase tracking-widest mb-4">About Pilar Services</motion.div>
                  <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-[#3e6b85] tracking-tight mb-8 font-['Russo_One',sans-serif]">
                    Cooling the South <br className="hidden md:block"/>for 3 Decades.
                  </motion.h1>
                  <motion.div variants={fadeUp} className="text-lg md:text-xl text-gray-600 font-['Georgia',serif] leading-relaxed space-y-6">
                     <p>Established in 1991, our family-owned-and-operated HVAC business has been cooling the South for more than 3 decades. We firmly believe that choosing the right HVAC company should be NO SWEAT.</p>
                     <p>Our commitment to your comfort is long-term. We offer expert installation and maintenance by a skilled team of factory-trained professionals.</p>
                  </motion.div>
               </div>
               <div className="w-full lg:w-1/2">
                  <motion.div variants={fadeUp} className="relative">
                     <img 
                        src="https://pilarservices.com/wp-content/uploads/2021/05/PSI_About-wearecommitted-image.jpg" 
                        alt="Pilar Services Team" 
                        className="w-full h-auto rounded-[2rem] shadow-2xl relative z-10"
                     />
                     <div className="absolute -bottom-8 -left-8 bg-[#3e6b85] p-8 rounded-3xl shadow-xl z-20 text-white">
                        <div className="text-6xl font-black font-['Russo_One',sans-serif] mb-2">30+</div>
                        <div className="text-[#7DBD7C] font-bold uppercase tracking-widest text-sm">Years of Excellence</div>
                     </div>
                  </motion.div>
               </div>
            </motion.div>
         </div>
      </section>

      {/* CORE VALUES */}
      <section className="py-24 bg-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true }}
               variants={staggerContainer}
               className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
               {[
                  { title: 'Excellence', icon: Award, desc: 'We never compromise on the quality of our work or the equipment we install.' },
                  { title: 'Precision', icon: Target, desc: 'Factory-trained technicians ensure every specification is met perfectly.' },
                  { title: 'Family Owned', icon: Users, desc: 'Built on relationships, honesty, and reliability since 1991.' },
                  { title: 'Customer First', icon: ThumbsUp, desc: 'Your comfort and satisfaction are the absolute priority.' },
               ].map((value, idx) => (
                  <motion.div variants={fadeUp} key={idx} className="bg-slate-50 p-8 rounded-3xl border border-gray-100 text-center hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl">
                     <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[#7DBD7C] mx-auto mb-6 shadow-sm">
                        <value.icon size={28} />
                     </div>
                     <h3 className="text-xl font-bold text-[#3e6b85] mb-4">{value.title}</h3>
                     <p className="text-gray-600 text-sm leading-relaxed font-['Georgia',serif]">{value.desc}</p>
                  </motion.div>
               ))}
            </motion.div>
         </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 bg-gray-100 text-center px-4 border-t border-gray-200">
         <h2 className="text-3xl md:text-4xl font-bold text-[#3e6b85] tracking-tight mb-6 font-['Russo_One',sans-serif]">Join the Pilar Family</h2>
         <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto font-['Georgia',serif]">Experience the difference of working with Florida's premier mechanical contractor.</p>
         <button className="px-8 py-4 bg-[#3e6b85] hover:bg-[#2b4a5d] text-white rounded-full font-bold text-lg transition-all shadow-[0_8px_30px_rgb(62,107,133,0.3)] hover:shadow-[0_8px_30px_rgb(62,107,133,0.5)] transform hover:-translate-y-1">
            Contact Us Today
         </button>
      </section>
    </div>
  );
}
