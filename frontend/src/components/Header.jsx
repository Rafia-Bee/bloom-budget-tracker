/**
 * Bloom - Header Component
 *
 * A reusable header component for the application. It includes the logo,
 * navigation links, and a user menu with theme toggle and other actions.
 * It is designed to be used across all main pages of the application.
 */
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

function Header({
  setIsAuthenticated,
  onExport,
  onImport,
  onBankImport,
  onShowExperimental,
  children,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
      if (!e.target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    if (setIsAuthenticated) {
      setIsAuthenticated(false);
    } else {
      navigate('/login');
    }
  };

  const navLinkClasses = "text-sm font-medium text-gray-700 dark:text-dark-text-secondary hover:text-bloom-pink dark:hover:text-dark-pink transition-colors";
  const activeLinkClasses = "text-bloom-pink dark:text-dark-pink";

  const navigationLinks = (
    <>
      <NavLink to="/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>Dashboard</NavLink>
      <NavLink to="/recurring-expenses" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>Recurring</NavLink>
      <NavLink to="/debts" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>Debts</NavLink>
    </>
  );

  const userMenu = (
    <div className="relative user-menu">
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="w-10 h-10 rounded-full bg-bloom-pink dark:bg-dark-pink hover:bg-opacity-80 transition flex items-center justify-center text-white font-semibold"
        title="User menu"
      >
        {localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'}
      </button>

      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-gray-200 dark:border-dark-border py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
            <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">Signed in as</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{localStorage.getItem('user_email')}</p>
          </div>
          <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
            <ThemeToggle />
          </div>
          <button
            onClick={() => {
              onExport();
              setShowUserMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Data
          </button>
          <button
            onClick={() => {
              onImport();
              setShowUserMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import Data
          </button>
          <button
            onClick={() => {
              onBankImport();
              setShowUserMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Import Bank Transactions
          </button>
          {onShowExperimental && (
            <button
              onClick={() => {
                onShowExperimental();
                setShowUserMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              ⚗️ Experimental Features
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2 border-t border-gray-200 dark:border-dark-border mt-2 pt-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-white dark:bg-dark-surface shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Mobile Header */}
        <div className="flex justify-between items-center md:hidden mobile-menu-container">
          <div className="max-w-[70%]">
            <h1 className="text-2xl font-bold text-bloom-pink">Bloom</h1>
            <p className="text-[10px] leading-tight text-gray-600 dark:text-dark-text-secondary">Financial Habits That Grow With You</p>
          </div>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-10 h-10 rounded-lg bg-bloom-pink/10 hover:bg-bloom-pink/20 transition flex items-center justify-center text-bloom-pink"
            aria-label="Menu"
          >
            {showMobileMenu ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-bloom-pink">Bloom</h1>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Financial Habits That Grow With You</p>
          </div>
          <div className="flex items-center gap-4">
            {children}
            {navigationLinks}
            {userMenu}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-dark-border pt-4">
            <div className="space-y-3">
              <nav className="flex flex-col space-y-2">
                {navigationLinks}
              </nav>
              <div className="border-t border-gray-200 dark:border-dark-border pt-3 mt-3">
                <div className="px-4 py-2 mb-2">
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{localStorage.getItem('user_email')}</p>
                </div>
                <div className="px-4 py-2 border-b border-t border-gray-200 dark:border-dark-border">
                    <ThemeToggle />
                </div>
                <button
                    onClick={() => { onExport(); setShowMobileMenu(false); }}
                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export Data
                </button>
                <button
                    onClick={() => { onImport(); setShowMobileMenu(false); }}
                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Import Data
                </button>
                 <button
                    onClick={() => { onBankImport(); setShowMobileMenu(false); }}
                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    Import Bank Transactions
                </button>
                {onShowExperimental && (
                    <button
                        onClick={() => { onShowExperimental(); setShowMobileMenu(false); }}
                        className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        ⚗️ Experimental
                    </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-red-600 dark:text-dark-danger hover:bg-red-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
