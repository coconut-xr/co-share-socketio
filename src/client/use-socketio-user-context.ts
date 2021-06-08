import { fromEvent, NEVER, Subscription } from "rxjs"
import { io, ManagerOptions, SocketOptions } from "socket.io-client"
import { useEffect, useMemo, useState } from "react"
import { tap } from "rxjs/operators"
import { Connection } from "co-share"

export function useSocketIoConnection(
    url: string,
    options?: Partial<ManagerOptions & SocketOptions>
): Connection | undefined {
    const [connection, setConnection] = useState<Connection | undefined>(undefined)

    const socket = useMemo(() => io(url, { secure: true, ...options }), [options, url])

    useEffect(() => {
        const subscription = new Subscription()
        subscription.add(
            fromEvent(socket, "disconnect")
                .pipe(tap(() => setConnection(undefined)))
                .subscribe()
        )
        subscription.add(
            fromEvent(socket, "connect")
                .pipe(
                    tap(() =>
                        setConnection({
                            userData: {
                                socket,
                                id: socket.id,
                            },
                            disconnect: () => socket.disconnect(),
                            publish: (id, actionIdentifier, ...params) => socket.send(id, actionIdentifier, ...params),
                            receive: () => fromEvent(socket, "message"),
                        })
                    )
                )
                .subscribe()
        )
        return () => {
            setConnection(undefined)
            subscription.unsubscribe()
            socket.close()
        }
    }, [url, socket, setConnection])

    return connection
}
