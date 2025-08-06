import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-lg text-gray-600">Page not found</p>
      <Link
        to="/"
        className="text-indigo-600 hover:text-indigo-500 hover:underline"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}