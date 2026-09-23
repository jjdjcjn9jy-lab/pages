/**
 * Wedding Photo Printer - Image Processing Module
 * Copyright (C) 2026 sandifol
 *
 * Licensed under the EUPL, Version 1.2 or – as soon they will be approved
 * by the European Commission - subsequent versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/collection/eupl/eupl-text-11-12
 *
 * Purpose: Core image handling functionality for the photo printer.
 * Features:
 * - Image upload handling
 * - Automatic downscaling of large images
 * - Cropper.js integration
 * - Image rotation support
 * - Retro (bordered square) or full-size 4x6 print styles
 * - Print functionality
 * Dependencies:
 * - Cropper.js (https://fengyuanchen.github.io/cropperjs/)
 *
 * Print geometry (Canon SELPHY CP1500, 4x6in / RP-108 sheet):
 * We render output at 300 DPI so paper-inch measurements map directly to pixels.
 * - Sheet: 4 x 6 in -> 1200 x 1800 px (2:3, matching the app's 1.5:1 crop)
 * - Retro style: 3.6 x 3.6in photo area, 0.2in side/top border, 2.2in bottom border
 *   -> 1080 x 1080 px photo, 60px side/top border, 660px bottom border (all @300dpi)
 * - Full-size style: photo fills the entire sheet (2:3 crop), no border
 * The print CSS renders the result at 96x144mm — smaller than both RP-108
 * (100x148mm) and any fallback paper, so pagination can never overflow.
 */

const PRINT_DPI = 300;
const SHEET_WIDTH_IN = 4;
const SHEET_HEIGHT_IN = 6;
const RETRO_PHOTO_IN = 3.6;
const RETRO_SIDE_BORDER_IN = 0.2;
const RETRO_BOTTOM_BORDER_IN = 2.2;

