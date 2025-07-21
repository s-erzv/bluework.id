// backend/server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve static files from the React app's build directory
// In a production setup, you would build your React app and serve the 'dist' folder
// For development, the React dev server handles this.
// This part is more relevant if you're serving the React app from the Express server in production.
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// API Routes (Example - you can expand this for admin features, integrations, etc.)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is healthy!' });
});

// You can add more API endpoints here, e.g., for admin dashboard data,
// proxying requests to Talixa/People Partner, or handling PDF/Excel exports.
// For instance, to handle PDF/Excel export, you'd need libraries like 'pdfmake' or 'exceljs'
// and fetch data from Supabase here.

// Catch-all to serve the React app for any other requests (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});