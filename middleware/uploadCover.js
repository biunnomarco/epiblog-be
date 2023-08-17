const cloudinary = require ('cloudinary').v2;
const {CloudinaryStorage} = require('multer-storage-cloudinary')
const multer = require ('multer')

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const storageCover = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        floder: 'covers', //nome
        allowed_formats: ['jpg', 'jpeg', 'png']
    }
})

const cover = multer({
    storage: storageCover
})

module.exports = cover
