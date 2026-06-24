import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Titlebar } from './components/Titlebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { HealthCheck } from './pages/HealthCheck';
import { Cleaner } from './pages/Cleaner';
import { Browsers } from './pages/Browsers';
import { Apps } from './pages/Apps';
import { Privacy } from './pages/Privacy';
import { Optimizer } from './pages/Optimizer';
import { Analyzer } from './pages/Analyzer';
import { Duplicates } from './pages/Duplicates';
import { OldFiles } from './pages/OldFiles';
import { DriveHealth } from './pages/DriveHealth';
import { Backups } from './pages/Backups';
import { Logs } from './pages/Logs';

export type Route =
  | 'dashboard'
  | 'health'
  | 'cleaner'
  | 'browsers'
  | 'apps'
  | 'privacy'
  | 'optimizer'
  | 'analyzer'
  | 'duplicates'
  | 'old-files'
  | 'drive-health'
  | 'backups'
  | 'logs';

const ROUTE_LABELS: Record<Route, string> = {
  dashboard: 'Dashboard',
  health: 'Health Check',
  cleaner: 'Smart Cleaner',
  browsers: 'Browsers',
  apps: 'Apps & Games',
  privacy: 'Privacy',
  optimizer: 'Disk Optimizer',
  analyzer: 'Disk Analyzer',
  duplicates: 'Duplicate Finder',
  'old-files': 'Old Files',
  'drive-health': 'Drive Health',
  backups: 'Backups',
  logs: 'Action Log',
};

export default function App() {
  const [route, setRoute] = useState<Route>('dashboard');

  useEffect(() => {
    window.krypt.discord
      .setActivity({ details: 'Cleaning Windows', state: `Viewing ${ROUTE_LABELS[route]}` })
      .catch(() => {
      });
  }, [route]);

  return (
    <div className="h-screen w-screen flex flex-col text-white selection:bg-purple-500/40">
      <Titlebar />
      <div className="flex-1 flex min-h-0">
        <Sidebar active={route} onChange={setRoute} />
        <main className="flex-1 min-w-0 overflow-y-auto relative">
          <div className="grid-overlay absolute inset-0 opacity-[0.08] pointer-events-none" />
          <div className="relative px-10 py-8 max-w-[1200px] mx-auto animate-fade-in">
            <ErrorBoundary resetKey={route}>
              {route === 'dashboard' && <Dashboard onNavigate={setRoute} />}
              {route === 'health' && <HealthCheck onNavigate={setRoute} />}
              {route === 'cleaner' && <Cleaner />}
              {route === 'browsers' && <Browsers />}
              {route === 'apps' && <Apps />}
              {route === 'privacy' && <Privacy />}
              {route === 'optimizer' && <Optimizer />}
              {route === 'analyzer' && <Analyzer />}
              {route === 'duplicates' && <Duplicates />}
              {route === 'old-files' && <OldFiles />}
              {route === 'drive-health' && <DriveHealth />}
              {route === 'backups' && <Backups />}
              {route === 'logs' && <Logs />}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
