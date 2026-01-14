import { useEffect } from "react";
import confetti from "canvas-confetti";

export interface ConfettiDuckProps {
  trigger: boolean;
  onComplete?: () => void;
}

let canard = confetti.shapeFromText({ text: "🦆", scalar: 2 });

export default function ConfettiDuck({
  trigger,
  onComplete,
}: ConfettiDuckProps) {
  useEffect(() => {
    if (trigger) {
      // Left cannon shoot
      confetti({
        particleCount: 40,
        angle: 45,
        spread: 45,
        origin: { x: 0, y: 0.7 },
        shapes: [canard],
        gravity: 3,
        scalar: 2.5,
        startVelocity: 60,
      });

      // Right cannon shot - upwards and to the left
      confetti({
        particleCount: 40,
        angle: 135,
        spread: 45,
        origin: { x: 1, y: 0.7 },
        shapes: [canard],
        gravity: 3,
        scalar: 2.5,
        startVelocity: 60,
      });

      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    }
  }, [trigger, onComplete]);

  return null;
}
