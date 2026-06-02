import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const faqs = [
  {
    question: "Can I Troubleshoot Before Calling a Contractor?",
    answer: "The answer is Yes. Here are some simple procedures you can perform before going to the expense of a service call: Check disconnect switches (indoor and outdoor if you have a split system). Make sure that circuit breakers are ON or that fuses have not blown. Check for sufficient airflow by checking the air filter and ensuring vents are not blocked."
  },
  {
    question: "How often should I have my HVAC system serviced?",
    answer: "We strongly recommend preventative maintenance at least twice a year—once in the spring before the cooling season, and once in the fall before the heating season. Regular maintenance ensures your system runs efficiently, prevents unexpected breakdowns, and extends the lifespan of your equipment."
  },
  {
    question: "What size HVAC system do I need for my building?",
    answer: "System sizing is crucial. An oversized system will cycle on and off too frequently (short cycling), failing to remove humidity properly. An undersized system will run constantly and struggle to keep the space comfortable. We perform detailed Load Calculations (Manual J for residential or commercial equivalent) taking into account square footage, insulation, windows, and local climate to recommend the perfect size."
  },
  {
    question: "Why is my AC running but not cooling?",
    answer: "There are several common culprits: a dirty air filter blocking airflow, low refrigerant levels (indicating a leak), a dirty condenser coil, or a malfunctioning compressor. If simply changing the air filter doesn't resolve the issue, it's time to call in a Pilar Services certified technician to diagnose the problem accurately."
  },
  {
    question: "Do you offer emergency services?",
    answer: "Absolutely. We understand that HVAC emergencies don't happen on a schedule, especially in the Florida heat. Our dedicated dispatch team is available 24/7 to handle critical breakdowns for both our residential and commercial clients."
  }
];

export default function FAQs() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="flex-1 w-full bg-slate-50 font-sans pt-24 md:pt-32 min-h-screen">
      {/* HEADER SECTION */}
      <section className="py-16 md:py-24 bg-white border-b border-gray-200">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div 
               initial="hidden"
               animate="visible"
               variants={staggerContainer}
            >
               <motion.div variants={fadeUp} className="text-[#7DBD7C] font-bold text-sm uppercase tracking-widest mb-4">Support & Answers</motion.div>
               <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-[#3e6b85] tracking-tight mb-8 font-['Russo_One',sans-serif]">
                 Frequently Asked Questions
               </motion.h1>
               <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-600 font-['Georgia',serif] leading-relaxed">
                  Have a question before you request a service call? We've compiled the most common inquiries to help you troubleshoot and understand your HVAC system better.
               </motion.p>
            </motion.div>
         </div>
      </section>

      {/* ACCORDION SECTION */}
      <section className="py-24">
         <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            {faqs.map((faq, index) => {
               const isOpen = openIndex === index;
               return (
                  <motion.div 
                     key={index}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.5, delay: index * 0.1 }}
                     className={`bg-white border transition-all duration-300 rounded-[2rem] overflow-hidden ${
                        isOpen ? 'border-[#7DBD7C] shadow-[0_8px_30px_rgb(125,189,124,0.15)]' : 'border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg hover:border-gray-200'
                     }`}
                  >
                     <button 
                        onClick={() => setOpenIndex(isOpen ? -1 : index)}
                        className="w-full text-left px-8 py-6 flex items-center justify-between focus:outline-none"
                     >
                        <span className={`font-bold text-lg font-['Russo_One',sans-serif] pr-8 ${isOpen ? 'text-[#7DBD7C]' : 'text-[#3e6b85]'}`}>
                           {faq.question}
                        </span>
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-500 ${isOpen ? 'bg-[#7DBD7C] text-white rotate-180' : 'bg-slate-50 text-[#3e6b85]'}`}>
                           <ChevronDown size={20} />
                        </div>
                     </button>
                     
                     <AnimatePresence>
                        {isOpen && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                           >
                              <div className="px-8 pb-8 text-gray-600 font-['Georgia',serif] leading-relaxed">
                                 {faq.answer}
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
               );
            })}
         </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 bg-[#2b4a5d] text-center px-4">
         <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6 font-['Russo_One',sans-serif]">Still need help?</h2>
         <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto font-['Georgia',serif]">Our experts are available 24/7 to answer your questions and dispatch a technician to your location.</p>
         <button className="px-8 py-4 bg-[#7DBD7C] hover:bg-[#6ab069] text-white rounded-full font-bold text-lg transition-all shadow-[0_8px_30px_rgb(125,189,124,0.3)] hover:shadow-[0_8px_30px_rgb(125,189,124,0.5)] transform hover:-translate-y-1">
            Contact Us Today
         </button>
      </section>
    </div>
  );
}