const ImageProcessor = {
    cropper: null,
    input: null,
    image: null,
    targetSize: 1800,
    printStyle: null, // 'retro' | 'full'

    initialize: function() {
        this.input = document.getElementById('image-input');
        this.image = document.getElementById('image-to-crop');

        this.input.onchange = (e) => this.handleImageUpload(e);
        document.getElementById('style-choice-retro').onclick = () => this.selectStyle('retro');
        document.getElementById('style-choice-full').onclick = () => this.selectStyle('full');
        document.getElementById('style-back-button').onclick = () => this.backToUpload();
        document.getElementById('crop-back-button').onclick = () => this.backToStyle();
        document.getElementById('rotate-button').onclick = () => this.rotateImage();
        document.getElementById('crop-button').onclick = () => this.cropImage();
        document.getElementById('print-button').onclick = () => this.printImage();
        document.getElementById('recrop-button').onclick = () => this.backToCrop();
        document.getElementById('restart-button').onclick = () => location.reload();
    },

    handleImageUpload: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            StatusManager.showMessage('Please select an image file (JPG or PNG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.processImage(e.target.result, file.name);
        };
        reader.onerror = () => {
            StatusManager.showMessage('Could not read that file. Please try again.');
        };
        reader.readAsDataURL(file);
    },

    processImage: function(imageData, fileName) {
        const img = new Image();
        img.onerror = () => {
            StatusManager.showMessage('That image file appears to be damaged or unsupported. Please try a different photo.');
        };
        img.onload = () => {
            if (img.width > this.targetSize || img.height > this.targetSize) {
                let newWidth, newHeight;
                if (img.width > img.height) {
                    newWidth = this.targetSize;
                    newHeight = (img.height / img.width) * this.targetSize;
                } else {
                    newHeight = this.targetSize;
                    newWidth = (img.width / img.height) * this.targetSize;
                }

                StatusManager.showMessage(`Large image detected (${img.width}x${img.height}). Resizing to ${Math.round(newWidth)}x${Math.round(newHeight)}...`);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // FIX: Wait for image to load in DOM before initializing cropper
                this.image.onload = () => {
                    this.image.onload = null; // Clean up listener
                    this.showStyleInterface();
                };
                this.image.src = canvas.toDataURL('image/jpeg', 0.85);
            } else {
                // FIX: Wait for image to load in DOM before initializing cropper
                this.image.onload = () => {
                    this.image.onload = null; // Clean up listener
                    this.showStyleInterface();
                };
                this.image.src = imageData;
            }
        };
        img.src = imageData;
    },

    showStyleInterface: function() {
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('style-section').style.display = 'block';
    },

    selectStyle: function(style) {
        this.printStyle = style;

        document.getElementById('style-choice-retro').classList.toggle('selected', style === 'retro');
        document.getElementById('style-choice-full').classList.toggle('selected', style === 'full');

        document.getElementById('style-section').style.display = 'none';
        this.showCropInterface();
    },

    backToUpload: function() {
        // Starting over with a new photo is simplest and avoids stale file-input/cropper state.
        location.reload();
    },

    backToCrop: function() {
        document.getElementById('print-section').style.display = 'none';
        this.showCropInterface();
    },

    backToStyle: function() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        document.getElementById('crop-section').style.display = 'none';
        document.getElementById('style-section').style.display = 'block';
    },

    showCropInterface: function() {
        document.getElementById('crop-section').style.display = 'block';

        const heading = document.getElementById('crop-step-heading');
        heading.textContent = this.printStyle === 'retro'
            ? 'Step 3: Adjust your square crop'
            : 'Step 3: Adjust your crop';

        // Preserve the crop box across re-entry (e.g. re-crop from the preview)
        // as long as the aspect ratio has not changed.
        // Retro style crops to a square (matches the 3.6x3.6in photo area);
        // full-size style crops to the CP1500's native 4x6 (2:3) aspect ratio.
        const aspectRatio = this.printStyle === 'retro' ? 1 : (SHEET_WIDTH_IN / SHEET_HEIGHT_IN);
        const previousCropData = (this.cropper && this.lastCropRatio === aspectRatio)
            ? this.cropper.getData()
            : null;
        this.lastCropRatio = aspectRatio;

        if (this.cropper) {
            this.cropper.destroy();
        }

        this.cropper = new Cropper(this.image, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            guides: true,
            autoCropArea: 0.8,
            ready: () => {
                if (previousCropData && this.cropper) {
                    this.cropper.setData(previousCropData);
                }
            }
        });
    },

    rotateImage: function() {
        if (this.cropper) {
            this.cropper.rotate(90);
        }
    },

    cropImage: function() {
        if (!this.cropper) return;

        const cropWidthPx = this.printStyle === 'retro'
            ? Math.round(RETRO_PHOTO_IN * PRINT_DPI)
            : Math.round(SHEET_WIDTH_IN * PRINT_DPI);
        const cropHeightPx = this.printStyle === 'retro'
            ? Math.round(RETRO_PHOTO_IN * PRINT_DPI)
            : Math.round(SHEET_HEIGHT_IN * PRINT_DPI);

        const croppedCanvas = this.cropper.getCroppedCanvas({
            width: cropWidthPx,
            height: cropHeightPx,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (!croppedCanvas) {
            StatusManager.showMessage('Something went wrong cropping that photo. Please try again, or try a smaller image.');
            return;
        }

        const finalCanvas = this.printStyle === 'retro'
            ? this.composeRetroSheet(croppedCanvas)
            : croppedCanvas;

        if (!finalCanvas) {
            StatusManager.showMessage('Something went wrong preparing that photo. Please try again.');
            return;
        }

        const result = document.getElementById('cropped-result');
        result.src = finalCanvas.toDataURL('image/jpeg', 0.9);
        result.classList.toggle('retro-sheet', this.printStyle === 'retro');

        document.getElementById('crop-section').style.display = 'none';
        document.getElementById('print-section').style.display = 'block';
        result.style.display = 'block';
    },

    // Composites the cropped square photo onto a full 4x6in white sheet with the
    // retro/Polaroid-style border: 0.2in top/sides, 2.2in bottom, 3.6x3.6in photo.
    composeRetroSheet: function(photoCanvas) {
        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = Math.round(SHEET_WIDTH_IN * PRINT_DPI);
        sheetCanvas.height = Math.round(SHEET_HEIGHT_IN * PRINT_DPI);

        const ctx = sheetCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

        const sideBorderPx = Math.round(RETRO_SIDE_BORDER_IN * PRINT_DPI);
        const photoSizePx = Math.round(RETRO_PHOTO_IN * PRINT_DPI);

        ctx.drawImage(photoCanvas, sideBorderPx, sideBorderPx, photoSizePx, photoSizePx);

        return sheetCanvas;
    },

    printImage: function() {
        const onAfterPrint = () => {
            window.removeEventListener('afterprint', onAfterPrint);
            StatusManager.showMessage('Photo sent to the printer. Use "Start afresh" to print another.');
        };

        window.addEventListener('afterprint', onAfterPrint);
        window.print();
    }
};
