"use client";
import React, { useState, useEffect } from 'react';

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  useEffect(() => {
    let deadline = localStorage.getItem("promo_deadline");
    if (!deadline) {
      deadline = new Date().getTime() + 3 * 60 * 60 * 1000;
      localStorage.setItem("promo_deadline", deadline);
    } else {
      deadline = parseInt(deadline, 10);
    }

    const updateClock = () => {
      const now = new Date().getTime();
      let distance = deadline - now;

      // Reset rolling window if elapsed
      if (distance < 0) {
        const newDeadline = new Date().getTime() + 3 * 60 * 60 * 1000;
        localStorage.setItem("promo_deadline", newDeadline);
        deadline = newDeadline;
        distance = newDeadline - now;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setTimeLeft(formatted);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  return <span>{timeLeft}</span>;
};
export default CountdownTimer;
