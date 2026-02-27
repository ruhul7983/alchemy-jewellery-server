// shared/utils/fileHandler.js
const fs = require('fs').promises; // Use promise-based fs
const path = require('path');

const deleteFile = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    // Extract filename from the URL (e.g., "http://localhost:3000/uploads/profiles/user-123.jpg")
    const filename = imageUrl.split('/').pop();
    const filePath = path.join(__dirname, '../../public/uploads/profiles', filename);

    // Check if file exists before trying to delete
    await fs.access(filePath);
    await fs.unlink(filePath);
    console.log(`Successfully deleted: ${filename}`);
  } catch (error) {
    // We don't want to crash the app if the file was already missing
    console.error("Error deleting old file:", error.message);
  }
};

module.exports = { deleteFile };