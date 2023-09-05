const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

// Handle database connection events
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exerciseSchema],
  count: Number
});

// Create a model based on the schema
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Excersise',exerciseSchema);

// Use body-parser middleware for parsing URL-encoded form data
app.use(bodyParser.urlencoded({ extended: false }));


app.post('/api/users', (req,res) => {
  const name = req.body['username'];
  const user = new User({
    username: name ,
    count: 0
  })
  user.save()
  .then(savedUser => {
    console.log('User saved successfully:', savedUser);
    res.send({
      username: name,
      _id: savedUser._id
    });
  })
  .catch(err => {
    console.error('Error saving user:', err);
  });
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({},{log:0});
    res.json(users);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).send('Error retrieving users');
  }
})

app.post('/api/users/:_id/exercises', async (req,res) => {
  const userId = req.params._id;
  const date = req.body['date'] ? new Date(req.body['date']) : new Date() ;
  const exercise = new Exercise({
    description: req.body['description'],
    duration: req.body['duration'],
    date: date.toDateString()
  })
  console.log("Exercise = " + exercise);
          const user = await User.findById(userId).exec();
    

          if (!user) {
            return;
          }
          user.log.push(exercise);
         user.count += 1;
          await user.save();

    res.send({
      _id: userId,
      username: user.username,
      date: exercise.date,
      duration: exercise.duration,
      description: exercise.description
    })
  })

  app.get('/api/users/:_id/logs', async (req,res) => {
    const {from, to, limit} = req.query;
    const userId = req.params._id;
      const user = await User.findById(userId).select('_id username count log.description log.duration log.date').exec();
      
      let responseLogs = [];
      let index=0;
      const fromDate = new Date(from);
      const toDate = new Date(to);
      while(limit && index<user['log'].length && responseLogs.length<limit) {
        const logDate = new Date(user['log'][index].date);
        if(from && logDate >= fromDate ) {
          if(to && logDate<= toDate) {
            responseLogs.push(user['log'][index]);
          } else if (!to ) {
            responseLogs.push(user['log'][index]);
          }
        } else if(!from) {
          if(to && logDate<= toDate) {
            responseLogs.push(user['log'][index]);
          } else if (!to ) {
            responseLogs.push(user['log'][index]);
          }
        }
        index++;
      }
      if(limit) {
      user['log'] = responseLogs;
      }
      res.send(user);
    })


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
