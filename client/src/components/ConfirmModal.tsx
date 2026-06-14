import React from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="glassmorphism w-full max-w-sm rounded-2xl p-6 shadow-2xl border-slate-850">
        <div className="flex justify-between items-start mb-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-red-950/40 text-red-400" : "bg-blue-950/40 text-blue-400"}`}>
            {danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="text-sm font-bold text-white mb-1.5">{title}</h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors hover:bg-slate-850 text-xs disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50 ${
              danger
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
