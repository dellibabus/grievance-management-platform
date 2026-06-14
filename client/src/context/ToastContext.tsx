import React, { createContext, useContext, useState, useCallback } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: ToastMessage["type"]) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message: string, type: ToastMessage["type"] = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    // Auto dismiss toast after 5 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 5000);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      {/* Absolute overlay container for notifications */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`pointer-events-auto cursor-pointer p-4 rounded-xl border shadow-2xl transition-all duration-300 hover:scale-[1.02] flex flex-col backdrop-blur-md ${
              t.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
                : t.type === "warning"
                ? "bg-amber-950/90 text-amber-200 border-amber-500/40"
                : t.type === "error"
                ? "bg-red-950/90 text-red-200 border-red-500/40"
                : "bg-blue-950/90 text-blue-200 border-blue-500/40"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="font-semibold text-sm leading-tight">{t.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(t.id);
                }}
                className="text-xs opacity-50 hover:opacity-100 transition-opacity ml-2"
              >
                ✕
              </button>
            </div>
            <p className="text-xs opacity-85 mt-1.5 leading-relaxed">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
