const express = require('express'); 
const router = express.Router();
const cloudinary = require("cloudinary");
var multer = require('multer');
const bodyParser = require("body-parser");

// importing models
var Category = require('../models/CategorySchema');
var Post = require('../models/PostSchema');
var User = require('../models/UserSchema');
var Keyword = require('../models/KeywordSchema');

// multer and cloudinary configurations for file uploads
var storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});

// logged in check 
router.use((req,res,next)=>{
    if(!req.isAuthenticated()){
        req.flash('error','You are required to log in !')
        return res.redirect('/')
    }
    next();
});

// image filter 
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter })

// cloudinary configurations
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// show all users in list to follow / unfollow
router.get('/all', function (req, res) {
        // find all users in user model
        User.find({},(err,users) => {
            if (err){ res.redirect('/home')}else{
                res.render('all_users', { users: users , owner: req.user})
            }
        })
})

// after registering 
// redirect to suggest users to follow page
router.get('/suggested',(req, res) => {
    // algorithm for suggested users (not written yet )
    User.find({},(err, user) => {
        if (err) {res.redirect('/');}else{
            res.render('all_users',{owner:req.user,users:user})
        }
    })
})

// see other user's profile
router.get("/:user/dashboard", function (req, res) {
        // find user by username
        User.findOne({ username: req.params.user })
            // populate the postedby path of all the posts 
            .populate({path:'posts',populate:{path:'postedBy'}}).exec((err, user) => {
                if(user===null || err) {res.redirect('/home')}
                else{
                res.render('dashboard', { posts: user.posts, user: user  , owner : req.user});}
        })
})

// owner's profile
router.get("/profile", (req, res) => {
        // find owner details
        User.findOne({ _id: req.user._id })
            // populate the postedby path of all the posts 
            .populate({path:'posts',populate:[{path:'postedBy'},{path:'category'}]}).exec((err, user) => {
                res.render('profile', { posts: user.posts, user: user  });
            })
});

// edit profile page
router.get("/profile/:id/edit", function (req, res) {
        // find the user 
        User.findById((req.params.id), (err, founduser) => {
            if (err) { res.redirect('/home')
          } else {
              // send user details to profile edit page
                res.render('profileedit', {user: founduser });
            }
        })
})


// edit user profile route
router.put('/:id', upload.single('image'), (req, res) => {
    // find user by user id 
    User.findById(req.params.id, async function (err, user) {
        if (err) {
            res.redirect("/home");
        } else {
            // if profile photo has been added i.e. file 
            if (req.file) {
                try {
                    // destroy the current image 
                    await cloudinary.uploader.destroy(user.imageId);
                    // add new image 
                    var result = await cloudinary.uploader.upload(req.file.path);
                    user.image = result.secure_url;
                    user.imageId = result.public_id;
                } catch (err) {
                    return res.redirect('/home');
                }
            }
            // update other information 
            user.name = req.body.name;
            user.bio = req.body.bio; 
            // save details ss
            await user.save((err) => {
                if (err) { res.redirect('/home') }
            });
            req.flash('success','Your profile has been successfully updated.');
            res.redirect('/home');
        }
    });
})

// show followers of user 
router.get('/followers/:page',(req, res)=>{
    // page number 
    page = req.params.page - 1
    //limits , startlimit , endlimit 
    limit = 4 
    start = page * limit
    end = page * limit + limit 
    // find user
    User.findById(req.user._id)
        // populate followers array 
        .populate('followers')
        .exec((err, user) => {
            if (err) res.redirect('/home');
            else{
                res.render('followers_show', { owner :user, followers: user.followers.slice(start,end) , total_length : user.followers.length , active:page });}
        })
})

//show following of the user
router.get('/following/:page',(req, res)=>{
    page = req.params.page - 1
    //limits , startlimit , endlimit 
    limit = 4 
    start = page * limit
    end = page * limit + limit 
   if (req.isAuthenticated()) {
       // find user 
        User.findById(req.user._id)
            // populate following array
            .populate('following')
            .exec((err, user) => {
                if (err) res.redirect('/home');
                else{
                    res.render('following_show', { owner :user, following: user.following.slice(start,end) , total_length : user.following.length , active:page });}
            })
    } else
        res.redirect('/');
})

//follow user request
router.put("/:id/follow", (req, res) => {
    // 
    userid = req.params.id
    // find user
    User.findById(userid , (err , user) => {
        if (err){(res.redirect('/home'))}else{
            // find owner user and add the given user to the following array 
            User.findOneAndUpdate({_id:req.user._id} , {$addToSet: { following : user}},function(err){
                if (err) { res.redirect('/home') } else{
                    // find given user and add owner to the followers array 
                    User.findOneAndUpdate({_id:userid} , {$addToSet:{followers : req.user._id}} , (err)=>{
                        if (err) { res.status(403).send({ success: false }) }else{
                            res.status(200).send({ success: true})
                        }
                    })
                }
            })
        }
    })
})

// unfollow user request
router.put("/:id/unfollow",(req, res)=>{
      userid = req.params.id
    // find owner user and update the given user from the following array 
    User.findOneAndUpdate({_id:req.user._id} , {$pull : {following : userid}} ,{ new: true, safe: true, upsert: true }, (err)=>{
        if (err) { res.redirect('/home') } else{
            // find given user and remove owner from the followers array 
            User.findOneAndUpdate({_id:userid} , {$pull : {followers : req.user._id}},{ new: true, safe: true, upsert: true }, (err)=>{
              if (err) { res.status(403).send({ success: false })}else{
                res.status(200).send({ success: true})
              }
            })
        }
    })
})

// remove users from followers 
// unfollow user request
router.put("/:id/remove",(req, res)=>{

    userid = req.params.id
    // find owner user and update the given user from the following array 
    User.findOneAndUpdate({_id:req.user._id} , {$pull : {followers : userid}} ,{ new: true, safe: true, upsert: true }, (err)=>{
        if (err) { res.redirect('/home') } else{
            // find given user and remove owner from the followers array 
            User.findOneAndUpdate({_id:userid} , {$pull : {following : req.user._id}},{ new: true, safe: true, upsert: true }, (err)=>{
              if (err) { res.redirect('/home')}else{
                res.send('success')
              }
            })
        }
    })
})


module.exports = router