import { useAuth } from "../authContext.js";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-xl font-semibold text-navy-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        Signed in as {user.full_name}
      </p>
    </div>
  );
}
