import express from 'express';
import bcrypt from 'bcryptjs';
import {query, run, get} from '../db/index.js';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getUrlPrefix, getUploadRoot } from '../middleware/upload.js';

const router=express.Router();

/**
* @typedef {import('express').Request & { userId?: string }} AuthRequest
*/

//create a method to download and save the avatar
//This method use online pictures (by Leo)
async function downloadAndSaveAvatar(username){
    try{

    //check if the avatar directory exists
    const avatarDir = path.join(getUploadRoot(), 'avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }

    // generate a random seed
    const randomSeed = Math.random().toString(36).substring(2, 15);
    
    // generate the file name, which is a combination of the username and the current time
    const fileName = `${username}-${Date.now()}.png`;
    const filePath = path.join(avatarDir, fileName);

    // using random seed to fetch avatar from DiceBear Bottts Neutral 
    const response = await axios({
      method: 'get',
      url: `https://api.dicebear.com/7.x/bottts-neutral/png?seed=${randomSeed}&size=200`,
      responseType: 'stream'
    });

    // save the avatar to the local file
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    // return the promise
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`${getUrlPrefix()}/avatars/${fileName}`));
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('Fail to download avatars:', error);
    return `${getUrlPrefix()}/avatars/default.png`;
  }
}



//user registration
//POST method, requires username, password, realName, dateOfBirth, and bio
router.post('/register', async (req, res,next) => {
try{
    //decode the request body
    const {username, password, realName, dateOfBirth, bio}=req.body;

    if(!username||!password||!realName||!dateOfBirth){
        return res.status(400).json({message:"Username, password, real name, and date of birth are required."});

    }
    

    //the username must be a combination of 6 to 20 characters including letters, numbers, or underscores
    if (!/^[a-zA-Z0-9_]{6,20}$/.test(username)) {
      return res.status(400).json({ 
      message:"Username must be a combination of 6 to 20 characters including letters, numbers, or underscores."
    });
    }

    // Password must be at least 8 characters long and contain both letters and numbers
    if(!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)){
        return res.status(400).json({message:"Password must be at least 8 characters long and contain both letters and numbers."});
    }

    //the date of birth must be in the format of YYYY-MM-DD 
    const birthDate=new Date(dateOfBirth);
    if(isNaN(birthDate.getTime())){
        return res.status(400).json({message:"Invalid date of birth format."});
    }

    //real name cannot exceed 50 characters
    if (realName.length > 50) {
      return res.status(400).json({ message: "Real name cannot exceed 50 characters." });
    }


    //check if the username is already taken
    const IsUserExists=await get('SELECT * FROM users WHERE username=?',[username]);

    if(IsUserExists){
        return res.status(409).json({message:"Username is already taken."});
    }

    //enctypt the password
    const hashedPassword=await bcrypt.hash(password, 10);

    //call the downloadAndSaveAvatar method to get the avatar
    const avatarUrl=await downloadAndSaveAvatar(username);


    //insert the data to db
    const result=await run(
        `INSERT INTO users (username, password, real_name, date_of_birth, bio, status,avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, 'active',?, CURRENT_TIMESTAMP)`,
        [username, hashedPassword, realName, birthDate.toISOString(), bio||'I love garlic bones.', avatarUrl]
    );
    

    //get the user 
    const newUser=await get(
        `SELECT * FROM users WHERE id=?`,[result.lastID]
    )

    //create a token
    const token =jwt.sign(
        { userId: newUser.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    )

    //format the response
    res.status(201).json({ 
    message: 'User successfully created.',
    token,
    user: {
        id: newUser.id,
        username: newUser.username,
        realName: newUser.real_name,
        dateOfBirth: newUser.date_of_birth,
        bio: newUser.bio,
        avatarUrl: newUser.avatar_url,
        createdAt: newUser.created_at
    }
    });

}catch(error){
    //pass the error to the error handler
    next(error);
}

});


