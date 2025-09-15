import React from 'react';
import { notice } from '../styles/theme';

interface OfflineWarningProps {
  isOnline: boolean;
}

export const OfflineWarning: React.FC<OfflineWarningProps> = ({ isOnline }) => {
  if (isOnline) {
    return null;
  }

  return (
    <div className={notice.alert}>
      You are currently offline. AI features are disabled.
    </div>
  );
};
