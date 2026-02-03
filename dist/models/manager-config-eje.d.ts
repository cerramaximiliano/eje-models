/**
 * Modelo ManagerConfigEje
 * Configuración del manager de escalado para workers EJE
 * Similar a ManagerConfig de PJN pero adaptado para EJE
 */
import { Document, Model } from 'mongoose';
export interface IManagerSettings {
    checkInterval: number;
    lockTimeoutMinutes: number;
    maxWorkers: number;
    minWorkers: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    updateThresholdHours: number;
    cpuThreshold: number;
    memoryThreshold: number;
    workStartHour: number;
    workEndHour: number;
    workDays: number[];
    timezone: string;
    workerNames: {
        verification: string;
        update: string;
        stuck: string;
    };
}
export interface IWorkerCount {
    verification: number;
    update: number;
    stuck: number;
    total: number;
}
export interface IPendingCount {
    verification: number;
    update: number;
    stuck: number;
    total: number;
}
export interface ISystemResources {
    cpuUsage: number;
    memoryUsage: number;
    memoryTotal: number;
    memoryFree: number;
    loadAvg: number[];
}
export interface IManagerState {
    isRunning: boolean;
    isPaused: boolean;
    lastCycleAt?: Date;
    cycleCount: number;
    workers: IWorkerCount;
    pending: IPendingCount;
    optimalWorkers: IWorkerCount;
    systemResources: ISystemResources;
    lastScaleAction?: {
        timestamp: Date;
        workerType: string;
        action: 'scale_up' | 'scale_down';
        from: number;
        to: number;
        reason: string;
    };
}
export interface IHistorySnapshot {
    timestamp: Date;
    workers: IWorkerCount;
    pending: IPendingCount;
    systemResources: ISystemResources;
    scaleChanges: number;
}
export interface IAlert {
    type: 'high_cpu' | 'high_memory' | 'no_workers' | 'high_pending' | 'manager_stopped' | 'stuck_documents';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    value?: number;
    threshold?: number;
}
export interface IDailyStats {
    date: string;
    totalEligible: number;
    processed: number;
    success: number;
    errors: number;
    movimientosFound: number;
    avgProcessingTime: number;
    peakPending: number;
    peakWorkers: number;
    cyclesRun: number;
}
export interface IManagerConfigEje extends Document {
    name: string;
    config: IManagerSettings;
    currentState: IManagerState;
    history: IHistorySnapshot[];
    alerts: IAlert[];
    dailyStats: IDailyStats[];
    createdAt: Date;
    updatedAt: Date;
}
export interface IManagerConfigEjeModel extends Model<IManagerConfigEje> {
    getOrCreate(): Promise<IManagerConfigEje>;
    getConfig(): Promise<IManagerConfigEje | null>;
    updateConfig(updates: Partial<IManagerSettings>): Promise<IManagerConfigEje | null>;
    updateState(state: Partial<IManagerState>): Promise<IManagerConfigEje | null>;
    addHistorySnapshot(snapshot: Omit<IHistorySnapshot, 'timestamp'>): Promise<void>;
    addAlert(alert: Omit<IAlert, 'timestamp' | 'acknowledged'>): Promise<void>;
    acknowledgeAlert(alertIndex: number, acknowledgedBy: string): Promise<void>;
    updateDailyStats(stats: Partial<IDailyStats>): Promise<void>;
    isWithinWorkingHours(): Promise<boolean>;
}
export declare const ManagerConfigEje: IManagerConfigEjeModel;
export default ManagerConfigEje;
//# sourceMappingURL=manager-config-eje.d.ts.map