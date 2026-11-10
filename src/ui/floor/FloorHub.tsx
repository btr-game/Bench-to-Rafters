// The Floor, a game of its own (round 42, owner: "let's take it out of minigames and develop it into
// a larger one"): its page, opened from the arena on the main land (the store's page 'floor').

import { useStore } from '../../store';
import { t } from '../../i18n';
import { PageTop } from '../components/PageTop';

export function FloorPage() {
  const setPage = useStore((s) => s.setPage);
  return (
    <div className="wrap">
      <PageTop trail={[t('The Floor')]} back={() => setPage(null)} />
    </div>
  );
}
