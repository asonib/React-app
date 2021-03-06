const express = require('express');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const router = express.Router();

require('../../models/Users');
const Users = mongoose.model('user');
require('../../models/Post');
const Post = mongoose.model('post');

// @route   POST api/posts/
// @desc    Tests post route
// @access  Public
router.post('/', [auth,
  check('text').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const user = await Users.findById({_id: req.user}).select('-password');
    const {
      text,
      name,
      avatar
    } = req.body;
    const new_post = {
      text: text,
      name: user.name,
      avatar: user.avatar,
    }
    new_post.user = req.user;
    const post = new Post(new_post);
    await post.save();

    res.json(post);
  } catch (error) {
    console.log('Server Error');
    res.send(error.message);
  }

});

router.get('/', auth, async(req, res) => {
  try {
    const posts = await Post.find().sort({date: -1});
    if(!posts){
      res.json({msg : 'No Posts Found'});
    }
    res.json(posts);
  } catch (err) {
    console.log('Server Error');
    res.send(err.message);
  }
});

router.get('/:post_id', auth, async(req, res) => {
  
  try {
    const post = await Post.findById({_id: req.params.post_id});
    if(!post){
      return res.json({msg : 'No Posts Found'});
    }
    res.json(post);
  } catch (err) {
    console.log('Server Error');
    if(err.kind == 'ObjectId'){
      return res.json({msg: 'No Posts Found'});
    }
    
    res.send(err.message);
  }
});
router.delete('/:post_id', auth, async (req, res) => {
  
  try {
    const post = await Post.findById({_id: req.params.post_id});
    if(!post){
      return res.status(404).json({msg: 'No post found'});
    }

    if(post.user.toString() !== req.user){
      return res.status(400).json({msg: 'Not authorized to delete'});
    }
    await post.remove();
    res.json({msg: 'post deleted'});
  } catch (err) {
    console.log('Server Error');
    res.send(err.message);
  }

});
router.put('/likes/:post_id', auth, async(req, res) => {
  try {
    const post = await Post.findById({_id: req.params.post_id});
    
    if(!post){
      return res.status(404).json({msg: 'No post found'});
    }
    if(post.likes.filter(like => like.user.toString() === req.user).length > 0){
      return res.status(400).json({msg: 'Post already liked by user'});
    }
    const new_like = {
      user: req.user
    }
    post.likes.unshift(new_like);
    await post.save();

    res.send('Post Liked!');
  } catch (err) {
    console.log('Server Error');
    res.send(err.message);
  }
});
router.delete('/likes/:id', auth, async(req, res) => {
  try {
    const post = await Post.findById({_id: req.params.id});
    
    if(!post){
      return res.status(404).json({msg: 'No post found'});
    }
    if(post.likes.filter(like => like.user.toString() === req.user).length === 0){
      return res.status(400).json({msg: 'No Post to unlike!'});
    }
    const like_index = post.likes.map(like => like.user.toString()).indexOf(req.user);
    post.likes.splice(like_index, 1);

    await post.save();
    res.json({msg: 'like removed'});
  } catch (err) {
    console.log('Server Error');
    res.send(err.message);
  }
});

router.post('/comments/:post_id', [auth,
  check('text').not().isEmpty(),
], async(req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const post = await Post.findById(req.params.post_id);
    if(!post){
      return res.status(404).json({msg: 'No Post found'});
    }
    const user = await Users.findById(req.user);

    const new_comment = {
      text: req.body.text,
      name: user.name,
      avatar: user.avatar,
      user: req.user
    }
    
    post.comments.unshift(new_comment);
    await post.save();

    res.json({msg: 'Comment Saved'});
  } catch (err) {
    console.log('Server Error');
    res.send(err.message);
  }
});

router.delete('/comments/:post_id/:comment_id',auth, async (req, res) => {
  try {
    const post = await Post.findById({_id: req.params.post_id});
    if(!post){
      return res.status(404).json({msg: 'No Post found'});
    }
    console.log(post);
    const comment = post.comments.find(comment => comment.id.toString() === req.params.comment_id);
    if(!comment){
      return res.status(404).json({msg: 'No Comment found'});
    }
    if(comment.user.toString() !== req.user){
      return res.status(404).json({msg: 'Not Authorized To Delete'});
    }
    const newLocal = req.user;
    const index = post.comments.map(comment => comment.user.toString()).indexOf(newLocal);
    post.comments.splice(index, 1);
    await post.save();
    
res.json({msg: "Comment Deleted!"});
  } catch (err) {
    console.log('Server Error');
    res.send(err.message);
  }

});

module.exports = router;