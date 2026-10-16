"use client";

import { motion } from "framer-motion";

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
}

export const BlurText = ({
  text,
  delay = 50,
  className = "",
  animateBy = "words",
  direction = "top",
}: BlurTextProps) => {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  return (
    <span className={`inline-block ${className}`}>
      {elements.map((element, index) => (
        <motion.span
          key={index}
          initial={{
            opacity: 0,
            filter: "blur(10px)",
            y: direction === "top" ? -15 : 15,
          }}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
          }}
          transition={{
            duration: 0.5,
            delay: (index * delay) / 1000,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="inline-block whitespace-pre"
        >
          {element}
          {animateBy === "words" && index < elements.length - 1 && " "}
        </motion.span>
      ))}
    </span>
  );
};

export default BlurText;
