const rand = (length) => {
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const result = []

  for (let i = 0; i < length; i++) {
    result.push(
      str[Math.floor(Math.random() * str.length)]
    )
  }

  return result.join('')
}


const createMiddleware = ({
  url,
  room,
  player,
}) => {
  const socket = io(url + '/game', {
    query: {
      room,
      player,
    },
  })

  return (store) => {
    console.log('INITIALIZING')
    socket.emit('INIT', {
      id: player,
      state: store.getState().gameState,
    })

    return (next) => {
      console.log('SUBSCRIBING TO INIT')
      socket.on('INIT', (event) => {
        console.log(event)
        next({
          type: 'REHYDRATE',
          payload: {
            gameState: event.state,
          }
        })
      })

      socket.on('STATE_CHANGE', (event) => {
        if (event.id === player) {
          console.log('Ack ', event.action.type)
        } else {
          next(event.action)
        }
      })

      return action => {
        console.log(action)
        socket.emit('STATE_CHANGE', {
          id: player,
          action,
        })
        const result = next(action)

        return result
      }
    }
  }
}


const getRoom = () => {
  const u = new URL(window.location)

  return u.searchParams.get('game') || rand(6)
}


const initialState = {
  room: getRoom(),
  player: rand(6),
  gameState: {
    squares: [{
      label: rand(4),
      selected: false,
    }, {
      label: rand(4),
      selected: false,
    }, {
      label: rand(4),
      selected: false,
    }],
  }
}


const store = Redux.createStore(
  window.reducer,
  initialState,
  Redux.applyMiddleware(
    createMiddleware({
      url: 'http://localhost:3000',
      room: initialState.room,
      player: initialState.player,
    }),
  ),
)


const Grid = ({
  squares,
  onSquareClick,
}) => {
  return squares.map((square) => {
    return (
      <GridSquare key={square.label} {...square} onSquareClick={onSquareClick} />
    )
  })
}


const GridSquare = ({
  width = 50,
  height = 50,
  margin = 5,
  selected = false,
  selectedColor = 'blue',
  unselectedColor = 'green',
  color = 'white',
  label,
  onSquareClick,
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: selected ? selectedColor : unselectedColor,
        margin,
        color,
      }}
      onClick={() => onSquareClick(label)}
    >
      { label }
    </div>
  )
}


const App = ({
  state,
  dispatch,
}) => {
  return (
    <div>
      <h1>Player: { state.player }</h1>

      <Grid squares={state.gameState.squares} onSquareClick={(label) => {
        dispatch({
          type: 'TOGGLE_SQUARE',
          payload: {
            label,
          },
        })
      }}/>
    </div>
  )
}


const render = (state, dispatch) => {
  ReactDOM.render(
    <App state={state} dispatch={dispatch} />,
    document.getElementById('main'),
  )
}


store.subscribe(() => {
  render(
    store.getState(),
    store.dispatch,
  )
})


render(
  store.getState(),
  store.dispatch,
)
