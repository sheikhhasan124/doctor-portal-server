const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");

require("dotenv").config();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nnml9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify jwt is a middleware that controls unexpected user ,,,it check the user is current user by jwt
function verifiJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();

    const servicesCollection = client
      .db("doctor_portal")
      .collection("services");
    const bookingCollection = client.db("doctor_portal").collection("booking");
    const userCollection = client.db("doctor_portal").collection("user");

    // service api
    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // for user page
    app.get("/user", verifiJwt, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // api for is login user admin or not
    app.get('/admin/:email',async(req,res)=>{
      const email = req.params.email;
      const user = await userCollection.findOne({email:email});
      const isAdmin = user.role === 'admin';
      res.send({admin:isAdmin})
    })  

    // api for make user admin and only admin can meke others admin
    app.put("/user/admin/:email", verifiJwt, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    });

    //registrate user email save in db ...and make jwt
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRETE,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    // warning:
    // this is not the proper way to query.
    // after learning more about mongodb . use aggregate lookup, pipeline, match, group
    app.get("/available", async (req, res) => {
      const date = req.query.date || "May 17, 2022";

      // step 1 : get all services
      const services = await servicesCollection.find().toArray();

      // step 2: get the booking of that day
      const query = { date: date };
      const booking = await bookingCollection.find(query).toArray();

      // step 3: for each service find booking for that service
      services.forEach((service) => {
        // step 4: find bookings for that service. output:[{},{},{}]
        const serviceBooking = booking.filter(
          (b) => b.treatment === service.name
        );
        // step 5: select slots for the service bookings:['','','']
        const booked = serviceBooking.map((s) => s.slot);
        // step 6: select those slots that are not an bookedSlots
        const available = service.slot.filter((s) => !booked.includes(s));
        // step 7: set available to slot to make it easier
        service.slot = available;
      });

      res.send(services);
    });
    /* 
    API naming convention
    * app.get('/booking')// get all inf from collection
    * app.get('/booking/:id) // get a specific booking
    * app.post('/booking')add a new booking
    * app.patch('/booking/:id)
    * app.put('/booking/:id') //upsert ==> update (if exist) or insert (if dose not exist) 
    * app.delete('/booking/:id)
    */
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exist = await bookingCollection.findOne(query);
      if (exist) {
        return res.send({ success: false, booking: exist });
      }
      const result = await bookingCollection.insertOne(booking);
      //  res.send(result);
      return res.send({ success: true, result });
    });

    app.get("/booking", verifiJwt, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const booking = await bookingCollection.find(query).toArray();
        res.send(booking);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Home");
});

app.listen(port, () => {
  console.log(`server are running at ${port}`);
});
