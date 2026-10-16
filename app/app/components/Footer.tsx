"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="border-t border-gray-800 px-6 lg:px-16 py-14 lg:py-16">
      {/* Floating elements */}
      <div>
        <motion.div
          className="h-40 w-40 bg-transparent pb-4 rounded-2xl border-1 border-sky-500/20 z-10 absolute"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        ></motion.div>
      </div>
      <div className="z-40 max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 lg:gap-16">
        {/* Left Section - CTA */}
        <div className="flex-1">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "quantico, sans-serif",
              letterSpacing: "-0.02em",
            }}
            className="text-4xl lg:text-6xl font-thin font-black text-[#111111] mb-4"
          >
            READY?
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[#666] text-sm lg:text-base"
          >
            Say no to fake products. Join the movement.
          </motion.p>
        </div>

        {/* Middle section for large screens */}
        {/* Built On Badge */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-end gap-2">
          <div className="flex gap-2">
            <span className="text-gray-600 inline-block mt-1 text-[11px] tracking-widest uppercase">
              Built for MLH Hackoctoberfest
            </span>
          </div>
        </div>

        {/* Right Section - Copyright & Built On */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-left lg:text-right z-40 lg:pt-1"
        >
          {/* Copyright */}
          <div className="text-gray-500 text-sm mb-3">© 2026 Genium</div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
