const Actions = {
  STATE_CHANGE: 'STATE_CHANGE',
  RMP_JOIN_ROOM: 'RMP_JOIN_ROOM',
  RMP_HYDRATE: 'RMP_HYDRATE',
  REHYDRATE: 'REHYDRATE',
}

const createMiddleware = ({
  url,
  namespace = '/',
  io,
  getInitialState = state => state,
  syncAction = () => true,
}) => {
  const { href } = new URL(namespace, url)

  const socket = io(href)

  socket._rmp = {
    clientId: null,
  }

  return (store) => {

    return (next) => {
      socket.on(Actions.STATE_CHANGE, (event) => {
        if (event.clientId === socket._rmp.clientId) {
          console.log('ACK ', event.action.type)
        } else {
          next(event.action)
        }
      })

      return (action) => {
        /*
         * Send RMP_JOIN_ROOM at the start of the session
         * to join the room. If not room exists, one will
         * be created.
         *
         * clientId:  ID to uniquely identify this client. All messages
         *            will be associated with this ID
         * room:      ID of the room to join
         */
        if (action.type === Actions.RMP_JOIN_ROOM) {
          socket._rmp.clientId = action.payload.clientId
          console.log('JOINING ROOM')
          socket.emit(Actions.RMP_JOIN_ROOM, {
            clientId: action.payload.clientId,
            room: action.payload.room,
          }, (event) => {
            if (event.type === Actions.REHYDRATE) {
              /*
               * If we aren't the first one in then we'll
               * receive an acknowledgement with the initial
               * state
               */
              console.log('REHYDRATING')
              next({
                type: Actions.REHYDRATE,
                payload: {
                  state: event.payload.state,
                }
              })
            } else {
              console.log('SENDING INITIAL STATE')
              /*
               * In this case we are the first one in so we
               * are going to go ahead and send the initial state.
               *
               * Send RMP_HYDRATE after joining the room to
               * hydrate the server with this state. This will
               * re-write the entire state on the server and all
               * other clients.
               *
               * clientId:  ID to uniquely identify this client. All messages
               *            will be associated with this ID
               * state:     The state to hydrate with
               */
              socket.emit(Actions.RMP_HYDRATE, {
                clientId: socket._rmp.clientId,
                state: getInitialState(store.getState()),
              })
            }
          })
        /*
         * All other actions will be sent along as-is, for
         * the server and other clients to respond to.
         */
        } else {
          if (syncAction(action)) {
            console.log('STATE CHANGE CHANGE')
            socket.emit(Actions.STATE_CHANGE, {
              clientId: socket._rmp.clientId,
              action,
            })
          }

        }

        return next(action)
      }
    }
  }
}

export default createMiddleware
