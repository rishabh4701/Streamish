import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken, changePassword, currentUser, updateDetails, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT, logoutUser)  // because of next()

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changePassword)

router.route("/current-user").get(verifyJWT, currentUser)

router.route("/update-details").patch(verifyJWT, updateDetails) // patch - to not update all details, do not use post

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar) // two middlewares jwt and multer(upload)

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)  // use : for params 

router.route("/history").get(verifyJWT, getWatchHistory)

export {router}