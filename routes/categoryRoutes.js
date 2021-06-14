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



// go to add category page
router.get('/add', function (req, res){
    res.render('add_category')
})

// post for adding category in the database
router.post('/add', upload.single('image'),function (req, res){
    // upload image of the category 
    cloudinary.uploader.upload(req.file.path, async function (result) {
        const category = new Category({
            // other data 
            title : req.body.CategoryTitle,
            image: result.secure_url,
            imageId: result.public_id,
        });
        // save category 
        await category.save(function (err, category) {
            if (err) { res.redirect('/')}else{
                res.redirect('/home')
            }
        })
    });

})

// follow category request
router.put("/:id/follow", (req, res) => {
    id = req.params.id
    // find category
    Category.findById(id , (err , category) => {
        if (err){res.redirect('/')}else{
            // add category in user's categories array 
            User.findOneAndUpdate({_id:req.user._id} , {$addToSet: { categories_followed : category}},function(err){
                if (err) { res.status(403).send({ success: false })
                } else{
                    res.status(200).send({ success: true})
                }
            })
        }
    })
})

// unfollow category request 
router.put("/:id/unfollow",(req, res)=>{
    id = req.params.id
    // remove category from user's categories array'
    User.findOneAndUpdate({_id:req.user._id} , {$pull : {categories_followed : id}} , (err)=>{
        if (err) { res.status(403).send({ success: false }) } else{
            res.status(200).send({ success: true})
        }
    })
})

// show the categories page 
router.get("/:category", function (req, res) {
    if (req.isAuthenticated()) {
        const requestedCategory = req.params.category;
        // find the category with required name
        Category.findOne({title: requestedCategory})
        // populate all the posts and the owners of the post 
        .populate(
        {path:'posts',
        populate:{path:'postedBy'}})
        .then(category => {
            // populate saved posts 
           User.findById(req.user._id)
           .populate('savedpost')
           // rendering 
           .then( user => {
            res.render("category", {
                posts: category.posts,
                category: category,
                user: req.user,
                savedposts:user.savedpost
            })
        }
           )     
        })
    } else {
        res.redirect("/");
    }
})

// after suggesting users page on next click
// redirect to suggested  categories page 
router.get('/suggested/all',(req, res) => {
    // showing all categories 
    Category.find({},(err, category) => {
        if (err) {
            res.redirect('/home')
        }else{
            res.render('all_categories',{owner:req.user,categories:category})
        }
    })
})

// export router
module.exports = router