import { Socket } from "socket.io"
import { ExtendedError } from "socket.io/dist/namespace"
import { ActionIdentifier, Connection, RootStoreDefaultLinkId, Store, StoreLinkId } from "co-share"
import { fromEvent, Subject } from "rxjs"
import { takeUntil } from "rxjs/operators"

export function connectionMiddleware(
    rootStore: Store,
    getUserData: (socket: Socket) => Promise<any>
): (socket: Socket, next: (err?: ExtendedError) => void) => void {
    return async (socket, next) => {
        try {
            const disconnectSubject = new Subject<void>()
            socket.on("disconnecting", () => disconnectSubject.next())
            const connection: Connection = {
                userData: await getUserData(socket),
                disconnect: () => socket.disconnect(true),
                publish: (id, actionIdentifier, ...params) => socket.send(id, actionIdentifier, ...params),
                receive: () =>
                    fromEvent<[id: StoreLinkId, actionIdentifier: ActionIdentifier, ...params: any[]]>(
                        socket,
                        "message"
                    ).pipe(takeUntil(disconnectSubject)),
            }
            rootStore.subscriber(
                connection,
                () => {
                    rootStore.link(RootStoreDefaultLinkId, connection)
                    next() //allow connection
                },
                (reason) =>
                    next({
                        message: reason,
                        name: "connection-error",
                    })
            )
        } catch (error) {
            next(error)
        }
    }
}
