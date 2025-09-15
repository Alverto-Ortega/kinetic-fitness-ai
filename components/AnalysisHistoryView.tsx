import React from 'react';
import { BodyAnalysis } from '../types';
import { typography, card } from '../styles/theme';

interface AnalysisHistoryViewProps {
  history: BodyAnalysis[];
}

/**
 * A component to parse and render the AI's analysis text,
 * converting markdown-style bolding into styled HTML.
 */
const FormattedAnalysis: React.FC<{ text: string }> = ({ text }) => {
  // Trim whitespace and split the text into lines, filtering out any empty ones.
  const lines = text.trim().split('\n').filter(line => line.trim() !== '');

  return (
    <>
      {lines.map((line, index) => {
        // Split each line by the bold delimiter '**'.
        // This results in an array where every odd-indexed element was inside '**'.
        const parts = line.split('**');
        return (
          // Use a <p> tag for each line to maintain block-level separation.
          <p key={index} className="mb-1 last:mb-0">
            {parts.map((part, i) =>
              // If the index is odd, it was bolded. Wrap it in a <strong> tag with accent color.
              // Otherwise, render it as plain text in a <span>.
              i % 2 === 1 ? (
                <strong key={i} className="font-semibold text-indigo-600 dark:text-indigo-400">{part}</strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </>
  );
};


export const AnalysisHistoryView: React.FC<AnalysisHistoryViewProps> = ({ history }) => {
  if (history.length === 0) {
    return null; // Don't render anything if there's no history
  }

  return (
    <div className="mt-12">
      <h3 className={typography.h2}>Physique Analysis History</h3>
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2 mt-6">
        {history.slice().reverse().map((entry, index) => (
          <div key={index} className={card.base}>
            <p className={`${typography.pMuted} text-xs mb-2`}>
              {new Date(entry.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
            <div className={`${typography.p} text-sm`}>
              <FormattedAnalysis text={entry.result} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
