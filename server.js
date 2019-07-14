const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')
const moment = require('moment');

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {useNewUrlParser: true})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: String
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now }
});

const User = new mongoose.model('User', userSchema);
const Exercise = new mongoose.model('Exercise', exerciseSchema);

app.post('/api/exercise/new-user', (req, res, next) => {
  const { username } = req.body;
  User.find({ username }, (err, data) => {
    if(data.length == 0) {
      const user = new User({ username });
      user.save().then((data) => {
        console.log('save successfully', data);
        res.json({username: data.username, _id: data._id });
      });
    } else {
      res.send('username already taken');
    }
  });
});

app.get('/api/exercise/users', (req,res, next) => {
  User.find({}, (err, data) => {
    console.log('data', data);
    let users = data.map((item) => { 
      return { _id: item._id, username: item.username };
    });
    console.log('users', users);
    res.json(users);
  });
});

app.post('/api/exercise/add', (req, res, next) => {
  
  const { userId, description, duration, date } = req.body;
  User.findById(userId, (err, data) => {
    if(data) {
      let exercise;
      if(date) {
        exercise = new Exercise({userId, description, duration, date});
      } else {
        exercise = new Exercise({userId, description, duration});
      }
      console.log('exercise', exercise);
      
      exercise.save().then((exer) => {
        const response = { 
          username: data.username,
          _id: data._id,
          description: exer.description,
          duration: exer.duration,
          date: moment(exer.date).format('ddd MMM DD YYYY')
        }
        console.log('response', response);
        res.json(response);
      });
    }
  });
});

app.get('/api/exercise/log', (req, res, next) => {
  const { userId, from, to, limit } = req.query;
  if(!userId) {
    res.send('unknown userId');
    return;
  }
  let user;  
  User.findById({_id: userId}, { _id: 0}, (err, user) => {
    console.log('user', user);
    let opt = {lean: true};
    
    if(limit) {
      opt.limit = parseInt(limit);
    }
    
    let params = {
      userId
    };
    
    let dateObj = {};
    if(from) {
      dateObj['$gte'] = from
      params.date = dateObj;
    }
    
    if(to) {
      dateObj['$lte'] = to
      params.date = dateObj;
    }
    
    console.log('params', params);
    
    Exercise.find(params, 'description duration date', opt, (err, data) => {
      data = data.map((item) => {
        if(item.date) {
          const formattedDate = moment(item.date).format('ddd MMM DD YYYY');
          item.date = formattedDate;
          console.log('item date', item.date);
        }
        return item;
      });
      const response = {
        _id: userId,
        username: user.username,
        count: data.length,
        log: data
      }
      res.json(response);
    });
  });
});

function findUser(id) {
  return User.findById(userId);
}

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
