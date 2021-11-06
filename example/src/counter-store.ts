import { Action, Store, StoreLink, Subscriber } from "co-share"
import create, { StoreApi } from "zustand/vanilla"

export class CounterStore extends Store {
    public subscriber: Subscriber<CounterStore, [number]> = Subscriber.create(
        CounterStore,
        (connection, accept, deny) => accept(this.state.getState().counter)
    )

    public state: StoreApi<{ counter: number }>

    public onUnlink(link: StoreLink): void {}

    public onLink(link: StoreLink): void {}

    constructor(value: number) {
        super()
        this.state = create(() => ({ counter: value }))
    }

    increase = Action.create(this, "incr", (origin) => {
        this.increase.publishTo(origin == null ? { to: "all" } : { to: "all-except-one", except: origin })
        this.state.setState({
            counter: this.state.getState().counter + 1,
        })
    })
}
