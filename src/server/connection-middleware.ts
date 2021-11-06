import { Socket } from "socket.io"
import { ActionIdentifier, Connection, RootStore, RootStoreDefaultLinkId, rootStore, StoreLinkId } from "co-share"
import { fromEvent, Subject } from "rxjs"
import { takeUntil } from "rxjs/operators"

/**
 *
 * @param onConnect resolve the promise with any "userData" to accept the incomming connection, or reject the promise to decline
 * @param providedRootStore
 * @returns
 */
export function connectionMiddleware(
    onConnect: (socket: Socket) => Promise<any>,
    providedRootStore: RootStore = rootStore
): (socket: Socket, next: (err?: any) => void) => void {
    return async (socket, next) => {
        try {
            const disconnectSubject = new Subject<void>()
            socket.on("disconnecting", () => disconnectSubject.next())
            const connection: Connection = {
                userData: await onConnect(socket),
                disconnect: () => socket.disconnect(true),
                publish: (id, actionIdentifier, ...params) => socket.send(id, actionIdentifier, ...params),
                receive: () =>
                    fromEvent<[id: StoreLinkId, actionIdentifier: ActionIdentifier, ...params: any[]]>(
                        socket,
                        "message"
                    ).pipe(takeUntil(disconnectSubject)),
            }
            providedRootStore.link(RootStoreDefaultLinkId, connection)
            next() //allow connection
        } catch (error: any) {
            next(error)
        }
    }
}
