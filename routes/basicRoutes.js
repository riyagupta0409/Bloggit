const express = require('express'); 
const router = express.Router();

// importing models
var Category = require('../models/CategorySchema');
var Post = require('../models/PostSchema');
var User = require('../models/UserSchema');
var Keyword = require('../models/KeywordSchema');

// is logged in middleware
const isLoggedIn =(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.flash('error','You are required to log in !')
        return res.redirect('/')
    }
    next();
}


// main home page
router.get('/home',isLoggedIn ,function (req, res) {
        // render all the posts -- populate postedBy and category of each post 
        Post.find({}).populate({ path: 'postedBy' }).populate({ path: 'category'})
            .then(posts => {
                // find the owner user and populate saved posts 
                User.findOne({ _id: req.user._id }).populate('savedpost')
                    .then(user => {
                        // find all the categories 
                        Category.find({})
                        .then(categories => {
                            // rendering 
                        res.render('home', { posts: posts, name: req.user.name, uimage: req.user.image, 
                            username: req.user.username, savedposts: user.savedpost,user:req.user ,categories:categories});
                        })
                    })
            })
})

// open the search tab 
router.get('/search',isLoggedIn , function(req, res){
    // render search page 
        res.render('Search_option')
})

// write query for search word
router.get('/search/query',isLoggedIn ,async function(req, res){
    // get the search query 
    search_keys = req.query.search.toLowerCase().trim(); 
    // look for the query in keyword names 
    doc = await Keyword.findOne({name:search_keys} ).populate('array_of_posts').limit(10)
    if(doc){
    // if found send the array of that keyword 
    res.send(doc.array_of_posts)} else{
        // send empty array 
        res.send([])
    }
})

// show bookmarks
router.get("/bookmarks",isLoggedIn, (req, res) => {
    // find user -- populate saved posts 
    User.findById(req.user._id)
        .populate({path:'savedpost',
        // populate posted by of each post 
        populate:{path:'postedBy'}})
        .then((user) => {
                res.render('bookmark', { savedpost: user.savedpost });
        })
});

module.exports = router;