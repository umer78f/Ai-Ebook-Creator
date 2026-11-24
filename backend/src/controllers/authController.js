const jwt = require("jsonwebtoken");
const express = require("express");
const userModel = require("../models/User");



// generate jwt token

function generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    })
}


async function registerUser(req, res) {
    const { name, email, password } = req.body;

    try {

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please fill all fields" })
        }

        const userExist = await userModel.findOne({ email });

        if (userExist) {
            return res.status(400).json({ message: "user already exist" })
        }

        const user = await userModel.create({
            name, email, password
        })

        if(user){
            res.status(200).json({
                message:"user registered successfully",
                user:{
                    name:user.name,
                    email:user.email
                },
                token:generateToken(user._id)
            })
        }else{
            res.status(400).json({message:"invalid user data"})
        }

    } catch (err) {
        res.status(500).json({ message: `internal server error : ${err}` })
    }
}

async function loginUser(req, res) {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({email}).select("+password")
        if(user && (await user.matchPassword(password))){
            res.status(200).json({
                message:"Login Successfull",
                _id : user._id,
                name: user.name,
                email:user.email,
                token: generateToken(user._id),
            })
        }
    } catch (err) {
        res.status(500).json({ message: `internal server error, ${err}` })
    }
}

async function getProfile(req, res) {
    try {
        const user = await userModel.findById(req.user.id)
        res.json({
            _id:user._id,
            name:user.name,
            email:user.email,
            avatar:user.avatar,
            isPro:user.isPro
        })
    } catch (err) {
        res.status(500).json({ message: "internal server error" })
    }
}

async function updateProfile(req, res) {
    try {
        const user = await userModel.findById(req.user.id);
        if(user){
            user.name = req.body.name || user.name;
            const updatedUser = await user.save();

            res.json({
                _id:updatedUser._id,
                name:updatedUser.name   
            })
        }else{
            res.status(404).json({message:"user not found"})
        }
    } catch (err) {
        res.status(500).json({ message: "internal server error" })
    }
}


module.exports = { loginUser, registerUser, getProfile, updateProfile }