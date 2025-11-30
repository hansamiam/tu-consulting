import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

export const AnimatedCounter = ({ 
  target, 
  suffix = "", 
  prefix = "",
  className = "",
  duration = 2
}: AnimatedCounterProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 50,
    stiffness: 100,
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, motionValue, target]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>
        {springValue.get() === target 
          ? target 
          : Math.round(springValue.get())
        }
      </motion.span>
      {suffix}
    </span>
  );
};
