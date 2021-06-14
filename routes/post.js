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

// is logged in middleware
const isLoggedIn =(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.flash('error','You are required to log in !')
        return res.redirect('/')
    }
    next();
}

// GET -- redirection to post compose page
router.get('/compose',isLoggedIn, function (req, res) {
    // send categories to show in selection option 
    Category.find({},(err, category) =>{
        if (err) { res.redirect('/home')}else {
            res.render('compose',{categories:category})
        }
    })
});

// POST -- create a new blog and save in database 
router.post('/compose',isLoggedIn, upload.single('image'),async function (req, res) {
    let date = new Date();
    let postDate = date.toLocaleDateString('en-US');
    // separating keywords 
    let userkeywords = req.body.userkeywords.toLowerCase().split(',');
    // uploading image to cloudinary server
    cloudinary.uploader.upload(req.file.path, async function (result) {
        // post data
        const post = new Post({
            date: postDate,
            title: req.body.postTitle,
            content: req.body.postBody,
            category: req.body.postCategory,
            description: req.body.postdes,
            postedBy: req.user,
            image: result.secure_url,
            imageId: result.public_id,
            keywords : userkeywords
        });
        // saving post to database 
        await post.save(async function (err, post) {
            if (!err) {
                // adding the post to selected category
                await Category.findOneAndUpdate({_id:req.body.postCategory},{ $addToSet: { posts: post }})
                // adding the post to user's posts 
                User.findOneAndUpdate({ _id: req.user._id }, { $push: { posts: post } }, function (err) {
                    if (err) { res.redirect('/home'); } else
                    req.flash('success', 'Your blog has been successfully posted')
                    res.redirect(`/post/${post._id}`);
                    // add the keywords to the keyword database
                    add_words_in_keyword_database(req.body.userkeywords,post)
                })
            } else { res.redirect('/home') }
        });
    });
});

// add keywords in the database for search function
async function add_words_in_keyword_database(keywordslist ,post) {
    // trimming user keywords and saving in array 
    var userKeyword = keywordslist.toLowerCase().split(',');
    // addding keywords in the db
    for(var i = 0; i <userKeyword.length ; i++) {
        var key_ = userKeyword[i].trim();
        // check if the keyword already exists
        var doc = await Keyword.find({name : key_})
        if(doc.length ===0) {
            // if keyword does not existed make a new document  
            new_keyword_document = new Keyword({
                name : userKeyword[i]
            })
            // saving document
           await new_keyword_document.save();
        }
        // add the post id to the given keyword document
        await Keyword.findOneAndUpdate({name : userKeyword[i].trim()} , {$addToSet : {array_of_posts : post}})
    }
}

// GET -- open the selected post
router.get('/:postId', function (req, res) {
        Post.findById((req.params.postId))
        // populate the user who has posted the post 
        .populate('postedBy')
        // executing the fxn
        .exec(function (err,posts) {
            if(err){ res.redirect('/home')}
            else{
                User.findById(req.user._id, function (err,user) {
                    res.render("post", { post: posts, currentuser: user.username ,savedposts : user.savedpost})
                })
            }
        })
});

// GET -- get that post to edit 
router.get('/:postId/edit',isLoggedIn, function (req, res) {
    // search for the given post
    Post.findById((req.params.postId), (err, foundPost) => {
        if (err) { res.redirect('/home') } else
            // rendering post edit page
            res.render('postedit', { post: foundPost });
    })
})

//PUT - edit post route
router.put('/:id/edit',isLoggedIn, upload.single('image'), (req, res) => {
    // search for the given post
    Post.findById(req.params.id, async function (err, post) {
        if (err) {
            res.redirect("/home");
        } else {
            if (req.file) {
                try {
                    // if image has been changed delete existing image
                    await cloudinary.uploader.destroy(post.imageId);
                    // upload new image
                    var result = await cloudinary.uploader.upload(req.file.path);
                    // change image and imageId
                    post.image = result.secure_url;
                    post.imageId = result.public_id;
                } catch (err) {
                    return res.redirect('/home');
                }
            }
            // upload other information
            post.title = req.body.title;
            post.content = req.body.content,
            post.description = req.body.description;
            // save post
            await post.save();
            req.flash('success','Your blog has been been successfully updated')
            res.redirect(`/post/${post._id}`);
        }
    });
})

