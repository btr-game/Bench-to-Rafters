// The Floor's small pixel icons set before a line's own words (round 42 end of round, art/floorIcons.ts).

import { Icon } from '../art/Icon';

/** A pixel icon before a line's words; decorative, as the words say it. */
export function Ico({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <span className="fl-ico" aria-hidden="true">
      <Icon name={name} size={size} />
    </span>
  );
}
