import type { ConnectionsCategory, ConnectionsColor } from '../types/connections';

const COLOR_VAR: Record<ConnectionsColor, string> = {
  yellow: '--color-connections-yellow',
  green: '--color-connections-green',
  blue: '--color-connections-blue',
  purple: '--color-connections-purple',
};

export function ConnectionsCategoryBanner({
  category,
  solved = true,
}: {
  category: ConnectionsCategory;
  /** false when this category is being revealed on a loss without the player
   * having solved it themselves (spec §9) — gets a reduced-opacity treatment
   * PLUS a real text label, not just an opacity/color difference. */
  solved?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-lg px-4 py-3 text-center ${solved ? '' : 'opacity-60'}`}
      style={{
        backgroundColor: `var(${COLOR_VAR[category.color]})`,
        color: 'var(--color-connections-contrast)',
      }}
    >
      <p className="text-sm font-bold uppercase tracking-wide">
        {category.title}
        {!solved && ' (no resuelta)'}
      </p>
      <p className="mt-1 text-xs font-medium">{category.items.join(', ')}</p>
    </div>
  );
}
