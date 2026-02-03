/**
 * Modelo WorkerStatsEje
 * Estadísticas detalladas de workers EJE
 * Incluye estadísticas por run, diarias y horarias
 */
import mongoose, { Document, Model } from 'mongoose';
export interface IErrorDetail {
    causaId?: mongoose.Types.ObjectId;
    cuij?: string;
    numero?: number;
    anio?: number;
    errorType: string;
    message: string;
    stack?: string;
    timestamp: Date;
}
export interface IRunStats {
    runId: string;
    workerType: 'verification' | 'update' | 'stuck';
    workerId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    totalToProcess: number;
    processed: number;
    success: number;
    errors: number;
    skipped: number;
    movimientosFound: number;
    privateCausas: number;
    publicCausas: number;
    errorDetails: IErrorDetail[];
    metadata?: {
        batchSize?: number;
        configVersion?: string;
        errorMessage?: string;
    };
}
export interface IHourlyStats {
    hour: number;
    processed: number;
    success: number;
    errors: number;
    movimientosFound: number;
    avgProcessingTime: number;
    runsCount: number;
}
export interface IDailyWorkerStats {
    date: string;
    workerType: 'verification' | 'update' | 'stuck' | 'all';
    totalProcessed: number;
    totalSuccess: number;
    totalErrors: number;
    totalSkipped: number;
    totalMovimientosFound: number;
    totalPrivateCausas: number;
    totalPublicCausas: number;
    runsCompleted: number;
    runsFailed: number;
    runsCancelled: number;
    totalRunTime: number;
    avgRunTime: number;
    hourlyStats: IHourlyStats[];
    topErrors: {
        errorType: string;
        count: number;
        lastOccurrence: Date;
    }[];
    avgProcessingTime: number;
    peakProcessingHour: number;
    peakProcessingCount: number;
}
export interface IWorkerStatsEje extends Document {
    workerType: 'verification' | 'update' | 'stuck';
    workerId: string;
    currentRun?: IRunStats;
    runHistory: IRunStats[];
    dailyStats: IDailyWorkerStats[];
    totalStats: {
        totalProcessed: number;
        totalSuccess: number;
        totalErrors: number;
        totalMovimientosFound: number;
        totalRunsCompleted: number;
        totalRunTime: number;
        firstRunAt?: Date;
        lastRunAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface IWorkerStatsEjeModel extends Model<IWorkerStatsEje> {
    getOrCreate(workerType: 'verification' | 'update' | 'stuck', workerId: string): Promise<IWorkerStatsEje>;
    startRun(workerType: 'verification' | 'update' | 'stuck', workerId: string, totalToProcess: number, metadata?: {
        batchSize?: number;
        configVersion?: string;
    }): Promise<string>;
    recordSuccess(workerType: 'verification' | 'update' | 'stuck', workerId: string, data: {
        movimientosFound?: number;
        isPrivate?: boolean;
    }): Promise<void>;
    recordError(workerType: 'verification' | 'update' | 'stuck', workerId: string, error: IErrorDetail): Promise<void>;
    recordSkipped(workerType: 'verification' | 'update' | 'stuck', workerId: string): Promise<void>;
    finishRun(workerType: 'verification' | 'update' | 'stuck', workerId: string, status: 'completed' | 'failed' | 'cancelled', errorMessage?: string): Promise<IRunStats | null>;
    getTodaySummary(workerType?: 'verification' | 'update' | 'stuck'): Promise<IDailyWorkerStats[]>;
}
export declare const WorkerStatsEje: IWorkerStatsEjeModel;
export default WorkerStatsEje;
//# sourceMappingURL=worker-stats-eje.d.ts.map