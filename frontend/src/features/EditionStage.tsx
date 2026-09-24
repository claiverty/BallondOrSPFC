import React from 'react';
import { isOpen } from '@awards/contracts';
import { useEdition } from '../lib/queries';
import { useParams } from 'react-router-dom';
import { State } from '../components/ui';
import { Nominations } from './Nominations';
import { Voting } from './Voting';

const Nominees = React.lazy(() =>
  import('./PublicPages').then((module) => ({ default: module.Nominees })),
);

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
