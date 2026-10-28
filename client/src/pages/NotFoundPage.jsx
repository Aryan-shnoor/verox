import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-navy-900">Page not found</h1>
      <Link
        to="/"
        className="mt-2 inline-block text-sm text-navy-700 underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
