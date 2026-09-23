/**
 * Wedding Photo Printer - Status Message Module
 * Copyright (C) 2026 sandifol
 *
 * Licensed under the EUPL, Version 1.2 or – as soon they will be approved
 * by the European Commission - subsequent versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/collection/eupl/eupl-text-11-12
 *
 * Purpose: Handles user feedback and status messages.
 * Features:
 * - Displays temporary status messages
 * - Auto-hides messages after delay
 * - Provides consistent user feedback interface
 */

const StatusManager = {
    showMessage: function(message) {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.style.display = 'block';

        // Hide message after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
};