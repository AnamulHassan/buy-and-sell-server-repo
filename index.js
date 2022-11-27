const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware for verifying user
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .send({ acknowledged: false, message: 'unauthorized access' });
  }
  const accessToken = authHeader.split(' ')[1];
  jwt.verify(
    accessToken,
    process.env.USER_ACCESS_TOKEN,
    function (error, decoded) {
      if (error) {
        return res
          .status(403)
          .send({ acknowledged: false, message: 'forbidden access' });
      }
      req.decoded = decoded;
      next();
    }
  );
}
// Middle ware for verifying admin
function verifyAdmin(req, res, next) {
  const adminEmail = req.query.email;
  const decodedEmail = req.decoded.email;
  if (adminEmail !== decodedEmail) {
    return res
      .status(403)
      .send({ acknowledged: false, message: 'forbidden access' });
  } else {
    next();
  }
}

// MongoDB Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yts1hwu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    // Data collection
    const usersCollection = client.db('payAndBuy').collection('usersData');
    const productsCollection = client
      .db('payAndBuy')
      .collection('productsData');
    const categoryCollection = client
      .db('payAndBuy')
      .collection('categoryData');
    const bookingCollection = client.db('payAndBuy').collection('bookingData');
    // Add new user
    // Json Web Token
    app.get('/jwt', async (req, res) => {
      const userEmail = req.query.email;
      const filter = { email: userEmail };
      const storedEmail = await usersCollection.findOne(filter);

      if (storedEmail) {
        const token = jwt.sign({ userEmail }, process.env.USER_ACCESS_TOKEN, {
          expiresIn: '1d',
        });
        res.send({ accessToken: token });
      } else {
        res.status(403).send({ accessToken: 'unauthorized' });
      }
    });
    // Upload User Information
    app.post('/users', async (req, res) => {
      const userData = req.body;
      const filter = { email: userData?.email };
      const oldUser = await usersCollection.findOne(filter);
      if (!oldUser) {
        const result = await usersCollection.insertOne(userData);
        res.send(result);
      }
    });
    // Check User Role
    app.get('/user', async (req, res) => {
      const userEmail = req.query.email;
      const filter = { email: userEmail };
      const result = await usersCollection.findOne(filter);
      res.send(result);
    });
    // Upload Product
    app.post('/product', verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    // Getting Product Data
    app.get('/product', verifyJWT, async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const result = await productsCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });
    // Delete Product
    app.delete('/product/:id', verifyJWT, async (req, res) => {
      const productId = req.params.id;
      const filter = { _id: ObjectId(productId) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    });
    // Update Product info
    app.put('/product/:id', verifyJWT, async (req, res) => {
      const productId = req.params.id;
      const updateInfo = req.body;
      const filter = { _id: ObjectId(productId) };
      if (updateInfo.isAdvertise) {
        const updateDoc = {
          $set: {
            isAdvertise: true,
          },
        };
        const result = await productsCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    });
    // Getting Category data
    app.get('/category', async (req, res) => {
      const number = +req.query.size;
      const query = {};
      const result = await categoryCollection
        .find(query)
        .limit(number)
        .toArray();
      const count = await categoryCollection.estimatedDocumentCount();
      res.send({ count, result });
    });
    // Getting Advertisement Data
    app.get('/advertiseProduct', async (req, res) => {
      const query = {
        isAdvertise: { $eq: true },
        isBooking: { $eq: false },
      };
      // .sort({ date: -1 })
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    // Added Booking
    app.post('/booking', verifyJWT, async (req, res) => {
      const bookingInfo = req.body;
      const productId = bookingInfo.productId;
      const productFilter = { _id: ObjectId(productId) };
      const replacement = {
        $set: {
          isBooking: true,
        },
      };
      const replacementResult = await productsCollection.updateOne(
        productFilter,
        replacement
      );
      const bookingResult = await bookingCollection.insertOne(bookingInfo);
      res.send({ replacementResult, bookingResult });
    });
  } finally {
  }
}
run().catch(error => console.log(error));

//Initial Setup
app.get('/', (req, res) => {
  res.send('Pay&Buy server is running');
});
app.listen(port, () => {
  console.log(`Pay&Buy server is running on port ${port}`);
});
