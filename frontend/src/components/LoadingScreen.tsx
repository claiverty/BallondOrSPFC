import { useEffect, useState } from 'react';

export function LoadingScreen({
  label = 'Preparando o palco…',
  loading = true,
  dismissOnComplete = true,
  onDismiss,
}: {
  label?: string;
  loading?: boolean;
  dismissOnComplete?: boolean;
  onDismiss?: () => void;
}) {
  const [visible, setVisible] = useState(loading);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.getElementById('boot-splash')?.remove();
  }, []);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setProgress(0);
      return;
    }

    if (!visible) return;

    setProgress(100);
    if (!dismissOnComplete) return;
    const timeout = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 260);
    return () => window.clearTimeout(timeout);
  }, [dismissOnComplete, loading, onDismiss, visible]);

  useEffect(() => {
    if (!loading || !visible) return;

    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(94, current + 2));
    }, 45);

    return () => window.clearInterval(interval);
  }, [loading, visible]);

  if (!visible) return null;

  return (
    <div className="app-loading-screen" role="status" aria-live="polite">
      <div className="app-loading-mark" aria-hidden="true">
        <img src="/images/spfc-gold-logo.webp" alt="" width="72" height="72" />
      </div>
      <p className="app-loading-eyebrow">BALLON D’OR SÃO PAULO</p>
      <p className="app-loading-label">{label}</p>
      <div className="app-loading-progress">
        <div
          className="app-loading-progress-track"
          role="progressbar"
          aria-label="Carregamento"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <span className="app-loading-progress-value">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
