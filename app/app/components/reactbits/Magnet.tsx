"use client";

import { useState, useRef, ReactNode, MouseEvent } from "react";
import { motion, Transition } from "framer-motion";

interface MagnetProps {
  children: ReactNode;
  padding?: number;
  disabled?: boolean;
  magnetStrength?: number;
  activeTransition?: Transition;
  inactiveTransition?: Transition;
  className?: string;
  onClick?: () => void;
}

export const Magnet = ({
  children,
  padding = 80,
  disabled = false,
  magnetStrength = 3,
  activeTransition = { type: "spring", damping: 15, stiffness: 180, mass: 0.1 },
  inactiveTransition = {
    type: "spring",
    damping: 14,
    stiffness: 120,
    mass: 0.1,
  },
  className = "",
  onClick,
}: MagnetProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current || disabled) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distX = Math.abs(centerX - e.clientX);
    const distY = Math.abs(centerY - e.clientY);

    if (distX < width / 2 + padding && distY < height / 2 + padding) {
      setPosition({
        x: (e.clientX - centerX) / magnetStrength,
        y: (e.clientY - centerY) / magnetStrength,
      });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={
        position.x !== 0 || position.y !== 0
          ? activeTransition
          : inactiveTransition
      }
      className={`inline-block ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default Magnet;
