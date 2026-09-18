import { useEffect, useState } from 'react';
export function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((Date.parse(date) - now) / 1000));
  return (
    <div className="countdown" aria-label="Contagem regressiva para a próxima etapa">
      {[
        [Math.floor(seconds / 86400), 'DIAS'],
        [Math.floor(seconds / 3600) % 24, 'HORAS'],
        [Math.floor(seconds / 60) % 60, 'MINUTOS'],
      ].map(([n, label]) => (
        <div key={label}>
          <strong>{String(n).padStart(2, '0')}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
