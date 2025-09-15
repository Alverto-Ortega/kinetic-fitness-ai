// A utility for combining class names, similar to the 'clsx' or 'classnames' library.
// This is helpful for conditionally applying styles.
export const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const typography = {
  h1: 'text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white',
  h2: 'text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white',
  h3: 'text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400',
  p: 'text-base md:text-lg text-slate-700 dark:text-slate-300 leading-relaxed',
  pMuted: 'text-sm md:text-base text-slate-500 dark:text-slate-400',
  label: 'block text-base font-medium text-slate-800 dark:text-slate-300 mb-2',
  small: 'text-sm text-slate-600 dark:text-slate-500',
  link: 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-semibold transition-colors',
  accent: 'text-indigo-600 dark:text-indigo-400',
};

export const button = {
  primary: 'w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg text-xl hover:bg-indigo-700 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-400 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2',
  primarySmall: 'bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-400 transition-transform transform enabled:hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed',
  secondary: 'bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600',
  secondarySmall: 'bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white',
  tertiary: 'text-sm font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg dark:text-slate-400 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg',
  dangerLarge: 'bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-6 rounded-lg dark:bg-red-800 dark:hover:bg-red-700',
  link: 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold',
  dangerLink: 'text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-sm font-semibold transition-colors',
  icon: 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors',
  effort: 'text-white font-bold py-3 px-6 rounded-lg w-32',
};

export const form = {
  select: 'w-full bg-slate-100 border-slate-300 text-slate-900 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400',
  checkboxLabel: 'flex items-center justify-center space-x-2 bg-slate-100 p-2 rounded-md transition-colors cursor-pointer hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 has-[:checked]:bg-indigo-600 has-[:checked]:text-white has-[:checked]:font-bold dark:has-[:checked]:bg-indigo-500 dark:has-[:checked]:text-white',
  checkboxLabelDisabled: 'cursor-not-allowed opacity-50',
  checkbox: 'form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-600 rounded focus:ring-indigo-500',
  textInput: 'w-full bg-slate-200 border-slate-300 text-slate-900 rounded-md p-2 text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white',
};

export const card = {
  base: 'relative bg-white border border-slate-200 rounded-lg p-6 dark:bg-slate-900 dark:border-slate-800',
  interactive: 'transition-all duration-300',
  highlight: 'hover:border-indigo-500/50',
  disabled: 'opacity-50 cursor-not-allowed',
  completed: 'opacity-60 bg-slate-100 dark:bg-slate-800/50',
};

export const modal = {
  backdrop: 'fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 animate-fade-in',
  container: 'bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 border border-slate-200 dark:border-slate-700',
  containerLarge: 'bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 border border-slate-200 dark:border-slate-700',
  containerXLarge: 'bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 sm:p-8 border-slate-200 dark:border-slate-700',
  closeButton: 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-3xl leading-none',
};

export const notice = {
  warning: 'p-3 bg-amber-100 border border-amber-400 text-amber-800 rounded-lg text-sm flex items-start gap-3 dark:bg-amber-900/50 dark:border-amber-700/60 dark:text-amber-300',
  info: 'p-4 bg-sky-100 border border-sky-400 text-sky-800 rounded-lg text-sm flex items-center gap-3 dark:bg-sky-900/50 dark:border-sky-700/60 dark:text-sky-300',
  alert: 'bg-red-600 text-white text-center p-2 text-sm font-semibold animate-fade-in dark:bg-red-800',
};

export const layout = {
  pageContainer: 'bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 min-h-screen font-sans flex flex-col transition-colors duration-300',
  mainContent: 'flex-grow',
  container: 'p-4 sm:p-6 md:p-8 w-full max-w-4xl mx-auto',
  containerLarge: 'p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto',
};

export const spinner = 'animate-spin h-5 w-5';
export const spinnerLarge = 'animate-spin h-16 w-16 text-indigo-600 dark:text-indigo-400';

export const misc = {
  hr: 'border-b border-slate-200 dark:border-slate-700 pb-3 mb-4',
  proseContainer: 'space-y-6',
};