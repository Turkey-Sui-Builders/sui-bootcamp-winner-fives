import { Link } from "react-router-dom";
import { ConnectButton } from "./ConnectButton";

export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo & Nav - Font-Driven */}
          <div className="flex items-center gap-8">
            <Link to="/" className="text-3xl font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Kariyer3
            </Link>

            <nav className="flex gap-6 text-sm">
              <Link
                to="/"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Browse Jobs
              </Link>
              <Link
                to="/post"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Post Job
              </Link>
              <Link
                to="/my-jobs"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                My Jobs
              </Link>
              <Link
                to="/my-applications"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                My Applications
              </Link>
            </nav>
          </div>

          {/* Connect Button */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
