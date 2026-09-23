import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Edition, Winner } from '@awards/contracts';
import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { demoMode, request } from '../../lib/auth';
import { demoAllWinners } from '../../lib/demo';
import {
  demoArtworkKey,
  getDemoArtworkUrls,
  removeDemoArtwork,
  saveDemoArtwork,
} from '../../lib/demo-media';
import { winnerCardAssets } from '../../lib/winner-card-assets';

type HallWinner = Pick<
  Winner,
  | 'edition_id'
  | 'edition_name'
  | 'year'
  | 'edition_slug'
  | 'category_id'
  | 'category_name'
  | 'category_slug'
  | 'nominee_id'
  | 'display_name'
  | 'username'
  | 'avatar_url'
  | 'rank'
> & { hall_of_fame_image_url: string | null };

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result);
      resolve(content.slice(content.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export function MediaPanel({
  edition,
  onMessage,
}: {
  edition: Edition;
  onMessage: (m: string) => void;
}) {
  const client = useQueryClient();
  const queryKey = ['admin', 'hall-media', edition.id] as const;
  const winners = useQuery({
    queryKey,
    queryFn: async () => {
      if (!demoMode) return request<HallWinner[]>(`/admin/media/${edition.id}`);
      const artwork = await getDemoArtworkUrls();
      return demoAllWinners
        .filter((winner) => winner.edition_id === edition.id && winner.rank === 1)
        .map((winner) => ({
          ...winner,
          hall_of_fame_image_url:
            artwork.get(demoArtworkKey(winner.edition_id, winner.category_id)) ?? null,
        }));
    },
    enabled: !!edition.id,
  });

  const upload = useMutation({
    mutationFn: async ({ winner, file }: { winner: HallWinner; file: File }) => {
      if (demoMode) {
        await saveDemoArtwork(edition.id, winner.category_id, file);
        return;
      }
      const base64 = await toBase64(file);
      await request<{ url: string }>('/admin/media', 'POST', {
        edition_id: edition.id,
        category_id: winner.category_id,
        mime_type: file.type,
        base64,
      });
    },
    onSuccess: (_data, { winner }) => {
      onMessage(`Arte de ${winner.display_name} salva no Hall da Fama.`);
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ['winners'] });
    },
    onError: (error) =>
      onMessage(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.'),
  });

  const remove = useMutation({
    mutationFn: async (winner: HallWinner) => {
      if (demoMode) {
        await removeDemoArtwork(edition.id, winner.category_id);
        return;
      }
      await request<{ removed: boolean }>(
        `/admin/media/${edition.id}/${winner.category_id}`,
        'DELETE',
      );
    },
    onSuccess: (_data, winner) => {
      onMessage(`Arte personalizada de ${winner.display_name} removida.`);
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ['winners'] });
    },
    onError: (error) =>
      onMessage(error instanceof Error ? error.message : 'Não foi possível remover a imagem.'),
  });

  const busy = upload.isPending || remove.isPending;
  return (
    <section className="admin-panel media-panel">
      <div className="panel-heading media-panel-heading">
        <div>
          <span className="eyebrow">HALL DA FAMA · {edition.year}</span>
          <h2>Artes dos vencedores</h2>
          <p>
            Envie uma imagem personalizada para cada vencedor. Ela aparece somente no Hall da Fama e
            substitui a arte padrão daquela categoria.
          </p>
        </div>
      </div>
      <p className="media-panel-guidance">
        PNG, JPEG ou WebP · até 2 MB. As artes ficam disponíveis depois que os resultados são
        publicados.
      </p>

      {demoMode && (
        <p className="media-demo-note" role="status">
          Prévia demonstrativa: as artes enviadas ficam salvas somente neste navegador e aparecem
          no Hall da Fama de teste. Nenhum dado real é alterado.
        </p>
      )}
      {winners.isLoading ? (
        <p className="media-panel-state" role="status">
          <LoaderCircle size={17} aria-hidden="true" /> Carregando vencedores…
        </p>
      ) : winners.error ? (
        <p className="media-panel-error" role="alert">
          Não foi possível carregar os vencedores. {winners.error.message}
        </p>
      ) : winners.data?.length ? (
        <div className="media-winner-grid">
          {winners.data.map((winner) => {
            const legacyArtwork = winnerCardAssets[`${winner.year}:${winner.category_slug}`];
            const image =
              winner.hall_of_fame_image_url ??
              legacyArtwork ??
              winner.avatar_url ??
              '/images/user.png';
            const artworkState = winner.hall_of_fame_image_url
              ? 'Arte personalizada'
              : legacyArtwork
                ? 'Arte padrão do Hall'
                : 'Foto do perfil';

            return (
              <article className="media-winner-card" key={winner.category_id}>
                <div className="media-winner-preview">
                  <img
                    src={image}
                    alt={`Prévia de ${winner.display_name}, vencedor de ${winner.category_name}`}
                    loading="lazy"
                    width="360"
                    height="450"
                  />
                  <span className="media-winner-status">{artworkState}</span>
                </div>
                <div className="media-winner-details">
                  <span className="eyebrow">{winner.category_name}</span>
                  <h3>{winner.display_name}</h3>
                  <p>@{winner.username}</p>
                  <div className="media-winner-actions">
                    <label className="button button-outline media-upload-button">
                      {upload.isPending &&
                      upload.variables?.winner.category_id === winner.category_id ? (
                        <LoaderCircle size={16} className="media-spinner" aria-hidden="true" />
                      ) : winner.hall_of_fame_image_url ? (
                        <Upload size={16} aria-hidden="true" />
                      ) : (
                        <ImagePlus size={16} aria-hidden="true" />
                      )}
                      {winner.hall_of_fame_image_url ? 'Trocar arte' : 'Enviar arte'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={busy}
                        aria-label={`${winner.hall_of_fame_image_url ? 'Trocar' : 'Enviar'} arte para ${winner.display_name}, ${winner.category_name}`}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = '';
                          if (!file) return;
                          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                            onMessage('Escolha uma imagem PNG, JPEG ou WebP.');
                            return;
                          }
                          if (file.size > 2 * 1024 * 1024) {
                            onMessage('A imagem deve ter até 2 MB.');
                            return;
                          }
                          upload.mutate({ winner, file });
                        }}
                      />
                    </label>
                    {winner.hall_of_fame_image_url && (
                      <button
                        className="icon-button media-remove-button"
                        type="button"
                        aria-label={`Remover arte personalizada de ${winner.display_name}, ${winner.category_name}`}
                        title="Voltar à arte padrão"
                        disabled={busy}
                        onClick={() => remove.mutate(winner)}
                      >
                        {remove.isPending &&
                        remove.variables?.category_id === winner.category_id ? (
                          <LoaderCircle size={17} className="media-spinner" aria-hidden="true" />
                        ) : (
                          <Trash2 size={17} aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="media-panel-empty">
          <ImagePlus size={25} aria-hidden="true" />
          <h3>Nenhum vencedor publicado nesta edição</h3>
          <p>Quando os resultados forem publicados, você poderá adicionar as artes do Hall aqui.</p>
        </div>
      )}
    </section>
  );
}
