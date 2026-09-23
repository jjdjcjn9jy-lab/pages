/**
 * Wedding Photo Printer - Subtitle Management Module
 * Copyright (C) 2026 sandifol
 *
 * Licensed under the EUPL, Version 1.2 or – as soon they will be approved
 * by the European Commission - subsequent versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/collection/eupl/eupl-text-11-12
 *
 * Purpose: Manages the random subtitle functionality for the wedding photo printer.
 * Features:
 * - Maintains a collection of witty subtitles
 * - Randomly selects and displays subtitles
 * - Handles subtitle HTML injection
 */

const SubtitleManager = {
    lines: [
        "Memories fade. Photos might too, but maybe not as quickly.",
        "If it's broken, ask Roxy – she's the tech geek.",
        "Feed me your JPEGs, let me vomit out memories.",
        "It doesn't need to be <a href='https://rps.org/about/awards/' target='_blank'>RPS Award</a>-worthy to be worth printing.",
        "Because how secure is cloud storage <i>really</i>?",
        "Consider this our gift to you. You're welcome, by the way.",
        "If you use this to print all your holiday snaps I will find you and hurt you.",
        "Now with 100% more dark mode!"
    ],

    setRandomSubtitle: function() {
        const randomIndex = Math.floor(Math.random() * this.lines.length);
        document.getElementById('random-subtitle').innerHTML = this.lines[randomIndex];
    }
};