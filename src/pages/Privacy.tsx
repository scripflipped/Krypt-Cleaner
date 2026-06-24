import { Info } from 'lucide-react';
import { CleanPage } from '@/components/CleanPage';

export function Privacy() {
  return (
    <div>
      <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/[0.05] px-4 py-3 mb-6 flex items-start gap-2.5">
        <Info size={16} className="text-indigo-300 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-100/80 leading-relaxed">
          Registry privacy traces are <span className="font-semibold">snapshotted automatically</span>{' '}
          before they’re cleared — you can roll them back from the Backups page. File-based traces
          (recent files, jump lists) are deleted permanently.
        </div>
      </div>
      <CleanPage
        eyebrow="Clean"
        title="Privacy"
        description="Clears the usage trails Windows keeps: recent documents, Run history, Explorer search terms, typed paths/URLs and program-launch records. All opt-in."
        groups={['privacy']}
      />
    </div>
  );
}
