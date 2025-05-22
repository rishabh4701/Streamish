import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
import fs from "fs"


// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const uploadFile = async (localPath) => {
    try {
        if (!localPath) {
            return null
        }
        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: "auto"
        })
        // console.log("File has been uploaded", response.url);
        fs.unlinkSync(localPath)
        return response;
    } catch (error) {
        fs.unlinkSync(localPath)
        return null
    }
}

export {uploadFile}

