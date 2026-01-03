/**
 * Bloom - Header Component
 *
 * A reusable header component for the application. It includes the logo,
 * navigation links, and a user menu with theme toggle and other actions.
 * It is designed to be used across all main pages of the application.
 */
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logError } from '../utils/logger';
import ThemeToggle from './ThemeToggle';
import CurrencySettingsModal from './CurrencySettingsModal';
import { authAPI } from '../api';
import { useFeatureFlag } from '../contexts/FeatureFlagContext';

function Header({ setIsAuthenticated, onExport, onImport, onBankImport, children }) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [expandedSubmenu, setExpandedSubmenu] = useState(null); // 'import-export' | null
    const navigate = useNavigate();
    const { isEnabled, experimentalEnabled } = useFeatureFlag();
    const reportsEnabled = experimentalEnabled && isEnabled('reportsEnabled');

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

    const handleLogout = async () => {
        try {
            await authAPI.logout(); // Clear httpOnly cookies on server (#80 security fix)
        } catch (error) {
            logError('logout', error);
        }

        localStorage.removeItem('user_email'); // Only email is stored locally now
        if (setIsAuthenticated) {
            setIsAuthenticated(false);
        } else {
            navigate('/login');
        }
    };

    const navLinkClasses =
        'px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-bloom-pink transition font-semibold';
    const activeLinkClasses = 'text-bloom-pink dark:text-dark-pink';
    const mobileNavLinkClasses =
        'block px-4 py-3 text-gray-700 dark:text-dark-text hover:bg-bloom-pink/10 dark:hover:bg-dark-pink/20 hover:text-bloom-pink dark:hover:text-dark-pink transition rounded-lg font-semibold';

    const navigationLinks = (
        <>
            <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                    `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
                }
            >
                Dashboard
            </NavLink>
            <NavLink
                to="/goals"
                className={({ isActive }) =>
                    `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
                }
            >
                Goals
            </NavLink>
            {reportsEnabled && (
                <NavLink
                    to="/reports"
                    className={({ isActive }) =>
                        `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
                    }
                >
                    Reports
                </NavLink>
            )}
            <NavLink
                to="/recurring-expenses"
                className={({ isActive }) =>
                    `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
                }
            >
                Recurring
            </NavLink>
            <NavLink
                to="/debts"
                className={({ isActive }) =>
                    `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
                }
            >
                Debts
            </NavLink>
        </>
    );

    const mobileNavigationLinks = (
        <>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMobileMenu(false);
                    navigate('/dashboard');
                }}
                className={`${mobileNavLinkClasses} text-left w-full`}
            >
                🏠 Dashboard
            </button>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMobileMenu(false);
                    navigate('/goals');
                }}
                className={`${mobileNavLinkClasses} text-left w-full`}
            >
                🎯 Goals
            </button>
            {reportsEnabled && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMobileMenu(false);
                        navigate('/reports');
                    }}
                    className={`${mobileNavLinkClasses} text-left w-full`}
                >
                    📊 Reports
                </button>
            )}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMobileMenu(false);
                    navigate('/recurring-expenses');
                }}
                className={`${mobileNavLinkClasses} text-left w-full`}
            >
                🔄 Recurring Expenses
            </button>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMobileMenu(false);
                    navigate('/debts');
                }}
                className={`${mobileNavLinkClasses} text-left w-full`}
            >
                💳 Debts
            </button>
        </>
    );

    // Submenu Button Component for collapsible submenus
    const SubmenuButton = ({ icon, label, isExpanded, onClick, children }) => (
        <>
            <button
                onClick={onClick}
                className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center justify-between group"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{label}</span>
                </div>
                <svg
                    className={`w-4 h-4 transition-transform duration-150 ${
                        isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>
            {isExpanded && (
                <div className="bg-gray-50 dark:bg-dark-elevated border-l-2 border-bloom-pink dark:border-dark-pink ml-4 my-1 overflow-hidden transition-all duration-150">
                    {children}
                </div>
            )}
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
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-gray-200 dark:border-dark-border py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
                        <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                            Signed in as
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">
                            {localStorage.getItem('user_email')}
                        </p>
                    </div>

                    {/* Theme Toggle */}
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
                        <ThemeToggle />
                    </div>

                    {/* Settings */}
                    <button
                        onClick={() => {
                            navigate('/settings');
                            setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        Settings
                    </button>

                    {/* Currency */}
                    <button
                        onClick={() => {
                            setShowCurrencyModal(true);
                            setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Currency
                    </button>

                    {/* Trash */}
                    <button
                        onClick={() => {
                            navigate('/trash');
                            setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                        Trash
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2 border-t border-gray-200 dark:border-dark-border mt-2 pt-2"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
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
                <div className="md:hidden mobile-menu-container">
                    <div className="flex justify-between items-center">
                        <div className="max-w-[70%]">
                            <h1 className="text-2xl font-bold text-bloom-pink">Bloom</h1>
                            <p className="text-[10px] leading-tight text-gray-600 dark:text-dark-text-secondary">
                                Financial Habits That Grow With You
                            </p>
                        </div>
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="w-10 h-10 rounded-lg bg-bloom-pink/10 hover:bg-bloom-pink/20 transition flex items-center justify-center text-bloom-pink"
                            aria-label="Menu"
                        >
                            {showMobileMenu ? (
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Mobile Menu Dropdown */}
                    {showMobileMenu && (
                        <div className="mt-4 pb-4 border-t border-gray-200 dark:border-dark-border pt-4 max-h-[85vh] overflow-y-auto">
                            <div className="space-y-3">
                                {/* Custom content slot (e.g., PeriodSelector for Dashboard) */}
                                {children && <div className="mb-4">{children}</div>}

                                <nav className="flex flex-col space-y-2">
                                    {mobileNavigationLinks}
                                </nav>
                                <div className="border-t border-gray-200 dark:border-dark-border pt-3 mt-3">
                                    <div className="px-4 py-2 mb-2">
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                            Signed in as
                                        </p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">
                                            {localStorage.getItem('user_email')}
                                        </p>
                                    </div>
                                    <div className="px-4 py-2 border-b border-t border-gray-200 dark:border-dark-border">
                                        <ThemeToggle />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowMobileMenu(false);
                                            navigate('/settings');
                                        }}
                                        className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        ⚙️ Settings
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowMobileMenu(false);
                                            setShowCurrencyModal(true);
                                        }}
                                        className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        💱 Currency
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowMobileMenu(false);
                                            navigate('/trash');
                                        }}
                                        className="w-full text-left px-4 py-3 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                        🗑️ Trash
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowMobileMenu(false);
                                            handleLogout();
                                        }}
                                        className="w-full text-left px-4 py-3 text-red-600 dark:text-dark-danger hover:bg-red-50 dark:hover:bg-dark-elevated transition rounded-lg flex items-center gap-2 font-semibold"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                            />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop Header */}
                <div className="hidden md:flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-bloom-pink">Bloom</h1>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                            Financial Habits That Grow With You
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {children}
                        {navigationLinks}
                        {userMenu}
                    </div>
                </div>
            </div>

            {/* Currency Settings Modal */}
            {showCurrencyModal && (
                <CurrencySettingsModal onClose={() => setShowCurrencyModal(false)} />
            )}
        </header>
    );
}

export default Header;
