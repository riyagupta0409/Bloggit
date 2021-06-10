var mongoose = require("mongoose");

// comment schema
//comment schema
var Comments = new mongoose.Schema({
    content: String,
    commentedby: String
});

//post schema
const postSchema = new mongoose.Schema({
    date: String,
    title: String,
    content: String,
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    image: String,
    imageId: String,
    comments: [Comments],
    likes: [String],
    keywords:[{type:String}]
});

module.exports = mongoose.model('Post', postSchema);