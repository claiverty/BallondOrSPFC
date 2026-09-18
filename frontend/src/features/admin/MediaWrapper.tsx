import type { AdminContext } from './types';
import { MediaPanel } from './MediaPanel';
export function MediaWrapper({
  edition,
  setMessage,
}: Pick<AdminContext, 'edition' | 'setMessage'>) {
  return <MediaPanel edition={edition} onMessage={setMessage} />;
}
