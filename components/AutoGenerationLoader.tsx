import React, { useState, useEffect } from 'react';
import { spinnerLarge, typography } from '../styles/theme';

const messages = [
  "Analyzing your recent performance...",
  "Applying principles of progressive overload...",
  "Crafting your next challenge...",
  "Your new plan is almost ready!"
];

export const AutoGenerationLoader: React.FC = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center text-center p-6 animate-fade-in z-50">
      <div className="mb-8">
        <svg className={spinnerLarge} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h2 className={`${typography.h2} mb-4`}>Generating Your Next Plan</h2>
      <p className={`${typography.p} text-lg transition-opacity duration-500`}>
        {messages[currentMessageIndex]}
      </p>
    </div>
  );
};