import { v2 as cloudinary } from "cloudinary";

import Post from "../models/post.model.js";
import User from "../models/user.model.js";

import Notification from "../models/notification.model.js";

export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;

    const userId = req.user._id.toString();
    if (!userId) return res.status(404).json({ message: "User not found" });
    console.log(text, img);
    if (!text && !img) {
      return res.status(400).json({ error: "Post must have text or image" });
    }

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = await Post({
      user: userId,
      text,
      img,
    });

    await newPost.save();

    res.status(200).json(newPost);
  } catch (error) {
    console.log("Error in createPost controller: ", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId, "likes");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const indexOfLike = post.likes.indexOf(userId);
    if (indexOfLike >= 0) {
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      res.status(200).json({ message: "Post unliked successfully" });
    } else {
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await Post.findByIdAndUpdate(postId, { likes: post.likes });

      const notification = new Notification({
        from: userId,
        to: post._id,
        type: "like",
      });

      await notification.save();

      res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (error) {
    console.log("Error in the likeUnlikePost controller", error.message);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = { user: userId, text };

    post.comments.push(comment);

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("Error in the commentOnPost controller");
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select("user");
    const userId = req?.user?._id.toString();
    console.log(post, userId);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post?.user.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to modify this post." });
    }

    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Post.findByIdAndDelete(post._id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.log("Error in the deletePost controller");
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({ path: "user", select: "-password" })
      .populate({ path: "comments.user", select: "-password" });

    if (posts.length === 0) return res.status(200).json([]);

    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in the getAllPosts controller", error.message);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const getLikedPosts = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const user = await User.findById(userId).select("likedPosts");

    if (!user) return res.status(404).json({ error: "User not found" });

    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json({ likedPosts });
  } catch (error) {
    console.log("Error in the getLikedPosts controller", error.message);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("following");
    if (!user) return res.status(404).json({ error: "Error not found" });

    const feedPosts = await Post.find({ user: { $in: user.following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(feedPosts);
  } catch (error) {
    console.log("Error in the getFollowingPosts controller", error.message);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });
    if (!user) return res.status(200).json({ error: "User not found" });

    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({ path: "user", select: "-password" })
      .populate({ path: "comments.user", select: "-password" });

    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in the getUserPosts controller", error.message);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};
