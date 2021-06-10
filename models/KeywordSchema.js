const mongoose = require('mongoose');
 
// keyword schema object
keywordSchema = new mongoose.Schema({
    name : {type:String , index:true},
    array_of_posts : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post'}]
})

module.exports =  mongoose.model('Keyword', keywordSchema);