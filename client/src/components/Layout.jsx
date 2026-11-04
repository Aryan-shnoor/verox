import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../authContext.js";

const icons = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  documents: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  reviews: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  workflows: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 7l8 4M8 17l8-4" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

const links = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/documents", label: "Documents", icon: "documents" },
  { to: "/reviews", label: "My Reviews", icon: "reviews", roles: ["REVIEWER", "ADMIN"] },
  { to: "/workflows", label: "Workflows", icon: "workflows", roles: ["ADMIN"] },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5 text-lg font-bold">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm text-white">
        V
      </span>
      Verox
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const visibleLinks = links.filter((l) => !l.roles || l.roles.includes(user.role));
  const roleName = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  function linkClass({ isActive }) {
    return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
      isActive
        ? "bg-accent-soft font-semibold text-accent"
        : "font-medium text-muted hover:bg-page"
    }`;
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between border-b border-line bg-side px-4 py-3 md:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="text-sm font-medium text-muted">
          Menu
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-10 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 w-60 flex-col border-r border-line bg-side px-4 py-6 ${
          open ? "flex" : "hidden"
        } md:flex`}
      >
        <div className="px-2 pb-7">
          <Logo />
        </div>

        <nav className="flex-1 space-y-0.5">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              <Icon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-line px-2 pt-4">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-soft font-bold text-accent">
            {user.full_name.charAt(0)}
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold">{user.full_name}</p>
            <p className="text-xs text-muted">{roleName}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 px-2 text-left text-sm text-muted hover:text-ink"
        >
          Log out
        </button>
      </aside>

      <main className="p-4 md:ml-60 md:px-9 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}