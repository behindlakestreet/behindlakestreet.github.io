import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/log', label: 'Log' },
  { to: '/geschiedenis', label: 'Geschiedenis' },
  { to: '/rapport', label: 'Rapport' },
  { to: '/brief', label: 'Brief' },
] as const;

export function TabNav() {
  return (
    <nav aria-label="Hoofdnavigatie" className="flex gap-2">
      <div role="tablist" className="flex gap-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            role="tab"
            className={({ isActive }) =>
              `tab-btn border border-border rounded-md px-3 py-1.5 text-sm hover:bg-gray-100 ${
                isActive ? 'active bg-primary text-white border-primary' : ''
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
