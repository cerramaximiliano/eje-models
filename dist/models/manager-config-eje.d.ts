/**
 * Modelo ManagerConfigEje
 * Configuración flexible de managers para workers EJE
 * Soporta múltiples tipos: 'verification', 'update', 'stuck'
 */
import { Document, Model } from 'mongoose';
export type ManagerType = 'verification' | 'update' | 'stuck';
export interface IManagerWorkerConfig {
    enabled: boolean;
    minWorkers: number;
    maxWorkers: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    batchSize: number;
    delayBetweenRequests: number;
    maxRetries: number;
    cronExpression: string;
    workerName: string;
    workerScript: string;
    maxMemoryRestart: string;
}
export interface IManagerSettings {
    checkInterval: number;
    lockTimeoutMinutes: number;
    updateThresholdHours: number;
    cpuThreshold: number;
    memoryThreshold: number;
    workStartHour: number;
    workEndHour: number;
    workDays: number[];
    timezone: string;
    workers: {
        verification: IManagerWorkerConfig;
        update: IManagerWorkerConfig;
        stuck: IManagerWorkerConfig;
    };
}
export interface IWorkerStatus {
    activeInstances: number;
    pendingDocuments: number;
    optimalInstances: number;
    lastProcessedAt?: Date;
    processedThisCycle: number;
    errorsThisCycle: number;
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
    workers: {
        verification: IWorkerStatus;
        update: IWorkerStatus;
        stuck: IWorkerStatus;
    };
    systemResources: ISystemResources;
    lastScaleAction?: {
        timestamp: Date;
        workerType: ManagerType;
        action: 'scale_up' | 'scale_down' | 'no_change';
        from: number;
        to: number;
        reason: string;
    };
}
export interface IHistorySnapshot {
    timestamp: Date;
    workers: {
        verification: {
            active: number;
            pending: number;
        };
        update: {
            active: number;
            pending: number;
        };
        stuck: {
            active: number;
            pending: number;
        };
    };
    systemResources: ISystemResources;
    scaleChanges: number;
}
export interface IAlert {
    type: 'high_cpu' | 'high_memory' | 'no_workers' | 'high_pending' | 'manager_stopped' | 'stuck_documents' | 'worker_error';
    workerType?: ManagerType;
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
    byWorker: {
        verification: {
            processed: number;
            success: number;
            errors: number;
            peakPending: number;
            peakWorkers: number;
        };
        update: {
            processed: number;
            success: number;
            errors: number;
            movimientosFound: number;
            peakPending: number;
            peakWorkers: number;
        };
        stuck: {
            processed: number;
            recovered: number;
            markedInvalid: number;
        };
    };
    cyclesRun: number;
    avgCycleTime: number;
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
    updateWorkerConfig(workerType: ManagerType, updates: Partial<IManagerWorkerConfig>): Promise<IManagerConfigEje | null>;
    getWorkerConfig(workerType: ManagerType): Promise<IManagerWorkerConfig | null>;
    updateState(state: Partial<IManagerState>): Promise<IManagerConfigEje | null>;
    updateWorkerStatus(workerType: ManagerType, status: Partial<IWorkerStatus>): Promise<IManagerConfigEje | null>;
    addHistorySnapshot(snapshot: Omit<IHistorySnapshot, 'timestamp'>): Promise<void>;
    addAlert(alert: Omit<IAlert, 'timestamp' | 'acknowledged'>): Promise<void>;
    acknowledgeAlert(alertIndex: number, acknowledgedBy: string): Promise<void>;
    recordScaleAction(workerType: ManagerType, action: 'scale_up' | 'scale_down' | 'no_change', from: number, to: number, reason: string): Promise<void>;
    isWithinWorkingHours(): Promise<boolean>;
    markManagerRunning(isRunning: boolean): Promise<void>;
}
export declare const ManagerConfigEje: IManagerConfigEjeModel;
export default ManagerConfigEje;
//# sourceMappingURL=manager-config-eje.d.ts.map