import { CleanPage } from '@/components/CleanPage';

export function Apps() {
  return (
    <CleanPage
      eyebrow="Clean"
      title="Apps & Games"
      description="Caches from Discord, Spotify, Slack, Teams, Steam, Epic and GPU shader caches for NVIDIA, AMD and Intel. All safe — apps re-create them on demand. Logins and settings are never touched."
      groups={['apps']}
      groupByApp
      hideAbsent
    />
  );
}
