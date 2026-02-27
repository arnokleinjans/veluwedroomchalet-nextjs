"use server";

import fs from "fs";
import path from "path";

// Helper function to safely read files from a public directory
const getFilesFromDir = (dirName: string): string[] => {
    try {
        const targetPath = path.join(process.cwd(), "public", dirName);
        if (!fs.existsSync(targetPath)) return [];

        // Read directory and filter out hidden files, keeping only media files
        const files = fs.readdirSync(targetPath);
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return !file.startsWith('.') && ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext);
        });
    } catch (error) {
        console.error(`Error reading directory public/${dirName}:`, error);
        return [];
    }
};

// Fetch all available header images from public/images
export async function fetchAvailableHeaderImages() {
    // We return the path relative to the public folder (e.g., 'images/file.jpg' or '/images/file.jpg')
    // Currently the app uses 'images/...' format in defaultAppData
    const files = getFilesFromDir("images");
    return files.map(file => `images/${file}`);
}

// Fetch all available icons from public/icons
export async function fetchAvailableIcons() {
    const files = getFilesFromDir("icons");
    return files.map(file => `icons/${file}`);
}

// Fetch all available thumbnails from public/thumbnails
export async function fetchAvailableThumbnails() {
    const files = getFilesFromDir("thumbnails");
    return files.map(file => `thumbnails/${file}`);
}
