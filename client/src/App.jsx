export default function App() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-navy-900">Verox</h1>
      <p className="mt-2 text-gray-600">Frontend setup is working.</p>
      <button className="mt-4 rounded bg-navy-700 px-4 py-2 text-white hover:bg-navy-900" onClick={() => alert("Button clicked!")}>
        Test button
      </button>
    </div>
  );
}
