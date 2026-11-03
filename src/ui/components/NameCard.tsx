import { BRAND, NICKNAME } from '../../engine/balance';
import { brandPay } from '../../engine/career/nickname';
import { BrandLogo } from '../art/careerArt';
import { fmtMoney } from '../../engine/economy/salary';
import type { GameState } from '../../engine/types';
import { NickLogo } from '../art/NickLogo';
import { Card } from './bits';
import { t } from '../../i18n';

// The Player tab's name and brand (round 25): the nickname the media gave him, his logo, and
// the brand deal or signature line that carries it. Round 28: the logo is a locked spot until his
// first brand deal draws it.

export function NameCard({ g }: { g: GameState }) {
  const p = g.player;
  const n = p.nickname;
  const d = p.brand;
  return (
    <Card title={t('Name and brand')} kicker={n ? t('Since {year}', { year: n.year }) : t('No nickname yet')} tour="name-card">
      {n ? (
        <div className="name-row">
          {n.logo || d ? (
            <NickLogo id={n.id} name={p.name} size={72} />
          ) : (
            // round 28: the logo comes with his first brand deal
            <span className="logo-locked" title={t('Your logo comes with your first brand deal')} aria-label={t('Logo: comes with your first brand deal')}>
              <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
                {['..#####..', '.#.....#.', '#..###..#', '#.#...#.#', '#....#..#', '#...#...#', '#.......#', '.#..#..#.', '..#####..'].flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
              </svg>
            </span>
          )}
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <b className="nick-name">&ldquo;{n.name}&rdquo;</b>
            <span className="small">{t('They call you that {why}.', { why: n.why })}</span>
            {n.reasons.length > 0 && <span className="small muted">{t('They noticed {what}.', { what: n.reasons.join(', ') })}</span>}
          </div>
        </div>
      ) : (
        <p className="small muted">{t('The media gives you a nickname once your reputation reaches {rep} ({tier}); it is {now} now. It comes from how you look, how you play, your name and your story.', { rep: NICKNAME.rep, tier: 'Star', now: Math.round(p.rep) })}</p>
      )}
      {d ? (
        <dl className="facts">
          <div>
            <dt>{d.kind === 'deal' ? t('Brand deal') : t('Signature line')}</dt>
            <dd>
              <span className="with-icon">
                <BrandLogo name={d.brand} color={d.color} size={26} />
                {d.brand}
              </span>
            </dd>
          </div>
          <div>
            <dt>{d.left > 0 ? t('This season') : t('Deal')}</dt>
            <dd>{d.left > 0 ? t('{pay} · {n} left', { pay: fmtMoney(brandPay(g, d)), n: d.left }) : t('Over; new offers come at the next summer')}</dd>
          </div>
          <div>
            <dt>{t('Earned')}</dt>
            <dd>{fmtMoney(d.earned)}</dd>
          </div>
          {d.shoe > 0 && n && (
            <div>
              <dt>{t('Latest shoe')}</dt>
              <dd>
                The {n.name.replace(/^The /, '')} {d.shoe}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        n && <p className="small muted">{t('Brands call in the summer once your reputation reaches {rep} ({tier}) in a pro league; a signature line puts out your own shoe at {shoe} ({shoeTier}).', { rep: BRAND.brandRep, tier: 'Superstar', shoe: BRAND.shoeRep, shoeTier: 'Icon' })}</p>
      )}
    </Card>
  );
}
