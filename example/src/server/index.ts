import { rootStore } from "co-share"
import { connectionMiddleware } from "co-share-socketio/server"
import { Server } from "socket.io"
import { CounterStore } from "../counter-store"

const io = new Server({
    cors: {
        methods: ["GET", "POST"],
        credentials: true,
    },
})

rootStore.addStore(new CounterStore(0), "counter")

io.use(connectionMiddleware((socket) => Promise.resolve(socket.id)))

io.listen(8081)
