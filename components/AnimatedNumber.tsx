import { useEffect, useRef, useState } from "react";
import { Text, TextProps } from "react-native";

interface AnimatedNumberProps extends TextProps {
  value: number | null;
  formatValue: (value: number) => string;
  duration?: number;
  fallback?: string;
}

export function AnimatedNumber({
  value,
  formatValue,
  duration = 450,
  fallback = "...",
  ...textProps
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);

  useEffect(() => {
    if (value === null) {
      displayValueRef.current = null;
      setDisplayValue(null);
      return;
    }

    const startValue = displayValueRef.current ?? value;
    const difference = value - startValue;
    if (difference === 0) return;

    let animationFrame: number;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + difference * easedProgress);
      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, value]);

  return <Text {...textProps}>{displayValue === null ? fallback : formatValue(displayValue)}</Text>;
}
