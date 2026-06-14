import { Link } from 'react-router-dom';
import { TabNav } from './TabNav';
import { ThemeSelector } from './ThemeSelector';

export function Header() {
  return (
    <header
      data-testid="app-header"
      className="bg-card border-b border-border sticky top-0 z-10 px-4 py-3"
    >
      <div className="max-w-3xl mx-auto flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to="/log" className="block">
            <h1 className="text-lg font-semibold mb-2">Overlast Logger</h1>
          </Link>
          <TabNav />
        </div>
        <div className="pt-1">
          <ThemeSelector />
        </div>
      </div>
    </header>
  );
}
