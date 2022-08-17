import { Job } from 'models'
import { FFLogsEvent } from 'parse/fflogs/event'
import { Friend } from 'parse/fflogs/fight'
import { CastHook } from 'simulate/hooks'
import { Player } from 'simulate/modules/entity/player'

export class PlayerHandler {
    private players: Map<number, Player> = new Map()
    private friends: Friend[]
    private castHook: CastHook

    constructor(friends: Friend[], castHook: CastHook) {
        this.friends = friends
        this.castHook = castHook
    }

    public processEvent(event: FFLogsEvent) {
        // TODO we'll probably need a pet map for this a la partnercalc 1.0
        const friend = this.friends.find(friend => friend.id === event.sourceID)

        if (!friend) { return }

        const player = this.getPlayer(friend.id)
        player.processEvent(event)
    }

    private getPlayer(id: number): Player {
        if (this.players.has(id)) {
            return this.players.get(id)
        }

        // TODO need to get Job also
        const dummyJob: Job = {
            name: 'Foo',
            iconPath: '/nowhere/foo.png',
            color: '#000000',
        }

        const newPlayer = new Player(id, dummyJob, this.castHook)
        this.players.set(id, newPlayer)

        return newPlayer
    }
}
