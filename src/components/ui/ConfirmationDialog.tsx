import React, { useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={onCancel}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-message"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${destructive ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
            {destructive ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <h2 id="confirmation-dialog-title" className="text-lg font-bold text-slate-900">{title}</h2>
            <p id="confirmation-dialog-message" className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {cancelLabel && <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>}
          <Button variant={destructive ? 'danger' : 'primary'} onClick={() => void onConfirm()}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
};
