// Career bonus panel shown when a mini-game ends (engine/career/miniBonus.ts).

import { useEffect, useRef, useState } from 'react';
import { MiniEnd } from './MiniGames';
import { achievementsNow, useStore } from '../../store';
import { recordMini } from '../achievements';
import { canClaimMini, claimsUsed, MINI_CLAIMS, scaledReward, type MiniResult } from '../../engine/career/miniBonus';
import { NAMES } from '../../content/strings';
import type { AttrKey } from '../../engine/types';
import { t } from '../../i18n';

/** The career bonus for a finished mini-game (engine/career/miniBonus.ts). */
export function MiniBonus({ result }: { result: MiniResult }) {
  const game = useStore((s) => s.game);
  const claim = useStore((s) => s.claimMini);
  const [text, setText] = useState('');
  // round 27: every finished run counts for the arcade achievements, once (career or not)
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    recordMini(result);
    // round 33: the island's grade for the road map (round 35: before the book is checked, which
    // reads the island for the mini-games' unlock)
    useStore.getState().gradeMini(result);
    achievementsNow();
  }, [result]);
  if (!game || game.step === 'retired') return <MiniEnd />;
  const reward = scaledReward(game, result);
  const left = MINI_CLAIMS.perSeason - claimsUsed(game);
  const preview = Object.entries(reward.attrs)
    .filter(([, v]) => v)
    .map(([k, v]) => `${NAMES.attr[k as AttrKey]} +${(v as number).toFixed(1)}`)
    .concat(reward.range ? [`Range +${reward.range.toFixed(1)}`] : [], reward.rep ? [`Reputation +${reward.rep}`] : []);
  return (
    <MiniEnd>
      <div className="sec-title">{t('Career bonus')}</div>
      {text ? (
        <p className="small">{text}</p>
      ) : game.flags.friends ? (
        <p className="small muted keep">{t('A career with friends takes no mini-game bonus, so everyone in it stays even. This run is for fun.')}</p>
      ) : !canClaimMini(game, result.game) && claimsUsed(game) < MINI_CLAIMS.perSeason ? (
        <p className="small muted keep">{t('This game is not unlocked for {name} yet, so this run is for fun. The lobby shows what it takes.', { name: game.player.name })}</p>
      ) : !canClaimMini(game, result.game) ? (
        <p className="small muted keep">{t('All {n} claims used for {name} this season. Come back next season.', { n: MINI_CLAIMS.perSeason, name: game.player.name })}</p>
      ) : preview.length === 0 ? (
        <p className="small muted keep">{t('Not good enough for a bonus this time. You can try again this season.')}</p>
      ) : (
        <>
          {/* the ratings' and meters' names stay English (owner) */}
          <p className="small">{game.mode === 'lab' ? t('For {name}: {bonus} (paid as lab credits).', { name: game.player.name, bonus: preview.join(', ') }) : t('For {name}: {bonus}.', { name: game.player.name, bonus: preview.join(', ') })}</p>
          <p className="small muted keep">
            {left < MINI_CLAIMS.perSeason ? t('{left} of {total} claims left this season (this one pays half).', { left, total: MINI_CLAIMS.perSeason }) : t('{left} of {total} claims left this season.', { left, total: MINI_CLAIMS.perSeason })}
          </p>
          <button className="btn" onClick={() => setText(claim(result) || t('Claimed.'))}>
            {t('Claim it')}
          </button>
        </>
      )}
    </MiniEnd>
  );
}
