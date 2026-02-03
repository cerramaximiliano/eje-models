/**
 * Modelo ConfiguracionEje
 * Configuración de workers para el sistema EJE
 */
import mongoose, { Document, Model } from 'mongoose';
export interface ISchedule {
    cronExpression: string;
    workStartHour: number;
    workEndHour: number;
    workDays: number[];
    timezone: string;
    respectWorkingHours: boolean;
}
export interface IWorkerConfig {
    enabled: boolean;
    batchSize: number;
    delayBetweenRequests: number;
    maxRetries: number;
    retryDelay: number;
}
export interface IStats {
    documentsProcessed: number;
    documentsSuccess: number;
    documentsError: number;
    movimientosExtracted: number;
    lastReset: Date;
}
export interface IState {
    isRunning: boolean;
    lastCycleAt?: Date;
    cycleCount: number;
    lastError?: {
        message: string;
        timestamp: Date;
        documentId?: mongoose.Types.ObjectId;
    };
}
export interface IDailyStat {
    date: Date;
    totalEligible: number;
    processed: number;
    success: number;
    errors: number;
    pending: number;
    movimientosExtracted: number;
    cyclesRun: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface IConfiguracionEje extends Document {
    workerId: string;
    name: string;
    enabled: boolean;
    baseUrl: string;
    workers: {
        verification: IWorkerConfig;
        update: IWorkerConfig;
        stuck: IWorkerConfig;
    };
    schedule: ISchedule;
    rateLimiting: {
        enabled: boolean;
        requestsPerMinute: number;
        requestsPerHour: number;
    };
    stats: IStats;
    state: IState;
    dailyStats: IDailyStat[];
    createdAt: Date;
    updatedAt: Date;
}
export interface IConfiguracionEjeModel extends Model<IConfiguracionEje> {
    getOrCreate(workerId?: string): Promise<IConfiguracionEje>;
    getConfig(): Promise<IConfiguracionEje | null>;
    updateConfig(updates: Partial<IConfiguracionEje>): Promise<IConfiguracionEje>;
    isWithinWorkingHours(): Promise<boolean>;
    logSuccess(movimientosCount?: number): Promise<IConfiguracionEje | null>;
    logError(error: Error, documentId?: mongoose.Types.ObjectId): Promise<IConfiguracionEje | null>;
}
export declare const ConfiguracionEje: IConfiguracionEjeModel;
export default ConfiguracionEje;
//# sourceMappingURL=configuracion-eje.d.ts.map