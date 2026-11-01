// Career bonus panel shown when a mini-game ends (engine/career/miniBonus.ts).

import { useEffect, useRef, useState } from 'react';
import { MiniEnd } from './MiniGames';
import { achievementsNow, useStore } from '../../store';
import { recordMini } from '../achievements';
import { canClaimMini, claimsUsed, MINI_CLAIMS, scaledReward, type MiniResult } from '../../engine/career/miniBonus';
import { NAMES } from '../../content/strings';
import type { AttrKey } from '../../engine/types';

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
    achievementsNow();
    // round 33: the island's grade for the road map
    useStore.getState().gradeMini(result);
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
      <div className="sec-title">Career bonus</div>
      {text ? (
        <p className="small">{text}</p>
      ) : !canClaimMini(game, result.game) && claimsUsed(game) < MINI_CLAIMS.perSeason ? (
        <p className="small muted keep">This game is not unlocked for {game.player.name} yet, so this run is for fun. The lobby shows what it takes.</p>
      ) : !canClaimMini(game, result.game) ? (
        <p className="small muted keep">All {MINI_CLAIMS.perSeason} claims used for {game.player.name} this season. Come back next season.</p>
      ) : preview.length === 0 ? (
        <p className="small muted keep">Not good enough for a bonus this time. You can try again this season.</p>
      ) : (
        <>
          <p className="small">
            For {game.player.name}: {preview.join(', ')}
            {game.mode === 'lab' ? ' (paid as lab credits)' : ''}.
          </p>
          <p className="small muted keep">
            {left} of {MINI_CLAIMS.perSeason} claims left this season{left < MINI_CLAIMS.perSeason ? ' (this one pays half)' : ''}.
          </p>
          <button className="btn" onClick={() => setText(claim(result) || 'Claimed.')}>
            Claim it
          </button>
        </>
      )}
    </MiniEnd>
  );
}
