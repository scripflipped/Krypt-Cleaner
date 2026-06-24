import type { CleanTarget } from './types';
import { SYSTEM_TARGETS } from './system';
import { BROWSER_TARGETS } from './browsers';
import { APP_TARGETS } from './apps';
import { PRIVACY_TARGETS } from './privacy';

export type { CleanTarget } from './types';
export { PRIVACY_REG_KEYS } from './privacy';

export const ALL_TARGETS: CleanTarget[] = [
  ...SYSTEM_TARGETS,
  ...BROWSER_TARGETS,
  ...APP_TARGETS,
  ...PRIVACY_TARGETS,
];

export function getTarget(id: string): CleanTarget | undefined {
  return ALL_TARGETS.find((t) => t.id === id);
}
