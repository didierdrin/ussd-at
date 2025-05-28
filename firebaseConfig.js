const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to the service account key stored in Render secrets
const serviceAccountPath = '/etc/secrets/serviceAccountKey.json';

// Read and parse the service account JSON file
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://passtrack-3e434.firebaseio.com"
        });
        console.log('Firebase Admin successfully initialized!!!!!!!!!!!!!!!!!');
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

// Export the Firestore instance and admin
module.exports = {
    firestore: admin.firestore(),
    admin: admin
};


// import admin from 'firebase-admin';
// import { readFileSync } from 'fs';
// import path from 'path';

// // Path to the service account key stored in Render secrets
// const serviceAccountPath = '/etc/secrets/serviceAccountKey.json';

// // Read and parse the service account JSON file
// const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));


// if (!admin.apps.length) {
//     try {
//         admin.initializeApp({
//             credential: admin.credential.cert(serviceAccount),
//             databaseURL: "https://passtrack-3e434.firebaseio.com"
//         });
//         console.log('Firebase Admin successfully initialized!!!!!!!!!!!!!!!!!');
//     } catch (error) {
//         console.error('Firebase Admin initialization error:', error);
//     }
// }


// // Export the Firestore instance
// export const firestore = admin.firestore();