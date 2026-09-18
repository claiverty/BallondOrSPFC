import { useState } from 'react';
import type { Edition } from '@awards/contracts';
import { demoMode, request } from '../../lib/auth';
export function MediaPanel({
  edition,
  onMessage,
}: {
  edition: Edition;
  onMessage: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="admin-panel">
      <h2>Imagens da premiação</h2>
      <p>
        Envie PNG, JPEG ou WebP de até 2 MB para o Storage. Copie a URL retornada para o banner,
        logo ou categoria.
      </p>
      <label>
        Imagem
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (demoMode) {
              onMessage('O upload real requer conexão com o Supabase Storage.');
              return;
            }
            if (file.size > 2 * 1024 * 1024) {
              onMessage('A imagem deve ter até 2 MB.');
              return;
            }
            setBusy(true);
            try {
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const result = await request<{ url: string }>('/admin/media', 'POST', {
                edition_id: edition.id,
                mime_type: file.type,
                base64,
              });
              onMessage(`Imagem disponível: ${result.url}`);
            } catch (error) {
              onMessage(error instanceof Error ? error.message : 'Não foi possível enviar.');
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {busy && <p role="status">Enviando imagem…</p>}
    </section>
  );
}
