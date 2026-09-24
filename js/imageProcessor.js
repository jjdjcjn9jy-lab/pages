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
 * - Retro (bordered square) or full-size print styles, both on 100x148mm sheets
 * - Print functionality
 * Dependencies:
 * - Cropper.js (https://fengyuanchen.github.io/cropperjs/)
 *
 * Print geometry (Canon SELPHY CP1500, RP-108 sheet, 100 x 148mm):
 * We render output at 300 DPI so mm measurements map directly to pixels
 * (1mm @300dpi = 11.811px, rounded to whole pixels below).
 *
 * The RP-108 sheet (100 x 148mm) is NOT a true 2:3 ratio (2:3 would be
 * 100 x 150mm). Rather than crop the photo to fit the odd sheet ratio,
 * we keep the crop at a true 2:3 ratio (matching what the user sees in
 * the crop step) and let a white border absorb the ~2mm difference:
 * - Sheet: 100 x 148mm -> 1181 x 1748 px
 * - Full-size style: 90 x 135mm photo (true 2:3), centered
 *   -> 5mm side border, 6.5mm top/bottom border
 * - Retro style: 90 x 90mm square photo, 5mm side/top border,
 *   53mm bottom border (matches the full-size side border for consistency)
 */

const PRINT_DPI = 300;
const MM_PER_INCH = 25.4;
const SHEET_WIDTH_MM = 100;
const SHEET_HEIGHT_MM = 148;
const FULL_PHOTO_WIDTH_MM = 90;
const FULL_PHOTO_HEIGHT_MM = 135; // true 2:3 ratio (90 * 3/2)
const RETRO_PHOTO_MM = 90;
const RETRO_BORDER_MM = 5; // side/top border for retro, and side border for full-size

function mmToPx(mm) {
    return Math.round((mm / MM_PER_INCH) * PRINT_DPI);
}

const ImageProcessor = {
    cropper: null,
    input: null,
    image: null,
    targetSize: 1800,
    printStyle: null, // 'retro' | 'full'
    finalDataUrl: null,

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
        // Retro style crops to a square (matches the 90x90mm photo area);
        // full-size style crops to a true 2:3 ratio (matches the 90x135mm photo
        // area). Neither matches the sheet's own 100:148 ratio; a white border
        // absorbs the difference at print time rather than cropping the photo.
        const aspectRatio = this.printStyle === 'retro' ? 1 : (2 / 3);
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
            : mmToPx(FULL_PHOTO_WIDTH_MM);
        const cropHeightPx = this.printStyle === 'retro'
            ? mmToPx(RETRO_PHOTO_MM)
            : mmToPx(FULL_PHOTO_HEIGHT_MM);

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

        const finalCanvas = this.composeSheet(croppedCanvas);

        if (!finalCanvas) {
            StatusManager.showMessage('Something went wrong preparing that photo. Please try again.');
            return;
        }

        const result = document.getElementById('cropped-result');
        this.finalDataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
        result.src = this.finalDataUrl;

        document.getElementById('crop-section').style.display = 'none';
        document.getElementById('print-section').style.display = 'block';
        result.style.display = 'block';
    },

    // Composites the cropped photo onto a full 100x148mm white sheet, matching
    // the RP-108 paper exactly. Neither print style's photo area is the same
    // aspect ratio as the sheet itself, so a white border makes up the
    // difference rather than the photo being cropped further:
    // - retro: 90x90mm photo, 5mm side/top border, 53mm bottom border
    // - full: 90x135mm photo (true 2:3), 5mm side border, 6.5mm top/bottom border
    composeSheet: function(photoCanvas) {
        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = mmToPx(SHEET_WIDTH_MM);
        sheetCanvas.height = mmToPx(SHEET_HEIGHT_MM);

        const ctx = sheetCanvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

        const sideBorderPx = mmToPx(RETRO_BORDER_MM);

        if (this.printStyle === 'retro') {
            const photoSizePx = mmToPx(RETRO_PHOTO_MM);
            ctx.drawImage(photoCanvas, sideBorderPx, sideBorderPx, photoSizePx, photoSizePx);
        } else {
            const photoWidthPx = mmToPx(FULL_PHOTO_WIDTH_MM);
            const photoHeightPx = mmToPx(FULL_PHOTO_HEIGHT_MM);
            const topBorderPx = Math.round((sheetCanvas.height - photoHeightPx) / 2);
            ctx.drawImage(photoCanvas, sideBorderPx, topBorderPx, photoWidthPx, photoHeightPx);
        }

        return sheetCanvas;
    },

    printImage: function() {
        const printButton = document.getElementById('print-button');

        if (PCloudUploader.isConfigured()) {
            this.uploadForPrinting(printButton);
        } else {
            this.printViaBrowser();
        }
    },

    // Sends the finished photo to the pCloud drop folder that the kiosk
    // device watches, instead of relying on the guest's own browser print
    // dialog (which, on Firefox Android and all iOS browsers, does not
    // reliably honour the @page paper size and produces a wrong-scale or
    // multi-page result — see css/styles.css print notes).
    uploadForPrinting: function(printButton) {
        if (!this.finalDataUrl) {
            StatusManager.showMessage('No photo ready to send yet. Please confirm your crop first.');
            return;
        }

        if (printButton) {
            printButton.disabled = true;
        }
        StatusManager.showMessage('Sending your photo to the printer…');

        PCloudUploader.uploadPhoto(this.finalDataUrl)
            .then(() => {
                StatusManager.showMessage('Sent! Your photo will print shortly. Use "Start afresh" to send another.');
            })
            .catch((err) => {
                console.error('pCloud upload failed, falling back to browser print', err);
                StatusManager.showMessage('Could not reach the printer online — trying this device\'s print dialog instead.');
                this.printViaBrowser();
            })
            .finally(() => {
                if (printButton) {
                    printButton.disabled = false;
                }
            });
    },

    printViaBrowser: function() {
        const onAfterPrint = () => {
            window.removeEventListener('afterprint', onAfterPrint);
            StatusManager.showMessage('Photo sent to the printer. Use "Start afresh" to print another.');
        };

        window.addEventListener('afterprint', onAfterPrint);
        window.print();
    }
};
