import jwt from 'jsonwebtoken';

import {get} from '../db/index.js';


//This middleware uses JWT to verify the token.
//If it is valid, it attaches the user's ID and user object to the request object.
export const authMiddleware=async(req,res,next)=>{

    try{
    //check if it contains a token
    const token=req.headers.authorization?.split(' ')[1];
    if(!token){
        return res.status(401).json({message:'Authentication token not provided'});
    }
    
    //verify the token
    const decodedJWT=jwt.verify(token,process.env.JWT_SECRET||'your-secret-key');

    if(!decodedJWT.userId){
        return res.status(401).json({message:'Invalid authentication token'});
    }
    
    //get the user from the database
    const user=await get('SELECT id,username,role FROM users WHERE id=?',
        [decodedJWT.userId]);

    if(!user){
        return res.status(401).json({message:'User does not exist'});
    }

    //add userID and user to the request object
    req.userId=decodedJWT.userId;
    req.user={
        id:user.id,
        username:user.username,
        role:user.role
    };

    //add isAdmin to the request object
    req.isAdmin= user.role ==='admin';

    next();
    }catch(error){
        return res.status(401).json({message:'Authentication failed'});
    }
};




//This middleware checks if the user has admin privileges.
//It should be used after the authMiddleware.
export const isAdmin=(req,res,next)=>{
    if(!req.isAdmin){
        return res.status(403).json({message:'Unauthorized'});
    }
    next();
};