import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FloatingBadgeProps {
  children: ReactNode;
  className?: string;
}

export const FloatingBadge = ({ children, className = "" }: FloatingBadgeProps) => {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};
