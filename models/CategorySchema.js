const mongoose = require('mongoose');


// Category Schema 
const categorySchema = new mongoose.Schema({
    title : String,
    image: String,
    imageId: String,
    posts : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post'}] 
})

// category model 
module.exports = mongoose.model('Category',categorySchema);