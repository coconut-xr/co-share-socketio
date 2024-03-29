import { fromEvent, Subject } from "rxjs"
import { takeUntil } from "rxjs/operators"
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client"
import { useLayoutEffect, useState } from "react"
import { Connection, ConnectionMessage, rootStore, RootStore, RootStoreDefaultLinkId } from "co-share"
import { clear, peek, preload, suspend } from "suspend-react"

const useSocketIoConnectionPersistSymbol = Symbol()
const useSocketIoConnectionSuspenseSymbol = Symbol()

export function useSocketIoConnection(
    url: string,
    options?: Partial<ManagerOptions & SocketOptions>,
    userData?: any,
    providedRootStore: RootStore = rootStore
): Connection {
    const forceUpdate = useForceUpdate()

    const [connection, socket, onDisconnect] = suspend(async () => {
        const socket: Socket = io(url, options)
        const disconnectSubject = new Subject<void>()
        const result: Connection = {
            userData,
            disconnect: () => socket.disconnect(),
            publish: (id, actionIdentifier, ...params) => socket.send(id, actionIdentifier, ...params),
            receive: () => fromEvent<ConnectionMessage>(socket as any, "message").pipe(takeUntil(disconnectSubject)),
        }

        if (!socket.connected) {
            await new Promise<void>((resolve) => socket.on("connect", resolve))
        }

        providedRootStore.link(RootStoreDefaultLinkId, result)
        return [result, socket, disconnectSubject] as [Connection, Socket, Subject<void>]
    }, [url, options, useSocketIoConnectionPersistSymbol])

    useLayoutEffect(() => {
        const listener = () => {
            onDisconnect.next()
            clear([url, options, useSocketIoConnectionPersistSymbol])
            forceUpdate()
        }
        socket.on("disconnect", listener)
        return () => {
            socket.off("disconnect", listener)
            socket.disconnect()
        }
    }, [socket])

    return connection
}

function useForceUpdate() {
    const [value, setValue] = useState(0) // integer state
    return () => setValue((value) => value + 1) // update the state to force render
}

function persist<T, Keys extends Array<unknown>, Fn extends (...keys: Keys) => T>(
    fn: Fn,
    keys: Keys,
    config: Partial<{
        lifespan?: number
        equal?: (a: any, b: any) => boolean
    }> = {}
): T {
    let result = peek(keys) as T
    if (result == null) {
        result = fn(...keys)
        preload(() => Promise.resolve(result), keys, config)
    }
    return result
}
