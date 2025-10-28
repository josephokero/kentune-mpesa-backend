const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Optionally specify databaseURL if needed
  });
}

const db = admin.firestore();

module.exports = db;
