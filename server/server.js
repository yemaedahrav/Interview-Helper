const mongoose = require("mongoose")
const Document = require("./Document")
const URI = "mongodb+srv://arihant:deadpool2@cluster0.o9ynv.mongodb.net/Cluster0?retryWrites=true&w=majority"
mongoose.connect(URI,
    err => {
        if(err) throw err;
        console.log('connected to MongoDB')
    });

const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

const defaultValue = ""
const users = {}
const socketToRoom = {}

io.on("connection", socket => {
  socket.on("get-document", async documentId => {
    const document = await findOrCreateDocument(documentId)
    socket.join(documentId)
    socket.emit("load-document", document.data)

    socket.on("send-changes", delta => {
      socket.broadcast.to(documentId).emit("receive-changes", delta)
    })

    socket.on("save-document", async data => {
      await Document.findByIdAndUpdate(documentId, { data })
    })
  })

  socket.on("join room",documentId => {
    if (users[documentId]) {
      const length = users[documentId].length
      if(length === 4){
        socket.emit("room full")
        return
      }
      users[documentId].push(socket.id)
    }
    else{
      users[documentId] = [socket.id]
    }
    socketToRoom[socket.id] = documentId
    const usersInThisRoom = users[documentId].filter(id => id !== socket.id)
    socket.emit("all users",usersInThisRoom)
  })

  socket.on("sending signal",payload => {
    io.to(payload.userToSignal).emit('user joined',{ signal:payload.signal,callerID:payload.callerID })
  })

  socket.on("returning signal",payload => {
    io.to(payload.callerID).emit('receiving returned signal',{ signal:payload.signal,id:socket.id })
  })

  socket.on('disconnect',() => {
    const documentId = socketToRoom[socket.id]
    let room = users[documentId]
    if(room){
      room = room.filter(id => id !==socket.id)
      users[documentId] = room
    }
  })
})

async function findOrCreateDocument(id) {
  if (id == null) return

  const document = await Document.findById(id)
  if (document) return document
  return await Document.create({ _id: id, data: defaultValue })
}
