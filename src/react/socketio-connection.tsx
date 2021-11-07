import { Connection, ConnectionMessage, rootStore, RootStore, RootStoreDefaultLinkId } from "co-share"
import React, { useCallback, useEffect } from "react"
import { useLayoutEffect, useMemo, useState } from "react"
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client"
import { merge, fromEvent, Observable, defer, of } from "rxjs"
import { takeUntil, finalize, map, tap, mergeMap } from "rxjs/operators"

function createConnection(socket: Socket, rootStore: RootStore, userData?: (socket: Socket) => any): Connection {
    const connection: Connection = {
        userData: userData == null ? {} : userData(socket),
        disconnect: () => socket.disconnect(),
        publish: (id, actionIdentifier, ...params) => socket.send(id, actionIdentifier, ...params),
        receive: () =>
            fromEvent<ConnectionMessage>(socket as any, "message").pipe(
                takeUntil(fromEvent(socket as any, "disconnect"))
            ),
    }
    rootStore.link(RootStoreDefaultLinkId, connection)
    return connection
}

export function SocketIOConnection({
    children,
    url,
    options,
    userData,
    providedRootStore = rootStore,
}: React.PropsWithChildren<{
    url: string
    options?: Partial<ManagerOptions & SocketOptions>
    userData?: (socket: Socket) => any
    providedRootStore?: RootStore
}>) {
    const observable = useMemo<Observable<undefined | Connection>>(
        () =>
            defer(() => of(io(url, options))).pipe(
                mergeMap((socket) =>
                    merge(
                        of(socket.connected),
                        fromEvent(socket as any, "disconnect").pipe(map(() => false)),
                        fromEvent(socket as any, "connect").pipe(map(() => true))
                    ).pipe(
                        map((connected) =>
                            connected ? undefined : createConnection(socket, providedRootStore, userData)
                        ),
                        finalize(() => socket.disconnect())
                    )
                )
            ),
        [url, options, providedRootStore, userData]
    )

    const [connection, setConnection] = useState<Connection | undefined>(undefined)

    useLayoutEffect(() => {
        const subscription = observable.pipe(tap(setConnection)).subscribe()
        return () => subscription.unsubscribe()
    }, [observable])

    if (connection == null) {
        return null
    }

    return <>{children}</>
}
