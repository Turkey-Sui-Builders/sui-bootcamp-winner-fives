import { Link } from "react-router-dom";
import { ConnectButton } from "./ConnectButton";

export function Header() {
  return (
    <header className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex justify-between items-center">
          {/* Logo & Nav - Font-Driven, Borderless */}
          <div className="flex items-center gap-12">
            <Link to="/" className="text-4xl font-black tracking-tight interactive">
              Kariyer3
            </Link>

            <nav className="flex gap-8">
              <Link to="/" className="text-base font-medium text-gray-600 interactive">
                Jobs
              </Link>
              <Link to="/post" className="text-base font-medium text-gray-600 interactive">
                Post
              </Link>
              <Link to="/my-jobs" className="text-base font-medium text-gray-600 interactive">
                My Jobs
              </Link>
              <Link to="/my-applications" className="text-base font-medium text-gray-600 interactive">
                Applications
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
