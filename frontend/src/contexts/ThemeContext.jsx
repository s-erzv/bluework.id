// src/contexts/ThemeContext.jsx (or similar path)
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the Context
const ThemeContext = createContext(undefined); // Initialize with undefined for safety checks

// 2. Create the Provider Component
export const ThemeProvider = ({ children }) => {
  // Use 'theme' instead of 'isDarkMode' for consistency with class names
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Default to 'light' if no saved theme, otherwise use system preference
    if (savedTheme) {
      return savedTheme;
    }
    // Check system preference once if no saved theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Effect to apply/remove 'dark' class to the root HTML element
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark'); // Remove existing classes
    document.documentElement.classList.add(theme); // Add the current theme class
    localStorage.setItem('theme', theme); // Save theme to localStorage
  }, [theme]); // Rerun when theme changes

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value = { theme, toggleTheme }; // The values to be provided through context

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 3. Create a custom hook for consuming the context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // This error helps you debug if you forget to wrap components with ThemeProvider
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};