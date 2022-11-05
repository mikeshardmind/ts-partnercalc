import { ApplyBuffEvent, CastEvent, FFLogsEvent, RemoveBuffEvent, SnapshotEvent } from 'api/fflogs/event'
import { DataProvider } from 'data/provider'
import { Devilment } from 'simulate/buffwindow/devilment'
import { Standard } from 'simulate/buffwindow/standard'
import { Entity } from './entity'

const MIN_WINDOW_LENGTH = 10000 // ~4 GCDs

type StandardHook = (standard: Standard) => void

export class Dancer extends Entity {
    public id: number
    private emitStandard: StandardHook
    private currentStandard: Standard | undefined
    private currentDevilment: Devilment | undefined
    private lastApplierID: number | undefined

    private potencyRatios: number[] = []

    constructor(id: number, standardHook: StandardHook, data: DataProvider) {
        super(id.toString(), data)
        this.id = id
        this.emitStandard = standardHook
        this.init()
    }

    protected init() {
        const standardFilter = { actionID: this.data.statuses.STANDARD_FINISH.id }
        const devilmentFilter = { actionID: this.data.statuses.DEVILMENT.id }

        this.addHook('applybuff', this.onStandard, standardFilter)
        this.addHook('removebuff', this.onRemoveStandard, standardFilter)
        this.addHook('applybuff', this.onDevilment, devilmentFilter)
        this.addHook('removebuff', this.onRemoveDevilment, devilmentFilter)
        this.addHook('cast', this.onCast, { actionID: this.data.actions.TILLANA.id })
        this.addHook('cast', this.onCast, { actionID: this.data.actions.DOUBLE_STANDARD_FINISH.id })
        this.addHook('snapshot', this.onSnapshot, { sourceID: this.id })
    }

    public processEvent(event: FFLogsEvent) {
        if (event.sourceID !== this.id) {
            return
        }
        super.processEvent(event)
    }

    public get potencyRatio() {
        const sum = this.potencyRatios.reduce((sum, x) => sum + x, 0)
        return sum / this.potencyRatios.length
    }

    private onCast(event: CastEvent) {
        this.lastApplierID = event.actionID
    }

    private onSnapshot(event: SnapshotEvent) {
        const action = this.data.getAction(event.actionID)

        if (action == null || action.potency == null || action.falloff) {
            return
        }

        this.potencyRatios.push(event.amount / action.potency)
    }

    private onStandard(event: ApplyBuffEvent) {
        if (this.currentStandard) {
            if (this.currentDevilment?.isOpen) {
                // Switching partners here would drop Devilment -- merge this window
                return
            }

            if (event.timestamp < this.currentStandard.start + MIN_WINDOW_LENGTH) {
                // The previous window was too short for swapping to be viable -- merge this window
                return
            }

            this.currentStandard.close(event.timestamp)
        }

        const isTillana = (this.lastApplierID != null)
            && (this.lastApplierID === this.data.actions.TILLANA.id)
        const standard = new Standard(event.timestamp, event.targetID, isTillana, this.data)

        this.currentStandard = standard
        this.emitStandard(standard)
    }

    private onRemoveStandard(event: RemoveBuffEvent) {
        if (this.currentStandard) {
            this.currentStandard.close(event.timestamp)
            this.currentStandard = undefined
        }
    }

    private onDevilment(event: ApplyBuffEvent) {
        if (event.targetID === this.id) {
            return
        }

        if (!this.currentStandard) {
            console.warn('Devilment found with no standard?')
            return
        }

        const devilment = new Devilment(event.timestamp, event.targetID)
        this.currentDevilment = devilment
        this.currentStandard.addDevilment(devilment)
    }

    private onRemoveDevilment(event: RemoveBuffEvent) {
        if (this.currentDevilment) {
            this.currentDevilment.close(event.timestamp)
            this.currentDevilment = undefined
        }
    }
}
