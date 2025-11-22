import { Link } from "react-router-dom";
import { ConnectButton } from "./ConnectButton";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 nav-glass">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between gap-8">
          {/* Logo & Nav */}
          <div className="flex items-center gap-10">
            <Link to="/" className="text-3xl font-black tracking-tight text-main hover:text-teal-500 transition-smooth">
              Kariyer3
            </Link>

            <nav className="hidden md:flex items-center gap-3 text-sm font-semibold text-muted">
              <Link to="/" className="px-3 py-2 rounded-xl hover:bg-white/5 hover:bg-opacity-50 transition-smooth">
                Jobs
              </Link>
              <Link to="/post" className="px-3 py-2 rounded-xl hover:bg-white/5 hover:bg-opacity-50 transition-smooth">
                Post
              </Link>
              <Link to="/my-jobs" className="px-3 py-2 rounded-xl hover:bg-white/5 hover:bg-opacity-50 transition-smooth">
                My Jobs
              </Link>
              <Link to="/my-applications" className="px-3 py-2 rounded-xl hover:bg-white/5 hover:bg-opacity-50 transition-smooth">
                Applications
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
