# Wedding Photo Printer

[![EUPL 1.2](https://img.shields.io/badge/License-EUPL_1.2-blue.svg)](LICENSE)

A simple web application for printing wedding photos with automatic cropping and resizing.

## Features

- Upload photos from any device, no app install required
- Choice of print styles: retro instant-photo square, or classic 4x6 look with a thin white border
- Automatic downscaling of large images
- Print-optimized output for the Canon SELPHY CP1500 on RP-108 (100x148mm) paper
- Printing is handled via a private cloud drop-off and a printer-connected kiosk device, to work around mobile browsers' unreliable print-dialog paper sizing (see [Printing Architecture](#printing-architecture) below)
- A privacy notice on the upload screen tells guests that printed photos are also kept on the couple's private cloud drive
- Light and dark themes, following your system preference
- Playful wedding-themed interface

## How to Use

1. Visit the application in your browser
2. Tap the upload area to select a photo
3. Choose your print style
4. Adjust the crop as desired, rotating if needed
5. Click "Confirm Crop" to see the preview
6. Click "Print My Photo" to send it to the printer
7. Use "Re-crop Photo" to adjust again, or "Start afresh" to begin over with a new photo

## Printing Architecture

Printing a photo does not use the guest's own browser print dialog by
default. Mobile browsers — specifically Firefox for Android, and all
browsers on iOS (which are required to use Apple's WebKit engine) — do not
reliably support custom paper sizes in their print dialogs, which previously
caused photos to print at the wrong scale or across multiple pages.

Instead, "Print My Photo" uploads the finished, correctly-sized photo to a
private pCloud folder via a write-only "upload link" (`js/pcloudUploader.js`).
A separate kiosk device connected to the printer (`kiosk/print_watcher.py`,
intended for a Raspberry Pi or similar) polls that folder and sends new
photos straight to the SELPHY via CUPS. If the upload fails for any reason
(no network, pCloud unreachable), the app automatically falls back to the
guest's own browser print dialog.

## Privacy and Data Handling

Because printed photos pass through the couple's private pCloud account,
guests are shown a notice on the upload screen explaining this before they
upload anything, with a link to a read-only public view of where the photos
are kept.

If you fork this project for your own event, update the notice text and
link in `index.html` (`.privacy-notice`), and generate your own pCloud
upload link and folder rather than reusing anyone else's — see the setup
comments at the top of `js/pcloudUploader.js` and `kiosk/print_watcher.py`.

## Technical Details

- Built with vanilla JavaScript (no framework dependencies)
- Uses [Cropper.js](https://fengyuanchen.github.io/cropperjs/) for image cropping
- Uses the [pCloud API](https://docs.pcloud.com/) for the print hand-off (see Printing Architecture)
- Modular architecture for maintainability
- Responsive design for all device sizes

## AI Assistance

This project was developed with assistance from **Mistral AI**, which provided code templates, architectural suggestions, and implementation guidance. All AI-generated content was reviewed, tested, and adapted by the project maintainer to meet the specific requirements of this wedding photo printer application.

## Licensing and Contribution

This project is licensed under the [European Union Public Licence v1.2](LICENSE).

All contributions must be made under the same license. By submitting code, you agree to license your contributions under EUPL.
