import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function Contact() {
  return (
    <div className="flex-1 w-full bg-slate-50 font-sans pt-24 md:pt-32 min-h-screen relative overflow-hidden">
      {/* Background Decorative Blob */}
      <div className="absolute top-0 right-0 -mr-64 -mt-64 w-[800px] h-[800px] bg-[#7DBD7C]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* HEADER SECTION */}
      <section className="py-16 md:py-24">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
               initial="hidden"
               animate="visible"
               variants={staggerContainer}
               className="text-center max-w-3xl mx-auto mb-20"
            >
               <motion.div variants={fadeUp} className="text-[#7DBD7C] font-bold text-sm uppercase tracking-widest mb-4">Get In Touch</motion.div>
               <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-[#3e6b85] tracking-tight mb-8 font-['Russo_One',sans-serif]">
                 Contact HQ.
               </motion.h1>
               <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-600 font-['Georgia',serif] leading-relaxed">
                  Whether you need emergency 24/7 dispatch or want to discuss a new commercial installation, our team is ready to help.
               </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
               {/* Contact Info Cards */}
               <motion.div 
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-8"
               >
                  <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex items-start gap-6 hover:shadow-xl transition-all duration-300">
                     <div className="w-16 h-16 bg-[#3e6b85]/10 rounded-full flex items-center justify-center text-[#3e6b85] shrink-0">
                        <MapPin size={28} />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-[#3e6b85] mb-2 font-['Russo_One',sans-serif]">Headquarters</h3>
                        <p className="text-gray-600 font-['Georgia',serif] leading-relaxed">
                           10200 NW 25th Street #202<br/>
                           Doral, FL 33172
                        </p>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex items-start gap-6 hover:shadow-xl transition-all duration-300">
                     <div className="w-16 h-16 bg-[#7DBD7C]/20 rounded-full flex items-center justify-center text-[#7DBD7C] shrink-0">
                        <Phone size={28} />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-[#3e6b85] mb-2 font-['Russo_One',sans-serif]">Dispatch Center</h3>
                        <p className="text-gray-600 font-['Georgia',serif] leading-relaxed mb-2">
                           Available 24 hours a day, 7 days a week for emergency service calls.
                        </p>
                        <a href="tel:305-888-2421" className="text-2xl font-black text-[#7DBD7C] hover:text-[#6ab069] transition-colors">(305) 888-2421</a>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                     <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center flex flex-col items-center hover:shadow-xl transition-all duration-300">
                        <Clock className="text-[#3e6b85] mb-3" size={24} />
                        <h4 className="font-bold text-[#3e6b85] mb-1">Office Hours</h4>
                        <p className="text-sm text-gray-500">Mon - Fri<br/>8:00 AM - 5:00 PM</p>
                     </div>
                     <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center flex flex-col items-center hover:shadow-xl transition-all duration-300">
                        <Mail className="text-[#3e6b85] mb-3" size={24} />
                        <h4 className="font-bold text-[#3e6b85] mb-1">Email Us</h4>
                        <p className="text-sm text-gray-500">Fast response guaranteed.</p>
                     </div>
                  </div>
               </motion.div>

               {/* Glassmorphism Contact Form */}
               <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgb(0,0,0,0.08)] border border-white/50 relative overflow-hidden"
               >
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#3e6b85] to-[#7DBD7C]"></div>
                  <h3 className="text-2xl font-bold text-[#3e6b85] mb-8 font-['Russo_One',sans-serif]">Send a Message</h3>
                  
                  <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">First Name</label>
                           <input type="text" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7DBD7C] focus:bg-white transition-all shadow-sm" placeholder="John" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Last Name</label>
                           <input type="text" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7DBD7C] focus:bg-white transition-all shadow-sm" placeholder="Doe" />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Email Address</label>
                        <input type="email" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7DBD7C] focus:bg-white transition-all shadow-sm" placeholder="john@example.com" />
                     </div>

                     <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Phone Number</label>
                        <input type="tel" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7DBD7C] focus:bg-white transition-all shadow-sm" placeholder="(555) 555-5555" />
                     </div>

                     <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">How can we help?</label>
                        <textarea rows="4" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7DBD7C] focus:bg-white transition-all shadow-sm resize-none" placeholder="Describe your HVAC needs..."></textarea>
                     </div>

                     <button type="submit" className="w-full bg-[#3e6b85] hover:bg-[#2b4a5d] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_8px_30px_rgb(62,107,133,0.3)] hover:shadow-[0_8px_30px_rgb(62,107,133,0.5)] transform hover:-translate-y-1 flex items-center justify-center gap-3">
                        Submit Request <Send size={20} />
                     </button>
                  </form>
               </motion.div>
            </div>
         </div>
      </section>
    </div>
  );
}