// POST DELETE -- post delete request 
router.delete('/:postId/delete',isLoggedIn, function (req, res) {
    // search for the given post
    Post.findById(req.params.postId, async function (err, post) {
        if (err) {
            res.redirect("/home");
        }
        try {
            // destroy image id from cloudinary
            await cloudinary.uploader.destroy(post.imageId);
            // remove post
            post.remove((err) => {
                if (err) { res.redirect('/home') } else {
                    // update user by whom the post has been uploaded
                    User.updateOne({ _id: req.user._id }, { $pull: { posts: req.params.postId } }, function (err) {
                        if (err) { res.redirect('/home') } else
                            req.flash('success','Your blog has been been successfully deleted')
                            res.redirect("/home");
                    })
                }
            })
        } catch (err) {
            if (err) {
                return res.redirect('/home');
            }
        }
    })
})

//POST COMMENT -- add comment on the post
router.post('/:postId/comment/add',isLoggedIn,  (req, res) => {
    // content of the comment
    var content = req.body.content;
    var user = req.user.username;
    // add the comment to comment array of given post 
    Post.findByIdAndUpdate(req.params.postId, { $push: { comments: { content: content, commentedby: user } } }, (err) => {
        if (err) { res.redirect('/home') } else
            // send the post 
            Post.findById(req.params.postId, (err, post) => {
                res.send(post.comments[post.comments.length-1])
            })
    })
});

//DELETE COMMENT -- deleting comment
router.delete('/:postId/:commentid/comment/delete',isLoggedIn, (req, res) => {
    // fetching post and comment ids 
    const postId = req.params.postId;
    const commentid = req.params.commentid;
    // pulling the given comment from the comment array
    Post.updateOne({ _id: postId }, { $pull: { "comments": { _id: commentid } } }, { safe: true, multi: true }, (err) => {
        if (err) { res.redirect('/home'); } 
           res.send('success')          
    })
})

// PUT LIKE -- Add like by user on the post
router.put('/like' ,isLoggedIn, async (req, res) => {
    // find the post add username to the likes array 
    await Post.findByIdAndUpdate(req.body.id, { $addToSet: { likes: req.user.username } }, (err) => {
        if (err) { res.redirect('/home'); } else
            res.end('success');
    })
})
 
// PUT UNLIKE -- remove like
router.put('/unlike' ,isLoggedIn, async (req, res) => {
    // find the post remove username to the likes array 
    await Post.findByIdAndUpdate(req.body.id, { $pull: { likes: req.user.username } }, (err) => {
        if (err) { res.redirect('/home'); } else
            res.send('success');
    })
})

//bookmark the post
router.put("/:id/save",isLoggedIn, function (req, res) {
    const id = req.params.id;
    console.log(id)
    // find the post by id in params
    Post.findById((id),async (err, post) => {
        if (err) { res.redirect('/home') } else
            // update user and add the post to savedpost array 
            await User.findOneAndUpdate({ _id: req.user._id }, { $addToSet: { savedpost: post } }, {safe: true} )
            User.findById(req.user._id , (err,user) => {
            if(err) {console.log(err)
                res.sendStatus(404)}
            else{res.sendStatus(200)
                res.end();}              
            })
    })
})

//unsave bookmarked post
router.put("/:id/unsave",isLoggedIn, async (req, res) => {
    // update user and remove the post from savedpost array
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedpost: req.params.id } }, {  safe: true})
    User.findById(req.user._id , (err,user) => {
        res.sendStatus(200)
     })
})

// export the router
module.exports = router;