//user login
//POST method, requires username and password
router.post('/login', async (req, res,next) => {
try{
    //decode the request body
    const {username, password}=req.body;

    const user=await get('SELECT * FROM users WHERE username=?',
        [username]);

    // If the user does not exist, return a 401 error
    if(!user){
        return res.status(401).json({message:"Invalid username or password."});
    }

    // 检查用户是否被ban
    if (user.status === 'banned') {
        const banExpireAt = user.ban_expire_at ? new Date(user.ban_expire_at) : null;
        if (!banExpireAt || banExpireAt > new Date()) {
            return res.status(403).json({
                message: '账号已被封禁',
                reason: user.ban_reason,
                expireAt: user.ban_expire_at
            });
        }
        // 如果封禁已过期，自动解除封禁
        await run(
            'UPDATE users SET status = ?, ban_reason = NULL, ban_expire_at = NULL WHERE id = ?',
            ['active', user.id]
        );
    }

    const isPasswordCorrect=await bcrypt.compare(password, user.password);

    // If the password verification fails, return a 401 error
    if(!isPasswordCorrect){
        return res.status(401).json({message:"Invalid username or password."});
    }

    //generate a token
    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );

    //return user information
    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        dateOfBirth: user.date_of_birth,
        bio: user.bio,
        role: user.role,
        createdAt: user.created_at
      }
    });

}catch(error){
    //pass the error to the error handler
    next(error);
}

});

//user logout
//the logout operation doesn't require any action on the server-side. The client only needs to delete the locally stored token.
router.post('/logout',authMiddleware, (req, res) => {
    res.json({ message: 'Logout successful.' });
  });


// Check if a username is available
//GET method, requires username
router.get('/check-username/:username', async (req, res,next) => {
    try{
        const {username}=req.params;
        const IsUserExists=await get('SELECT * FROM users WHERE username=?',[username]);

        if(IsUserExists){
            return res.json({available: false});
        }else{
            return res.json({available: true});
        }
        
    }catch(error){
        //pass the error to the error handler
        next(error);
    }
}
);


// Token validation
//GET method, if the token is valid, return the user information
router.get('/validate',authMiddleware, async (req, res,next) => {
    try{
        const user=await get('SELECT * FROM users WHERE id=?',
            [req.userId]);

        if(!user){
            return res.status(401).json({message:"User does not exist."});
        }
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                realName: user.real_name,
                dateOfBirth: user.date_of_birth,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                role: user.role,
                createdAt: user.created_at
        }
        });

    }catch(error){
        //pass the error to the error handler
        next(error);
    }
}
);

//Get current user information
router.get('/me', authMiddleware, async (req, res, next) => {
    try {
        const user=await get('SELECT * FROM users WHERE id=?',
            [req.userId]);

        if(!user){
            return res.status(404).json({message:"User does not exist."});
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                realName: user.real_name,
                dateOfBirth: user.date_of_birth,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                role: user.role,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        //pass the error to the error handler
      next(error);
    }
  });


//Refresh token
//POST method
router.post('/refresh-token', authMiddleware, async (req, res, next) => {
    try{
        const user = await get('SELECT * FROM users WHERE id=?',
            [req.userId]);
        
        if(!user){  
            return res.status(404).json({message:"User does not exist."});
        }

        //generate a new token
        const token=jwt.sign(
            {userId: user.id},
            process.env.JWT_SECRET||'your-secret-key',
            {expiresIn: '24h'}
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                realName: user.real_name,
                dateOfBirth: user.date_of_birth,
                bio: user.bio,
                avatarUrl: user.avatar_url,
                role: user.role,
                createdAt: user.created_at
                }
            });

    }catch(error){  
        //pass the error to the error handler
        next(error);
    }
}
);


// Change password
//POST method, requires currentPassword and newPassword
router.post('/change-password', authMiddleware, async (req, res, next) => {
    try{
        const {currentPassword, newPassword}=req.body;

        //get the user
        const user=await get(
            'SELECT * FROM users WHERE id=?',
            [req.userId]
        );

        if(!user){
            return res.status(404).json({message:"User does not exist."});
        }

        //verify the current password
        const isPasswordCorrect=await bcrypt.compare(currentPassword, user.password);

        if(!isPasswordCorrect){
            return res.status(401).json({message:"Current password is incorrect."});
        }

        //check the new password is at least 8 characters long and contains both letters and numbers
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(newPassword)) {
        return res.status(400).json({ 
            message: 'The new password must be at least 8 characters long and contain both letters and numbers.' 
        });
        }

        //encrypt the new password and store it
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await run(
            'UPDATE users SET password=? WHERE id=?',
            [hashedPassword, req.userId]
        );

        res.json({ message: 'Password changed successfully.' });

    }catch(error){
        //pass the error to the error handler
        next(error);
    }
}
);

export{router as authRouter};