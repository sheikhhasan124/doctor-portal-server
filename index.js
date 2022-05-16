const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const cors = require('cors');

require('dotenv').config();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nnml9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
  try{
    await client.connect();
    
    const servicesCollection = client.db('doctor_portal').collection('services');
    const bookingCollection = client.db('doctor_portal').collection('booking');

     // service api
    app.get('/service',async(req,res)=>{
        const query={};
        const cursor = servicesCollection.find(query);
        const services = await cursor.toArray();
        res.send(services)
    })

    /* 
    API naming convention
    * app.get('/booking')// get all inf from collection
    * app.get('/booking/:id) // get a specific booking
    * app.post('/booking')add a new booking
    * app.patch('/booking/:id)
    * app.delete('/booking/:id)
    */
   app.post('/booking',async(req,res)=>{
     const booking = req.body;
     const result = await bookingCollection.insertOne(booking)
     const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient}
     res.send(result);
   })
  }
  finally{
    // await client.close();  
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello Home')
})

app.listen(port, () => {
  console.log(`server are running at ${port}`)
})