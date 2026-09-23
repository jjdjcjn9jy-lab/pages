# Wedding Photo Printer

[![EUPL 1.2](https://img.shields.io/badge/License-EUPL_1.2-blue.svg)](LICENSE)

A simple web application for printing wedding photos with automatic cropping and resizing.

## Features

- Upload photos from any device
- Choice of print styles: retro instant-photo square or borderless 4x6
- Automatic downscaling of large images
- Print-optimized output for the Canon SELPHY CP1500
- Light and dark themes, following your system preference
- Playful wedding-themed interface

## How to Use

1. Visit the application in your browser
2. Tap the upload area to select a photo
3. Choose your print style
4. Adjust the crop as desired, rotating if needed
5. Click "Confirm Crop" to see the preview
6. Tap "Print My Photo" to hand the photo to your device: phones open the share sheet (choose Canon PRINT, AirPrint or Mopria); computers download the photo to print via Canon PRINT
7. Use "Re-crop Photo" to adjust again, or "Start afresh" to begin over with a new photo

## Technical Details

- Built with vanilla JavaScript (no framework dependencies)
- Uses [Cropper.js](https://fengyuanchen.github.io/cropperjs/) for image cropping
- Modular architecture for maintainability
- Responsive design for all device sizes

## AI Assistance

This project was developed with assistance from **Mistral AI**, which provided code templates, architectural suggestions, and implementation guidance. All AI-generated content was reviewed, tested, and adapted by the project maintainer to meet the specific requirements of this wedding photo printer application.

## Licensing and Contribution

This project is licensed under the [European Union Public Licence v1.2](LICENSE).

All contributions must be made under the same license. By submitting code, you agree to license your contributions under EUPL.