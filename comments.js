// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Comments
const commentsByPostId = {};

// Routes
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const postId = req.params.id;
  const { content } = req.body;

  // Get comments for post
  const comments = commentsByPostId[postId] || [];

  // Add new comment
  comments.push({
    id: commentId,
    content,
    status: 'pending',
  });

  // Set comments
  commentsByPostId[postId] = comments;

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      postId,
      content,
      status: 'pending',
    },
  });

  // Send response
  res.status(201).send(comments);
});

// Event bus
app.post('/events', async (req, res) => {
  console.log('Received event', req.body.type);

  const { type, data } = req.body;

  // Comment moderation
  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data;

    // Get comments for post
    const comments = commentsByPostId[postId];

    // Find comment
    const comment = comments.find((comment) => {
      return comment.id === id;
    });

    // Update status
    comment.status = status;

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        postId,
        status,
        content,
      },
    });
  }

  // Send response
  res.send({});
});

// Listen
app.listen(4001, () => {
  console.log('Listening on 4001');