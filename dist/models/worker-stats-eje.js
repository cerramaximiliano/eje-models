"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerStatsEje = void 0;
/**
 * Modelo WorkerStatsEje
 * Estadísticas detalladas de workers EJE
 * Incluye estadísticas por run, diarias y horarias
 */
const mongoose_1 = __importStar(require("mongoose"));
// ========== SCHEMAS ==========
const ErrorDetailSchema = new mongoose_1.Schema({
    causaId: { type: mongoose_1.Schema.Types.ObjectId },
    cuij: { type: String },
    numero: { type: Number },
    anio: { type: Number },
    errorType: { type: String, required: true },
    message: { type: String, required: true },
    stack: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });
const RunStatsSchema = new mongoose_1.Schema({
    runId: { type: String, required: true },
    workerType: { type: String, enum: ['verification', 'update', 'stuck'], required: true },
    workerId: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number },
    status: { type: String, enum: ['running', 'completed', 'failed', 'cancelled'], default: 'running' },
    totalToProcess: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    movimientosFound: { type: Number, default: 0 },
    privateCausas: { type: Number, default: 0 },
    publicCausas: { type: Number, default: 0 },
    errorDetails: { type: [ErrorDetailSchema], default: [] },
    metadata: {
        batchSize: { type: Number },
        configVersion: { type: String },
        errorMessage: { type: String }
    }
}, { _id: false });
const HourlyStatsSchema = new mongoose_1.Schema({
    hour: { type: Number, required: true, min: 0, max: 23 },
    processed: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    movimientosFound: { type: Number, default: 0 },
    avgProcessingTime: { type: Number, default: 0 },
    runsCount: { type: Number, default: 0 }
}, { _id: false });
const DailyWorkerStatsSchema = new mongoose_1.Schema({
    date: { type: String, required: true },
    workerType: { type: String, enum: ['verification', 'update', 'stuck', 'all'], required: true },
    totalProcessed: { type: Number, default: 0 },
    totalSuccess: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    totalSkipped: { type: Number, default: 0 },
    totalMovimientosFound: { type: Number, default: 0 },
    totalPrivateCausas: { type: Number, default: 0 },
    totalPublicCausas: { type: Number, default: 0 },
    runsCompleted: { type: Number, default: 0 },
    runsFailed: { type: Number, default: 0 },
    runsCancelled: { type: Number, default: 0 },
    totalRunTime: { type: Number, default: 0 },
    avgRunTime: { type: Number, default: 0 },
    hourlyStats: { type: [HourlyStatsSchema], default: () => Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            processed: 0,
            success: 0,
            errors: 0,
            movimientosFound: 0,
            avgProcessingTime: 0,
            runsCount: 0
        })) },
    topErrors: [{
            errorType: { type: String },
            count: { type: Number, default: 0 },
            lastOccurrence: { type: Date }
        }],
    avgProcessingTime: { type: Number, default: 0 },
    peakProcessingHour: { type: Number, default: 0 },
    peakProcessingCount: { type: Number, default: 0 }
}, { _id: false });
// ========== SCHEMA PRINCIPAL ==========
const WorkerStatsEjeSchema = new mongoose_1.Schema({
    workerType: {
        type: String,
        enum: ['verification', 'update', 'stuck'],
        required: true
    },
    workerId: {
        type: String,
        required: true
    },
    currentRun: { type: RunStatsSchema },
    runHistory: { type: [RunStatsSchema], default: [] },
    dailyStats: { type: [DailyWorkerStatsSchema], default: [] },
    totalStats: {
        totalProcessed: { type: Number, default: 0 },
        totalSuccess: { type: Number, default: 0 },
        totalErrors: { type: Number, default: 0 },
        totalMovimientosFound: { type: Number, default: 0 },
        totalRunsCompleted: { type: Number, default: 0 },
        totalRunTime: { type: Number, default: 0 },
        firstRunAt: { type: Date },
        lastRunAt: { type: Date }
    }
}, {
    timestamps: true,
    collection: 'worker-stats-eje'
});
// Índices
WorkerStatsEjeSchema.index({ workerType: 1, workerId: 1 }, { unique: true });
WorkerStatsEjeSchema.index({ 'currentRun.status': 1 });
WorkerStatsEjeSchema.index({ 'dailyStats.date': 1 });
// ========== MÉTODOS ESTÁTICOS ==========
WorkerStatsEjeSchema.statics.getOrCreate = async function (workerType, workerId) {
    let stats = await this.findOne({ workerType, workerId });
    if (!stats) {
        stats = await this.create({ workerType, workerId });
    }
    return stats;
};
WorkerStatsEjeSchema.statics.startRun = async function (workerType, workerId, totalToProcess, metadata) {
    const runId = `${workerType}-${workerId}-${Date.now()}`;
    const newRun = {
        runId,
        workerType,
        workerId,
        startTime: new Date(),
        status: 'running',
        totalToProcess,
        processed: 0,
        success: 0,
        errors: 0,
        skipped: 0,
        movimientosFound: 0,
        privateCausas: 0,
        publicCausas: 0,
        errorDetails: [],
        metadata
    };
    await this.findOneAndUpdate({ workerType, workerId }, {
        $set: { currentRun: newRun },
        $setOnInsert: { workerType, workerId }
    }, { upsert: true });
    return runId;
};
WorkerStatsEjeSchema.statics.recordSuccess = async function (workerType, workerId, data) {
    const inc = {
        'currentRun.processed': 1,
        'currentRun.success': 1,
        'totalStats.totalProcessed': 1,
        'totalStats.totalSuccess': 1
    };
    if (data.movimientosFound) {
        inc['currentRun.movimientosFound'] = data.movimientosFound;
        inc['totalStats.totalMovimientosFound'] = data.movimientosFound;
    }
    if (data.isPrivate) {
        inc['currentRun.privateCausas'] = 1;
    }
    else {
        inc['currentRun.publicCausas'] = 1;
    }
    await this.findOneAndUpdate({ workerType, workerId }, { $inc: inc });
};
WorkerStatsEjeSchema.statics.recordError = async function (workerType, workerId, error) {
    await this.findOneAndUpdate({ workerType, workerId }, {
        $inc: {
            'currentRun.processed': 1,
            'currentRun.errors': 1,
            'totalStats.totalProcessed': 1,
            'totalStats.totalErrors': 1
        },
        $push: {
            'currentRun.errorDetails': {
                $each: [{ ...error, timestamp: new Date() }],
                $slice: -50 // Mantener últimos 50 errores por run
            }
        }
    });
};
WorkerStatsEjeSchema.statics.recordSkipped = async function (workerType, workerId) {
    await this.findOneAndUpdate({ workerType, workerId }, {
        $inc: {
            'currentRun.processed': 1,
            'currentRun.skipped': 1
        }
    });
};
WorkerStatsEjeSchema.statics.finishRun = async function (workerType, workerId, status, errorMessage) {
    const stats = await this.findOne({ workerType, workerId });
    if (!stats || !stats.currentRun)
        return null;
    const endTime = new Date();
    const duration = endTime.getTime() - stats.currentRun.startTime.getTime();
    const finishedRun = {
        ...stats.currentRun.toObject(),
        endTime,
        duration,
        status,
        metadata: {
            ...stats.currentRun.metadata,
            errorMessage
        }
    };
    // Actualizar estadísticas diarias
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    await this.findOneAndUpdate({ workerType, workerId }, {
        $unset: { currentRun: 1 },
        $push: {
            runHistory: {
                $each: [finishedRun],
                $slice: -100 // Mantener últimos 100 runs
            }
        },
        $inc: {
            'totalStats.totalRunsCompleted': status === 'completed' ? 1 : 0,
            'totalStats.totalRunTime': duration
        },
        $set: {
            'totalStats.lastRunAt': endTime
        }
    });
    // Actualizar o crear estadísticas diarias
    const dailyExists = await this.findOne({
        workerType,
        workerId,
        'dailyStats.date': today
    });
    if (dailyExists) {
        await this.findOneAndUpdate({ workerType, workerId, 'dailyStats.date': today }, {
            $inc: {
                'dailyStats.$.totalProcessed': finishedRun.processed,
                'dailyStats.$.totalSuccess': finishedRun.success,
                'dailyStats.$.totalErrors': finishedRun.errors,
                'dailyStats.$.totalSkipped': finishedRun.skipped,
                'dailyStats.$.totalMovimientosFound': finishedRun.movimientosFound,
                'dailyStats.$.totalPrivateCausas': finishedRun.privateCausas,
                'dailyStats.$.totalPublicCausas': finishedRun.publicCausas,
                'dailyStats.$.runsCompleted': status === 'completed' ? 1 : 0,
                'dailyStats.$.runsFailed': status === 'failed' ? 1 : 0,
                'dailyStats.$.runsCancelled': status === 'cancelled' ? 1 : 0,
                'dailyStats.$.totalRunTime': duration,
                [`dailyStats.$.hourlyStats.${currentHour}.processed`]: finishedRun.processed,
                [`dailyStats.$.hourlyStats.${currentHour}.success`]: finishedRun.success,
                [`dailyStats.$.hourlyStats.${currentHour}.errors`]: finishedRun.errors,
                [`dailyStats.$.hourlyStats.${currentHour}.movimientosFound`]: finishedRun.movimientosFound,
                [`dailyStats.$.hourlyStats.${currentHour}.runsCount`]: 1
            }
        });
    }
    else {
        const newDailyStats = {
            date: today,
            workerType,
            totalProcessed: finishedRun.processed,
            totalSuccess: finishedRun.success,
            totalErrors: finishedRun.errors,
            totalSkipped: finishedRun.skipped,
            totalMovimientosFound: finishedRun.movimientosFound,
            totalPrivateCausas: finishedRun.privateCausas,
            totalPublicCausas: finishedRun.publicCausas,
            runsCompleted: status === 'completed' ? 1 : 0,
            runsFailed: status === 'failed' ? 1 : 0,
            runsCancelled: status === 'cancelled' ? 1 : 0,
            totalRunTime: duration,
            avgRunTime: duration,
            hourlyStats: Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                processed: i === currentHour ? finishedRun.processed : 0,
                success: i === currentHour ? finishedRun.success : 0,
                errors: i === currentHour ? finishedRun.errors : 0,
                movimientosFound: i === currentHour ? finishedRun.movimientosFound : 0,
                avgProcessingTime: 0,
                runsCount: i === currentHour ? 1 : 0
            })),
            topErrors: [],
            avgProcessingTime: finishedRun.processed > 0 ? duration / finishedRun.processed : 0,
            peakProcessingHour: currentHour,
            peakProcessingCount: finishedRun.processed
        };
        await this.findOneAndUpdate({ workerType, workerId }, {
            $push: {
                dailyStats: {
                    $each: [newDailyStats],
                    $slice: -30 // Mantener últimos 30 días
                }
            }
        });
    }
    return finishedRun;
};
WorkerStatsEjeSchema.statics.getTodaySummary = async function (workerType) {
    const today = new Date().toISOString().split('T')[0];
    const query = {
        'dailyStats.date': today
    };
    if (workerType) {
        query.workerType = workerType;
    }
    const stats = await this.find(query).lean();
    return stats.flatMap((s) => s.dailyStats.filter((d) => d.date === today));
};
// ========== EXPORT ==========
exports.WorkerStatsEje = mongoose_1.default.model('WorkerStatsEje', WorkerStatsEjeSchema);
exports.default = exports.WorkerStatsEje;
//# sourceMappingURL=worker-stats-eje.js.map