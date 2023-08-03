const express = require('express')
const mongoose = require('mongoose')
const BlogPostModel = require('../models/blogPostModel');
const { postBodyParams, validatePostBody } = require('../Validators/blogPostValidator');
const authorModel = require('../models/authorModel');
const commentsModel = require('../models/commentsModel');

const multer = require('multer')
const cloudinary = require("cloudinary").v2
const {CloudinaryStorage} = require("multer-storage-cloudinary")
const crypto = require('crypto')

const router = express.Router();

const internalStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${crypto.randomUUID()}`;
        const fileExt = file.originalname.split('.').pop();
        cb(null, `${file.originalname}-${uniqueSuffix}.${fileExt}`)
    }
});

const uploads = multer({ storage: internalStorage});


/* router.post('/blogPosts/internalUpload', uploads.single('cover'), async(req, res) => {
    try {
        res.status(200).send({ img: req.file.path })
    } catch (error) {
        console.error(500).send({
            statusCode: 500,
            message: 'Upload not completed!!'
        })
    }
}) */


router.get('/blogPosts/title', async (req, res) => {
    const { postTitle } = req.query;

    try {
        const postByTitle = await BlogPostModel.find({
            title: {
                $regex: '.*' + postTitle + '.*',
                $options: 'i'
            }
        })

        if (!postByTitle || postByTitle.length <= 0) {
            return res.status(404).send({
                statusCode: 404,
                message: `Post with title ${postTitle} doesen't exist!`
            })
        }

        res.status(200).send({
            statusCode: 200,
            postByTitle,
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: 'Internal server Error',
            error,
        })
    }
})

//! GET
router.get('/blogPosts', async (req, res) => {
    try {
        const blogPosts = await BlogPostModel.find()
            .populate("author", "name surname avatar")
            .populate("comments", "title content rate")

        res.status(200).send({
            statusCode: 200,
            blogPosts: blogPosts
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: 'Internal server Error',
            error,
        })
    }

})

//!POST
router.post('/blogPosts/internalUpload', uploads.single('cover'), async (req, res) => {
    const user = await authorModel.findById(req.body.author)
    console.log(req.file)
    const path = req.file.path.replaceAll("\\", '/')
    const newPost = new BlogPostModel({
        category: req.body.category,
        title: req.body.title,
        cover: `http://localhost:6060/${path}`,
        readTime: {
            value: req.body.readTimeValue,
            unit: req.body.readTimeUnit
        },
        author: user,
        content: req.body.content
    })

    try {
        const blogPost = await newPost.save()
        await authorModel.updateOne({_id: user}, {$push: {posts: newPost}})

        res.status(201).send({
            img: req.file.path,
            statusCode: 201,
            message: 'Post saved successfully',
            payload: blogPost
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: "Internal server error",
            error,
        })
    }
})

//!PATCH
router.patch('/blogPosts/:id', async (req, res) => {
    const { id } = req.params;

    const blogPostExists = await BlogPostModel.findById(id);

    if (!blogPostExists) {
        return res.status(404).send({
            statusCode: 404,
            message: `Post with id ${id} non trovato`
        })
    }

    try {
        const dataToUpdate = req.body;
        const options = { new: true };

        const patchRes = await BlogPostModel.findByIdAndUpdate(id, dataToUpdate, options);

        res.status(200).send({
            statusCode: 200,
            message: "Post modified successfully",
            patchRes,
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: "Internal server error",
            error,
        })
    }
})

//!DELETE
router.delete('/blogPosts/:id', async (req, res) => {
    const { id } = req.params;
    const blogPostExists = await BlogPostModel.findById(id);
    const user = await authorModel.findById(blogPostExists.author)


    if (!blogPostExists) {
        return res.status(404).send({
            statusCode: 404,
            message: `Post with id ${id} not found`
        })
    }

    try {
        const postToDelete = await BlogPostModel.findByIdAndDelete(id)
        await user.updateOne({$pull: {posts: id}})

        res.status(200).send({
            statusCode: 200,
            message: 'Post deleted successuffly',
            postToDelete
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: "Internal server error",
            error,
        })
    }
})

//!FIND BY ID

router.get('/blogPosts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const blogPostsById = await BlogPostModel.findById(id)
        .populate("author", "name surname avatar")
        .populate("comments")

        res.status(200).send({
            statusCode: 200,
            blogPostsById
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: 'Internal server Error',
            error,
        })
    }

})


//? ROTTE DEI COMMENTI

//! PATCH COMMENT BY ID FROM POST ID
router.patch('/blogPosts/:id/patchComment/:commentId', async(req, res) => {
    const { id, commentId } = req.params;

    /* const blogPostExists = await BlogPostModel.findById(id); */
    const dataToUpdate = req.body;
    const options = { new: true };

    try {
        const patchRes = await commentsModel.findByIdAndUpdate(commentId, dataToUpdate, options)

        res.status(200).send({
            statusCode: 200,
            message: "Comment modified successfully",
            patchRes,
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: "Internal server error",
            error,
        })
    }

})

//!GET COMMENTS FROM ID POST
router.get('/blogPosts/:id/comments', async (req, res) => {
    const { id } = req.params;

    try {
        const blogPostsById = await BlogPostModel.findById(id)
        .populate({
            path: 'comments',
            populate: {
                path: 'author'
            }
        })
        const blogComments = blogPostsById.comments;
        

        res.status(200).send({
            statusCode: 200,
            blogComments
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: 'Internal server Error',
            error,
        })
    }

})

//! GET COMMENT BY ID FROM POST ID
router.get('/blogPosts/:id/comments/:commentId', async (req, res) => {
    const { id, commentId } = req.params;

    try {
        const blogPostsById = await BlogPostModel.findById(id)
        const commentById = await commentsModel.findById(commentId)
        .populate("author");

        res.status(200).send({
            statusCode: 200,
            commentById
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: 'Internal server Error',
            error,
        })
    }

})


//!POST COMMENT BY POST ID
router.post('/blogPosts/:id/newComment', async (req, res) => {
    const { id } = req.params;
    const post = await BlogPostModel.findById(id)
    const author = await authorModel.findOne({_id: req.body.author})
    
    const newComment = new commentsModel({
        author: author._id,
        title: req.body.title,
        content: req.body.content,
        rate: req.body.rate,
    })
    try {
        const comment = await newComment.save();
        await post.updateOne({$push: {comments: newComment}})

        res.status(201).send({
            statusCode: 201,
            message: 'Comment saved successfully',
            payload: comment,
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: 'Internal server Error',
            error,
        })
    }
})

//! DELETE COMMENT BY ID FROM POST BY ID

router.delete('/blogPosts/:id/deleteComment/:commentId', async(req, res) => {
    const { id, commentId } = req.params

    try {
        const blogPostsById = await BlogPostModel.findById(id)
        const commentById = await commentsModel.findByIdAndDelete(commentId)
        await blogPostsById.updateOne({$pull: {comments: commentId}})

        res.status(200).send({
            statusCode: 200,
            message: 'Comment deleted successuffly',
            commentById
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message: 'Internal server Error',
            error,
        })
    }
})

module.exports = router;