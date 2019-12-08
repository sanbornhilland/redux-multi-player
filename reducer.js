const reducer = (state, action) => {
  console.log(action)

  switch (action.type) {
    case 'TOGGLE_SQUARE':
      return {
        ...state,
        gameState: {
          squares: state.gameState.squares.map((square) => {
            if (action.payload.label === square.label) {
              return {
                ...square,
                selected: !square.selected,
              }
            }

            return square
          }),
        },
      }
    case 'REHYDRATE':
      return {
        ...state,
        gameState: action.payload.gameState,
      }

    default:
      return state
  }
}

try {
  module.exports = reducer
} catch (error) {
  window.reducer = reducer
}

