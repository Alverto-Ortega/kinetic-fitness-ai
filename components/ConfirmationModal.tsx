import React from 'react';
import { modal, button, typography } from '../styles/theme';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className={modal.backdrop} onClick={onClose}>
      <div 
        className={`${modal.container} max-w-md`} 
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
      >
        <h2 id="confirmation-title" className="text-xl font-bold text-white mb-4">{title}</h2>
        <p id="confirmation-message" className={typography.pMuted + " mb-6"}>{message}</p>
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className={button.secondarySmall}>
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={button.danger}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};