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

    app.get('/available', async(req,res)=>{
      const date = req.query.date || "May 17, 2022"

      // step 1 : get all services
      const services = await servicesCollection.find().toArray();

      // step 2: get the booking of that day
      const query = {date:date}
      const booking = await bookingCollection.find(query).toArray()

      // step 3: for each service find booking for that service
      services.forEach(service=>{
        const serviceBooking = booking.filter(b=>b.treatment === service.name)
         const booked = serviceBooking.map(s=> s.slot)
         const available = service.slot.filter(s=> !booked.includes(s))
         service.available = available;
      })

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
     const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient}
     const exist = await bookingCollection.findOne(query)
     if(exist){
       return res.send({success: false, booking:exist})
     }
     const result = await bookingCollection.insertOne(booking)
    //  res.send(result);
    return res.send({success:true, result})
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