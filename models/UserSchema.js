var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

//userSchema
const userSchema = new mongoose.Schema({

    username: { type: String, unique: true },
    savedpost: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    name: { type: String },
    bio: { type: String },
    email: { type: String},
    password: { type: String },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post'  }],

    image: {
        type: String,
        default: "//placehold.it/100"
    },
    imageId: {
        type: String,
        default: "//placehold.it/100"

    },
    categories_followed :[{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    followers : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    following : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);