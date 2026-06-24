import { CleanPage } from '@/components/CleanPage';

export function Browsers() {
  return (
    <CleanPage
      eyebrow="Clean"
      title="Browsers"
      description="Per-browser cache, cookies, history, sessions and saved passwords across every profile. Cache is safe and preselected; cookies and history log you out and stay opt-in. Close the browser first for a complete clean."
      groups={['browsers']}
      groupByApp
      hideAbsent
    />
  );
}
