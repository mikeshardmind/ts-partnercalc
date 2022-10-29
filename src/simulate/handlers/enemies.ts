import { FFLogsEvent } from 'api/fflogs/event'
import { Friend } from 'api/fflogs/fight'
import { Effect } from 'types'
import { Enemy } from 'simulate/modules/entities/enemy'

export class EnemyHandler {
    private enemies: Map<string, Enemy> = new Map()
    private friends: Friend[]

    constructor(friends: Friend[]) {
        this.friends = friends
    }

    public processEvent(event: FFLogsEvent) {
        if (this.friends.some(friend => friend.id === event.targetID)) {
            return
        }

        const enemy = this.getEnemy(event.targetKey)
        enemy.processEvent(event)
    }

    public getEnemyDebuffs(key: string): Effect[] {
        return this.getEnemy(key).activeDebuffs
    }

    private getEnemy(key: string): Enemy {
        if (this.enemies.has(key)) {
            return this.enemies.get(key)
        }

        const newEnemy = new Enemy(key)
        this.enemies.set(key, newEnemy)

        return newEnemy
    }
}
