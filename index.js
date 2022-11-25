const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

//Initial Setup
app.get('/', (req, res) => {
  res.send('Pay&Buy server is running');
});
app.listen(port, () => {
  console.log(`Pay&Buy server is running on port ${port}`);
});

// Middleware for verifying user
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(401)
      .send({ acknowledged: false, message: 'unauthorized access' });
  }
  const accessToken = authHeader.split(' ')[1];

  jwt.verify(accessToken, process.env.ACCESS_TOKEN, function (error, decoded) {
    if (error) {
      return res
        .status(403)
        .send({ acknowledged: false, message: 'forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
}
// Middle ware for verifying admin
