"use client";

import { useEffect, useState, useRef } from "react";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  sequential?: boolean;
  animateOn?: "mount" | "hover";
}

export const DecryptedText = ({
  text,
  speed = 40,
  maxIterations = 10,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()",
  className = "",
  encryptedClassName = "opacity-60 font-mono",
  sequential = true,
  animateOn = "mount",
}: DecryptedTextProps) => {
  const [displayText, setDisplayText] = useState(text);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAnimation = () => {
    let iteration = 0;
    setIsDecrypted(false);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(() => {
        return text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (sequential) {
              if (index < iteration) {
                return text[index];
              }
            } else {
              if (iteration >= maxIterations) {
                return text[index];
              }
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("");
      });

      iteration += 1;

      if (iteration > (sequential ? text.length : maxIterations)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsDecrypted(true);
      }
    }, speed);
  };

  useEffect(() => {
    if (animateOn === "mount") {
      startAnimation();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  return (
    <span
      className={className}
      onMouseEnter={() => {
        if (animateOn === "hover") startAnimation();
      }}
    >
      <span className={isDecrypted ? "" : encryptedClassName}>{displayText}</span>
    </span>
  );
};

export default DecryptedText;
