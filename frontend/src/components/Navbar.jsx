import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

// Import your logo SVGs
import LogoLight from '/logo-dark.svg'; // Assuming this path
import LogoDark from '/logo-dark.svg';   // Assuming this path

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation(); // Hook from react-router-dom to get current location

  // Determine if the current path is an admin path
  // This logic correctly identifies if we are on any path starting with '/admin'
  const isAdminPath = location.pathname.startsWith('/admin');

  // Define navigation links for regular users/guests
  const userNavLinks = [
    { name: 'Lowongan Pekerjaan', path: '/' },
    { name: 'Form Aplikasi', path: '/application-form' },
  ];

  // Define navigation links for admin pages
  const adminNavLinks = [
    { name: 'View Applicants', path: '/admin-dashboard' },
    { name: 'Add Job', path: '/admin/add-job' },
  ];

  // Choose which set of links to display based on the current path
  const navLinksToDisplay = isAdminPath ? adminNavLinks : userNavLinks;

  return (
    <nav className={`fixed top-0 left-0 w-full z-50
                    shadow-md transition-all duration-300 ease-in-out
                    ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900 shadow-xl' : 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg'}`}>
      <div className="container mx-auto px-6 py-3 flex justify-between items-center h-full">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2"> {/* Added flex and space-x-2 for logo and text */}
            {/* Conditional rendering for logo based on theme */}
            <img
              src={theme === 'dark' ? LogoDark : LogoLight}
              alt="BlueWork.ID Logo"
              className="h-8 w-auto" // Adjust height as needed
            />
            <span className={`text-2xl font-extrabold transition-colors duration-300
                             ${theme === 'dark' ? 'text-blue-300' : 'text-white'}`}>
              BlueWork.ID
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-8 flex-grow justify-center">
          {navLinksToDisplay.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              // Add onClick to close menu for mobile navigation links if needed
              onClick={() => setIsMenuOpen(false)}
              className={`relative text-md m-2 font-medium py-2 px-3 rounded-full transition-all duration-300
                          ${location.pathname === link.path || (link.path === '/admin-dashboard' && location.pathname.startsWith('/admin')) || (link.path === '/' && !isAdminPath && location.pathname === '/')
                            ? 'text-white bg-blue-700 dark:bg-blue-500 shadow-md'
                            : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-blue-100 hover:text-white hover:bg-blue-500/20'}`
                          }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right-aligned actions: Theme toggle, Mobile menu button */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors duration-300
                        ${theme === 'dark' ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-blue-300 text-blue-800 hover:bg-blue-200'}`}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-md transition-colors duration-300
                        ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-white hover:bg-blue-500/20'}`}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-7 w-7" />
            ) : (
              <Bars3Icon className="h-7 w-7" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className={`md:hidden absolute top-full left-0 w-full rounded-b-2xl shadow-xl
                         ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-600'} py-4 transition-all duration-300 ease-in-out`}>
          <div className="flex flex-col items-center space-y-3">
            {navLinksToDisplay.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)} // Close menu when a link is clicked
                className={`w-full text-center py-2 text-lg font-medium transition-colors duration-300
                            ${location.pathname === link.path || (link.path === '/admin-dashboard' && location.pathname.startsWith('/admin')) || (link.path === '/' && !isAdminPath && location.pathname === '/')
                              ? 'text-white bg-blue-700 dark:bg-blue-500'
                              : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-blue-100 hover:bg-blue-500/20'}`
                            }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
