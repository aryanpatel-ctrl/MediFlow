const { v2: cloudinary } = require('cloudinary');

const hasExplicitConfig = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
const hasUrlConfig = process.env.CLOUDINARY_URL;

if (hasExplicitConfig || hasUrlConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const ensureConfigured = () => {
  if (!hasExplicitConfig && !hasUrlConfig) {
    throw new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL).');
  }
};

const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    ensureConfigured();

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });

    stream.end(buffer);
  });

module.exports = {
  cloudinary,
  uploadBuffer,
};
