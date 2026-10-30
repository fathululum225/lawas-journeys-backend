const app = require('../app'); // Mengambil aplikasi Express dari app.js
const serverless = require('serverless-http');

// Ekspor aplikasi Express sebagai serverless function
module.exports = serverless(app);