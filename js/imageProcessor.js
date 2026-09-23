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
 * - Print functionality
 * Dependencies:
 * - Cropper.js (https://fengyuanchen.github.io/cropperjs/)
 */

const ImageProcessor = {
    cropper: null,
    input: null,
    image: null,
    targetSize: 1200,

    initialize: function() {
        this.input = document.getElementById('image-input');
        this.image = document.getElementById('image-to-crop');

        this.input.onchange = (e) => this.handleImageUpload(e);
        document.getElementById('rotate-button').onclick = () => this.rotateImage();
        document.getElementById('crop-button').onclick = () => this.cropImage();
        document.getElementById('print-button').onclick = () => this.printImage();
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
        reader.readAsDataURL(file);
    },

    processImage: function(imageData, fileName) {
        const img = new Image();
        img.onload = () => {
            if (img.width > this.targetSize || img.height > this.targetSize) {
                StatusManager.showMessage(`Large image detected (${img.width}x${img.height}). Resizing to ${this.targetSize}x${this.targetSize}...`);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let newWidth, newHeight;
                if (img.width > img.height) {
                    newWidth = this.targetSize;
                    newHeight = (img.height / img.width) * this.targetSize;
                } else {
                    newHeight = this.targetSize;
                    newWidth = (img.width / img.height) * this.targetSize;
                }

                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // FIX: Wait for image to load in DOM before initializing cropper
                this.image.onload = () => {
                    this.image.onload = null; // Clean up listener
                    this.showCropInterface();
                };
                this.image.src = canvas.toDataURL('image/jpeg', 0.85);
            } else {
                // FIX: Wait for image to load in DOM before initializing cropper
                this.image.onload = () => {
                    this.image.onload = null; // Clean up listener
                    this.showCropInterface();
                };
                this.image.src = imageData;
            }
        };
        img.src = imageData;
    },

    showCropInterface: function() {
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('crop-section').style.display = 'block';

        if (this.cropper) {
            this.cropper.destroy();
        }

        this.cropper = new Cropper(this.image, {
            aspectRatio: 1,
            viewMode: 1,
            guides: true,
            autoCropArea: 0.8
        });
    },

    rotateImage: function() {
        if (this.cropper) {
            this.cropper.rotate(90);
        }
    },

    cropImage: function() {
        if (!this.cropper) return;

        const canvas = this.cropper.getCroppedCanvas({
            width: this.targetSize,
            height: this.targetSize,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        const result = document.getElementById('cropped-result');
        result.src = canvas.toDataURL('image/jpeg', 0.85);

        document.getElementById('crop-section').style.display = 'none';
        document.getElementById('print-section').style.display = 'block';
        result.style.display = 'block';
    },

    printImage: function() {
        window.print();

        setTimeout(() => {
            if (confirm('Print another photo?')) {
                location.reload();
            }
        }, 1000);
    }
};