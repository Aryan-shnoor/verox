import { useAuth } from "../authContext.js";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-navy-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        {user.full_name} ({user.role})
      </p>
      <button
        onClick={logout}
        className="mt-4 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Log out
      </button>
    </div>
  );
}
