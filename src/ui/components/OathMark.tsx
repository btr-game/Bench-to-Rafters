import { Icon } from '../art/Icon';

/** Round 25: the No Shortcuts mark beside a career's name (Reality, master mode, nothing simplified). */
export function OathMark({ size = 18 }: { size?: number }) {
  return (
    <span className="oath-mark" title="No Shortcuts: Reality hits hard in master mode, nothing simplified">
      <Icon name="oath" size={size} />
      <span>No Shortcuts</span>
    </span>
  );
}
