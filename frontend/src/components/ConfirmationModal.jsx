import React from "react";
import { X, AlertTriangle } from "lucide-react";

const ConfirmationModal = React.memo(
  ({ isOpen, title, message, confirmLabel = "Confirm", onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="w-full max-w-sm bg-dark-300 border border-dark-100 rounded-xl shadow-dark-lg p-6 animate-scale-in">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-danger-500/10 text-danger-400">
              <AlertTriangle size={24} />
            </div>
          </div>

          {/* Content */}
          <h3
            id="confirm-modal-title"
            className="text-lg font-semibold text-surface-100 text-center mb-2"
          >
            {title}
          </h3>
          <p className="text-sm text-dark-50 text-center mb-6">{message}</p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 btn-danger"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

ConfirmationModal.displayName = "ConfirmationModal";
export default ConfirmationModal;
