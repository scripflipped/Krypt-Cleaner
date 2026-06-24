import { CleanPage } from '@/components/CleanPage';

export function Cleaner() {
  return (
    <CleanPage
      eyebrow="Clean"
      title="Smart Cleaner"
      description="System junk: temp files, caches, shader data, crash dumps and more. Safe items are preselected — everything that could log you out or delete data is badged and left for you to choose."
      groups={['system']}
    />
  );
}
