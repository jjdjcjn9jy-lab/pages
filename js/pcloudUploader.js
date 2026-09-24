/**
 * Wedding Photo Printer - pCloud Upload Module
 * Copyright (C) 2026 sandifol
 *
 * Licensed under the EUPL, Version 1.2 or – as soon they will be approved
 * by the European Commission - subsequent versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/collection/eupl/eupl-text-11-12
 *
 * Purpose: Uploads the finished, print-ready photo to a pCloud "upload link"
 * folder, so a separate kiosk device (watching that folder) can print it —
 * this sidesteps mobile browsers' unreliable print-dialog paper-size support
 * (see imageProcessor.js print geometry notes) without requiring guests to
 * install anything.
 *
 * Security model:
 * - PCLOUD_UPLOAD_CODE below is a pCloud "upload link" code, generated once
 *   from the account owner's pCloud account (Settings -> Upload Links, or the
 *   createuploadlink API call), scoped to ONE folder.
 * - This code grants WRITE-ONLY access to that single folder: holders of the
 *   code can drop files in, but cannot list, read, download, or modify
 *   anything else in the account. This is different from an account
 *   password or a full-access API token, neither of which should ever be
 *   placed in client-side code.
 * - It is still visible to anyone who inspects this file or the network
 *   request, so treat it as semi-public: if it is ever abused (spammed with
 *   junk uploads), revoke and regenerate it from pCloud's dashboard
 *   (Settings -> Upload Links -> Delete), which invalidates this code
 *   immediately without affecting the rest of the account.
 *
 * API reference: https://docs.pcloud.com/methods/uploadlinks/uploadtolink.html
 */

const PCloudUploader = {
    // EU endpoint, per account region. US accounts should use api.pcloud.com instead.
    UPLOAD_ENDPOINT: 'https://eapi.pcloud.com/uploadtolink',

    // Placeholder used by isConfigured() to detect an unconfigured deploy.
    // Deliberately not a valid code format, so it can never match a real one.
    PLACEHOLDER_CODE: 'REPLACE_WITH_YOUR_UPLOAD_CODE',

    // Set this to the upload link code from your pCloud account
    // (Settings -> Upload Links -> create one for the print-drop folder).
    // Leave as the placeholder to disable pCloud upload (print button falls
    // back to the browser print dialog only).
    UPLOAD_CODE: 'LSN7ZKqi7pQBGGGXX7XhHXeqcLprB9Wf7',

    isConfigured: function() {
        return !!this.UPLOAD_CODE && this.UPLOAD_CODE !== this.PLACEHOLDER_CODE;
    },

    // dataUrl: a 'data:image/jpeg;base64,...' string (as produced by
    // canvas.toDataURL in imageProcessor.js). Returns a Promise.
    uploadPhoto: function(dataUrl) {
        if (!this.isConfigured()) {
            return Promise.reject(new Error('pCloud upload is not configured.'));
        }

        return this.dataUrlToBlob(dataUrl).then((blob) => {
            const filename = this.generateFilename();

            const formData = new FormData();
            formData.append('code', this.UPLOAD_CODE);
            formData.append('names', filename);
            formData.append('file', blob, filename);

            return fetch(this.UPLOAD_ENDPOINT, {
                method: 'POST',
                body: formData
            });
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`Upload failed with HTTP status ${response.status}`);
            }
            return response.json();
        }).then((result) => {
            // pCloud's API returns HTTP 200 even for application-level
            // errors, with a nonzero "result" field indicating the error
            // code (see https://docs.pcloud.com/errors/). Treat anything
            // other than result === 0 as a failure.
            if (result.result !== 0) {
                throw new Error(`pCloud upload error (code ${result.result}): ${result.error || 'unknown error'}`);
            }
            return result;
        });
    },

    generateFilename: function() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const random = Math.floor(Math.random() * 10000);
        return `wedding-photo-${stamp}-${random}.jpg`;
    },

    dataUrlToBlob: function(dataUrl) {
        return fetch(dataUrl).then((res) => res.blob());
    }
};
