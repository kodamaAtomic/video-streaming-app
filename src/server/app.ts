import express from 'express';
import bodyParser from 'body-parser';
import videoRoutes from './routes/videos';
import thumbnailRoutes from './routes/thumbnails';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('storage'));

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/thumbnails', thumbnailRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});