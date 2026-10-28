import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../authContext.js";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/documents", label: "Documents" },
  { to: "/reviews", label: "My Reviews", roles: ["REVIEWER", "ADMIN"] },
  { to: "/workflows", label: "Workflows", roles: ["ADMIN"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const visibleLinks = links.filter(
    (l) => !l.roles || l.roles.includes(user.role),
  );
  const roleName = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  function linkClass({ isActive }) {
    return `block rounded px-3 py-2 text-sm ${
      isActive ? "bg-navy-700 text-white" : "text-gray-300 hover:bg-white/10"
    }`;
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between bg-navy-900 px-4 py-3 text-white md:hidden">
        <span className="font-semibold">Verox</span>
        <button onClick={() => setOpen(true)} className="text-sm">
          Menu
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 w-60 flex-col bg-navy-900 text-white ${
          open ? "flex" : "hidden"
        } md:flex`}
      >
        <div className="px-4 py-5 text-lg font-semibold">Verox</div>

        <nav className="flex-1 space-y-1 px-3">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 text-sm">
          <p className="font-medium">{user.full_name}</p>
          <p className="text-xs text-gray-400">{roleName}</p>
          <button
            onClick={logout}
            className="mt-3 text-gray-300 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="p-4 md:ml-60 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
