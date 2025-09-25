import React from 'react';
import { typography, button } from '../styles/theme';
import { ThemeToggle } from './ThemeToggle';

interface AppFooterProps {
  onShowDocs: () => void;
  onShowFAQ: () => void;
  onShowSchema: () => void;
  onClearData: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({ onShowDocs, onShowFAQ, onShowSchema, onClearData, theme, onToggleTheme }) => {
  return (
    <footer className="text-center py-8 text-slate-500 dark:text-slate-500">
      <div className="flex justify-center items-center gap-6 mb-4">
        <button 
          onClick={onShowDocs} 
          className={typography.link}
          aria-label="View application documentation"
        >
          Documentation
        </button>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <button 
          onClick={onShowFAQ} 
          className={typography.link}
          aria-label="View frequently asked questions"
        >
          FAQ
        </button>
         <span className="text-slate-300 dark:text-slate-700">|</span>
        <button 
          onClick={onShowSchema} 
          className={typography.link}
          aria-label="View application data schema"
        >
          Data Schema
        </button>
         <span className="text-slate-300 dark:text-slate-700">|</span>
        <button 
          onClick={onClearData} 
          className={button.dangerLink}
          aria-label="Clear all application data"
        >
          Clear All Data
        </button>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <div className="mt-8">
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Created by Alverto Ortega with assistance from Google's Gemini AI.
        </p>
      </div>
    </footer>
  );
};
