import { fromEvent } from "rxjs"
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client"
import { useLayoutEffect, useState } from "react"
import { Connection, rootStore, RootStore, RootStoreDefaultLinkId } from "co-share"
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
    const socket: Socket = persist(() => io(url, options), [url, options, useSocketIoConnectionPersistSymbol])

    const connection = suspend(() => {
        const result: Connection = {
            userData,
            disconnect: () => socket.disconnect(),
            publish: (id, actionIdentifier, ...params) => socket.send(id, actionIdentifier, ...params),
            receive: () => fromEvent(socket as any, "message"),
        }
        providedRootStore.link(RootStoreDefaultLinkId, result)
        if (socket.connected) {
            return Promise.resolve(result)
        } else {
            return new Promise<Connection>((resolve) => socket.on("connect", () => resolve(result)))
        }
    }, [socket, useSocketIoConnectionSuspenseSymbol])

    useLayoutEffect(() => {
        const listener = () => {
            clear([socket, useSocketIoConnectionSuspenseSymbol])
            forceUpdate()
        }
        socket.on("disconnect", listener)
        return () => {
            socket.off("disconnect", listener)
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
