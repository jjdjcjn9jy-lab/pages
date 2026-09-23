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
 * Print geometry (Canon SELPHY CP1500 with RP-108 postcard paper, borderless):
 * RP-108 sheets are 100 x 148 mm (marketed as "4x6" but not exactly 4x6 inches).
 * We render output at 300 DPI so paper-mm measurements map directly to pixels.
 * - Sheet: 100 x 148 mm -> 1181 x 1748 px
 * - Retro style: 90 x 90 mm photo area, 5 mm side/top border, 53 mm bottom border
 *   -> 1063 x 1063 px photo, 59px side/top border, 626px bottom border (all @300dpi)
 * - Full-size style: photo fills the entire sheet (100:148 crop), no border
 */

const PRINT_DPI = 300;
const MM_PER_IN = 25.4;
const SHEET_WIDTH_MM = 100;
const SHEET_HEIGHT_MM = 148;
const RETRO_PHOTO_MM = 90;
const RETRO_SIDE_BORDER_MM = 5;
const RETRO_BOTTOM_BORDER_MM = 53;

function mmToPx(mm) {
    return Math.round((mm / MM_PER_IN) * PRINT_DPI);
}

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
        const aspectRatio = this.printStyle === 'retro' ? 1 : (SHEET_WIDTH_MM / SHEET_HEIGHT_MM);
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
            ? mmToPx(RETRO_PHOTO_MM)
            : mmToPx(SHEET_WIDTH_MM);
        const cropHeightPx = this.printStyle === 'retro'
            ? mmToPx(RETRO_PHOTO_MM)
            : mmToPx(SHEET_HEIGHT_MM);

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

        document.getElementById('crop-section').style.display = 'none';
        document.getElementById('print-section').style.display = 'block';
        result.style.display = 'block';
    },

    // Composites the cropped square photo onto a full RP-108 (100x148mm) white sheet
    // with the retro/Polaroid-style border: 5mm top/sides, 53mm bottom, 90x90mm photo.
    composeRetroSheet: function(photoCanvas) {
        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = mmToPx(SHEET_WIDTH_MM);
        sheetCanvas.height = mmToPx(SHEET_HEIGHT_MM);

        const ctx = sheetCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

        const sideBorderPx = mmToPx(RETRO_SIDE_BORDER_MM);
        const photoSizePx = mmToPx(RETRO_PHOTO_MM);

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
