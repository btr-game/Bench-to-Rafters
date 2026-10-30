import { BRAND, NICKNAME } from '../../engine/balance';
import { brandPay } from '../../engine/career/nickname';
import { fmtMoney } from '../../engine/economy/salary';
import type { GameState } from '../../engine/types';
import { NickLogo } from '../art/NickLogo';
import { Card } from './bits';

// The Player tab's name and brand (round 25): the nickname the media gave him, his logo, and
// the brand deal or signature line that carries it.

export function NameCard({ g }: { g: GameState }) {
  const p = g.player;
  const n = p.nickname;
  const d = p.brand;
  return (
    <Card title="Name and brand" kicker={n ? `Since ${n.year}` : 'No nickname yet'} tour="name-card">
      {n ? (
        <div className="name-row">
          <NickLogo id={n.id} name={p.name} size={72} />
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <b className="nick-name">&ldquo;{n.name}&rdquo;</b>
            <span className="small">They call you that {n.why}.</span>
            {n.reasons.length > 0 && <span className="small muted">They noticed {n.reasons.join(', ')}.</span>}
          </div>
        </div>
      ) : (
        <p className="small muted">The media gives you a nickname once your reputation reaches {NICKNAME.rep} (Star); it is {Math.round(p.rep)} now. It comes from how you look, how you play, your name and your story.</p>
      )}
      {d ? (
        <dl className="facts">
          <div>
            <dt>{d.kind === 'deal' ? 'Brand deal' : 'Signature line'}</dt>
            <dd>
              <i className="brand-dot" style={{ background: d.color }} />
              {d.brand}
            </dd>
          </div>
          <div>
            <dt>{d.left > 0 ? 'This season' : 'Deal'}</dt>
            <dd>{d.left > 0 ? `${fmtMoney(brandPay(g, d))} · ${d.left} left` : 'Over; new offers come at the next summer'}</dd>
          </div>
          <div>
            <dt>Earned</dt>
            <dd>{fmtMoney(d.earned)}</dd>
          </div>
          {d.shoe > 0 && n && (
            <div>
              <dt>Latest shoe</dt>
              <dd>
                The {n.name.replace(/^The /, '')} {d.shoe}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        n && <p className="small muted">Brands call in the summer once your reputation reaches {BRAND.brandRep} (Superstar) in a pro league; a signature line puts out your own shoe at {BRAND.shoeRep} (Icon).</p>
      )}
    </Card>
  );
}
