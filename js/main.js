/**
 * Wedding Photo Printer - Main Application Module
 * Copyright (C) 2026 sandifol
 *
 * Licensed under the EUPL, Version 1.2 or – as soon they will be approved
 * by the European Commission - subsequent versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/collection/eupl/eupl-text-11-12
 *
 * Purpose: Initializes and coordinates all application modules.
 * Features:
 * - Application startup sequence
 * - Module initialization
 * - Event binding
 * Dependencies:
 * - subtitleManager.js
 * - statusManager.js
 * - imageProcessor.js
 */

// Initialize the application when the page loads
window.onload = function() {
    SubtitleManager.setRandomSubtitle();
    ImageProcessor.initialize();
};