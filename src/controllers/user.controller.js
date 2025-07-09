import { asyncHandler } from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadFile} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken";
import { error } from "console"
import mongoose from "mongoose"
// import { useReducer } from "react"


const { JsonWebTokenError } = jwt;
const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async(req, res) => {
    const{fullname, email, username, password} = req.body

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new apiError(400, "Fields cannot be empty")
    }

    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    })
    if(existedUser){
        throw new apiError(409, "User Already Exists!!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && (req.files.coverImage.length > 0)) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is Required")
    }

    const avatar = await uploadFile(avatarLocalPath)
    const coverImage = await uploadFile(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(400, "Avatar is Required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully ")
    )
})

const loginUser = asyncHandler(async(req, res) => {
    const{email, username, password} = req.body
    console.log(email);
    

    if(!username && !email){
        throw new apiError(400, "Username or Email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new apiError(404, "User does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new apiError(401, "Invalid Password")
    }

    const{accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User LoggedIn Succesfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User Logging Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new apiError(401, "Invalid Rfresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new apiError(401, "Refresh token expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new apiResponse(
                200, {accessToken, refreshToken: newrefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }


})

const changePassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed"))
})

const currentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current user fetched successfully"))
})

const updateDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body;
    if(!fullname || !email){
        throw new apiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        {new: true}
    ).select("-password")
    
    return res
    .status(200)
    .json(new apiResponse(200, user, "Account Details Updated"))
})

const updateAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path  

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is missing")
    }

    const avatar = uploadFile(avatarLocalPath)

    if(!avatar.url){
        throw new apiError(400, "Error in getting url of avatar")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id, {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Avatar updated")
    )

})

const updateCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path  

    if(!coverImageLocalPath){
        throw new apiError(400, "Cover Image is missing")
    }

    const coverImage = uploadFile(coverImageLocalPath)

    if(!coverImage.url){
        throw new apiError(400, "Error in uploading image")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id, {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Cover Image updated")
    )

})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new apiError(400, "username not available")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subdcriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedTo: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    } 
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedTo: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new apiError(404, "channel does not exists")
    }
    
    return res
    .status(200)
    .json(
        new apiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id) // converting string to id as string is saved as id in mongdb
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // writing sub pipelines 
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            user[0].watchHistory,
            "Watch History Fetched Successfully"
        )
    ) 
})


export {registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, currentUser, updateDetails, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory}