import { Icon } from '../art/Icon';
import { t } from '../../i18n';

/** Round 25: the Rough Road mark beside a career's name (Reality, master mode, nothing simplified). */
export function OathMark({ size = 18 }: { size?: number }) {
  return (
    <span className="oath-mark" title={t('{oath}: {mode} in master mode, nothing simplified', { oath: 'Rough Road', mode: 'Reality hits hard' })}>
      <Icon name="oath" size={size} />
      <span>Rough Road</span>
    </span>
  );
}

/** Round 30: the Comet mark (Shoot for the stars at hyper speed, about five minutes a career). */
export function CometMark({ size = 18 }: { size?: number }) {
  return (
    <span className="oath-mark comet-mark" title={t('{comet}: {mode} at hyper speed, Fast break and Sim for the whole career', { comet: 'Comet', mode: 'Shoot for the stars' })}>
      <Icon name="comet" size={size} />
      <span>Comet</span>
    </span>
  );
}
