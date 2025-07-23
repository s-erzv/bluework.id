import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

import LogoLight from '/logo-light.svg'; 
import LogoDark from '/logo-dark.svg';   

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation(); 

  const isAdminPath = location.pathname.startsWith('/admin');

  const userNavLinks = [
    { name: 'Lowongan Pekerjaan', path: '/' },
    { name: 'Form Aplikasi', path: '/application-form' },
  ];

  const adminNavLinks = [
    { name: 'View Applicants', path: '/admin-dashboard' },
    { name: 'Add Job', path: '/admin/add-job' },
  ];

  const navLinksToDisplay = isAdminPath ? adminNavLinks : userNavLinks;

  return (
    <nav className={`fixed w-full z-50
                     transition-all duration-300 ease-in-out
                    ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-light-bg-primary shadow-sm'}`}>  
      <div className="container mx-auto px-6 py-3 flex justify-between items-center h-full">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <img
              src={theme === 'dark' ? LogoDark : LogoLight}
              alt="BlueWork.ID Logo"
              className="h-8 w-auto" 
            />
            <span className={`text-2xl font-extrabold transition-colors duration-300
                             ${theme === 'dark' ? 'text-blue-300' : 'text-blue-darker'}`}>  
              BlueWork.ID
            </span>
          </Link>
        </div>
 
        <div className="hidden md:flex items-center space-x-8 flex-grow justify-center">
          {navLinksToDisplay.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsMenuOpen(false)}
              className={`relative text-md m-2 font-medium py-2 px-3 rounded-full transition-all duration-300
                          ${location.pathname === link.path || (link.path === '/admin-dashboard' && location.pathname.startsWith('/admin')) || (link.path === '/' && !isAdminPath && location.pathname === '/')
                            ? 'text-white bg-blue-700 dark:bg-blue-500 shadow-md'
                            : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-light-text-primary hover:text-blue-darker hover:bg-blue-primary/5'}` /* Adjusted light mode link colors and hover */
                          }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
 
        <div className="flex items-center space-x-4"> 
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
 
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-md transition-colors duration-300
                        ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-blue-primary hover:bg-blue-primary/10'}`}  
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
 
      {isMenuOpen && (
        <div className={`md:hidden absolute top-full left-0 w-full rounded-b-2xl shadow-xl
                         ${theme === 'dark' ? 'bg-gray-800' : 'bg-light-bg-primary'} py-4 transition-all duration-300 ease-in-out`}> {/* Changed light mode background to light-bg-primary */}
          <div className="flex flex-col items-center space-y-3">
            {navLinksToDisplay.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}  
                className={`w-full text-center py-2 text-lg font-medium transition-colors duration-300
                            ${location.pathname === link.path || (link.path === '/admin-dashboard' && location.pathname.startsWith('/admin')) || (link.path === '/' && !isAdminPath && location.pathname === '/')
                              ? 'text-white bg-blue-700 dark:bg-blue-500'
                              : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-light-text-primary hover:bg-blue-primary/5'}` /* Adjusted light mode link colors and hover */
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