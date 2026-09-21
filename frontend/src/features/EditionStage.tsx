import { isOpen } from '@awards/contracts';
import { useEdition } from '../lib/queries';
import { useParams } from 'react-router-dom';
import { State } from '../components/ui';
import { Nominations } from './Nominations';
import { Nominees } from './PublicPages';
import { Voting } from './Voting';

export function EditionStage() {
  const { slug } = useParams();
  const edition = useEdition(slug);

  return (
    <State loading={edition.isLoading} error={edition.error}>
      {edition.data && isOpen(edition.data, 'nominations') ? (
        <Nominations />
      ) : edition.data && isOpen(edition.data, 'voting') ? (
        <Voting />
      ) : (
        <Nominees />
      )}
    </State>
  );
}
