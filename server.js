const express = require('express')
const app = express()

const http = require('http').createServer(app)
const io = require('socket.io')(http)

const Redux = require('redux')
const reducer = require('./reducer')


app.use(express.static(__dirname))

app.get('/', function(req, res){
  res.render('./index.html')
})

class Game {
  static events = {
    INIT: 'INIT',
    STATE_CHANGE: 'STATE_CHANGE',
  }

  store = null

  gamespace = null

  id = null

  players = []

  constructor(socket, room, gamespace) {
    this.id = room

    this.gamespace = gamespace

    socket.once(Game.events.INIT, (event) => {
      this.store = Redux.createStore(reducer, {
        gameState: event.state,
      })

      this.store.subscribe(() => {
        console.log('New State', this.store.getState())
      })
    })
  }

  addPlayer(player) {
    this.players.push(player)

    player.on(Game.events.STATE_CHANGE, (event) => {
      this.store.dispatch(event.action)
      this.gamespace.to(this.id).emit('STATE_CHANGE', event)
    })

    if (this.store) {
      console.log('Sending initial state to ', player.id)
      player.emit(Game.events.INIT, {
        state: this.store.getState().gameState,
      })
    }
  }
}

class Player {
  socket = null

  id = null

  constructor(socket, id) {
    this.socket = socket
    this.id = id
  }

  on(...args) {
    return this.socket.on(...args)
  }

  emit(...args) {
    return this.socket.emit(...args)
  }
}

const games = {}

const gamespace = io.of('/game')

gamespace.on('connection', function(socket, options){
  const { room, player } = socket.handshake.query

  socket.join(room)

  if (!games[room]) {
    console.log('Creating Game ', room)
    games[room] = new Game(
      socket,
      socket.handshake.query.room,
      gamespace,
    )
  }

  console.log('Creating player ', player)
  console.log('Adding player to room ', room)
  games[room].addPlayer(
    new Player(socket, player)
  )
})

http.listen(3000, function(){
  console.log('listening on *:3000')
})
