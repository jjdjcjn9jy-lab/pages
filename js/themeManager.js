/**
 * Wedding Photo Printer - Theme Management Module
 * Copyright (C) 2026 sandifol
 *
 * Licensed under the EUPL, Version 1.2
 *
 * Purpose: Handles dark/light theme switching with system preference detection.
 * Features:
 * - Automatic system preference detection
 * - Manual theme toggle with context-aware button text
 * - Preference persistence
 * - Graceful degradation
 */

const ThemeManager = (function() {
    // Private constants
    const THEME_KEY = 'wedding-photo-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';
    let toggleButton = null;

    // Check for feature support
    function isSupported() {
        try {
            return ('localStorage' in window) &&
                   ('matchMedia' in window) &&
                   ('setAttribute' in document.documentElement);
        } catch (e) {
            return false;
        }
    }

    // Get current system preference
    function getSystemPreference() {
        try {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
        } catch (e) {
            return LIGHT_THEME;
        }
    }

    // Apply theme to the document
    function applyTheme(theme) {
        try {
            document.documentElement.setAttribute('data-theme', theme);
            if (isSupported()) {
                localStorage.setItem(THEME_KEY, theme);
            }
            updateButtonText(theme);
        } catch (e) {
            console.warn("Failed to apply theme", e);
        }
    }

    // Update button text based on current theme
    function updateButtonText(currentTheme) {
        if (toggleButton) {
            toggleButton.textContent = currentTheme === DARK_THEME
                ? '☀️ Switch to Light Mode'
                : '🌕 Switch to Dark Mode';
        }
    }

    // Create and initialize toggle button
    function initializeToggleButton() {
        const button = document.createElement('button');
        button.id = 'theme-toggle';
        button.className = 'btn-secondary';
        button.style.marginTop = '20px';
        button.style.width = '100%';

        // Set initial text
        const currentTheme = document.documentElement.getAttribute('data-theme') || LIGHT_THEME;
        button.textContent = currentTheme === DARK_THEME
            ? '☀️ Switch to Light Mode'
            : '🌕 Switch to Dark Mode';

        button.addEventListener('click', function() {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === DARK_THEME ? LIGHT_THEME : DARK_THEME;
            applyTheme(newTheme);
        });

        return button;
    }

    // Public API
    return {
        init: function() {
            if (!isSupported()) {
                return;
            }

            try {
                // Set default theme attribute if not present
                if (!document.documentElement.hasAttribute('data-theme')) {
                    const savedTheme = localStorage.getItem(THEME_KEY);
                    const initialTheme = savedTheme || getSystemPreference();
                    document.documentElement.setAttribute('data-theme', initialTheme);
                }

                // Apply the current theme
                const currentTheme = document.documentElement.getAttribute('data-theme');
                applyTheme(currentTheme);

                // Add toggle button to upload section
                const uploadSection = document.getElementById('upload-section');
                if (uploadSection) {
                    toggleButton = initializeToggleButton();
                    uploadSection.appendChild(toggleButton);
                }
            } catch (e) {
                console.error("Theme manager initialization failed", e);
                document.documentElement.setAttribute('data-theme', LIGHT_THEME);
            }
        }
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ThemeManager.init);
} else {
    ThemeManager.init();
}
