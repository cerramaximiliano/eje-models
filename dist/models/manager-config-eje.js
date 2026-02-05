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
exports.ManagerConfigEje = void 0;
/**
 * Modelo ManagerConfigEje
 * Configuración flexible de managers para workers EJE
 * Soporta múltiples tipos: 'verification', 'update', 'stuck'
 */
const mongoose_1 = __importStar(require("mongoose"));
// ========== VALORES POR DEFECTO ==========
const DEFAULT_WORKER_SCHEDULE = {
    workStartHour: 0,
    workEndHour: 23,
    workDays: [0, 1, 2, 3, 4, 5, 6],
    useGlobalSchedule: true
};
const DEFAULT_WORKER_CONFIG = {
    enabled: true,
    minWorkers: 1,
    maxWorkers: 3,
    scaleUpThreshold: 100,
    scaleDownThreshold: 10,
    updateThresholdHours: 24,
    batchSize: 10,
    delayBetweenRequests: 2000,
    maxRetries: 3,
    schedule: { ...DEFAULT_WORKER_SCHEDULE },
    cronExpression: '*/2 * * * *',
    workerName: 'eje-worker',
    workerScript: './dist/workers/worker.js',
    maxMemoryRestart: '500M'
};
const DEFAULT_WORKER_STATUS = {
    activeInstances: 0,
    pendingDocuments: 0,
    optimalInstances: 0,
    processedThisCycle: 0,
    errorsThisCycle: 0
};
// ========== SCHEMAS ==========
const WorkerScheduleSchema = new mongoose_1.Schema({
    workStartHour: { type: Number, default: 0 },
    workEndHour: { type: Number, default: 23 },
    workDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    useGlobalSchedule: { type: Boolean, default: true }
}, { _id: false });
const WorkerConfigSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: true },
    minWorkers: { type: Number, default: 1 },
    maxWorkers: { type: Number, default: 3 },
    scaleUpThreshold: { type: Number, default: 100 },
    scaleDownThreshold: { type: Number, default: 10 },
    updateThresholdHours: { type: Number, default: 24 },
    batchSize: { type: Number, default: 10 },
    delayBetweenRequests: { type: Number, default: 2000 },
    maxRetries: { type: Number, default: 3 },
    schedule: { type: WorkerScheduleSchema, default: () => ({ ...DEFAULT_WORKER_SCHEDULE }) },
    cronExpression: { type: String, default: '*/2 * * * *' },
    workerName: { type: String, default: 'eje-worker' },
    workerScript: { type: String, default: './dist/workers/worker.js' },
    maxMemoryRestart: { type: String, default: '500M' }
}, { _id: false });
const ManagerSettingsSchema = new mongoose_1.Schema({
    checkInterval: { type: Number, default: 60000 },
    lockTimeoutMinutes: { type: Number, default: 10 },
    updateThresholdHours: { type: Number, default: 24 },
    cpuThreshold: { type: Number, default: 0.75 },
    memoryThreshold: { type: Number, default: 0.80 },
    workStartHour: { type: Number, default: 0 }, // 24/7 por defecto
    workEndHour: { type: Number, default: 23 }, // 24/7 por defecto
    workDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] }, // Todos los días
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
    workers: {
        verification: {
            type: WorkerConfigSchema,
            default: () => ({
                ...DEFAULT_WORKER_CONFIG,
                workerName: 'eje-verification-worker',
                workerScript: './dist/workers/verification-worker.js',
                cronExpression: '*/2 * * * *',
                minWorkers: 1,
                maxWorkers: 5,
                updateThresholdHours: 0, // No aplica para verification
                schedule: {
                    workStartHour: 0,
                    workEndHour: 23,
                    workDays: [0, 1, 2, 3, 4, 5, 6],
                    useGlobalSchedule: true
                }
            })
        },
        update: {
            type: WorkerConfigSchema,
            default: () => ({
                ...DEFAULT_WORKER_CONFIG,
                workerName: 'eje-update-worker',
                workerScript: './dist/workers/update-worker.js',
                cronExpression: '*/2 * * * *',
                minWorkers: 1,
                maxWorkers: 3,
                updateThresholdHours: 24, // Actualizar documentos cada 24 horas
                schedule: {
                    workStartHour: 8, // Solo de 8am a 20pm por defecto
                    workEndHour: 20,
                    workDays: [1, 2, 3, 4, 5], // Lunes a viernes
                    useGlobalSchedule: false // Usa su propio horario
                }
            })
        },
        stuck: {
            type: WorkerConfigSchema,
            default: () => ({
                ...DEFAULT_WORKER_CONFIG,
                workerName: 'eje-stuck-worker',
                workerScript: './dist/workers/stuck-worker.js',
                cronExpression: '0 */2 * * *', // Cada 2 horas
                minWorkers: 1,
                maxWorkers: 1, // Solo 1 instancia para stuck
                updateThresholdHours: 0, // No aplica para stuck
                schedule: {
                    workStartHour: 0,
                    workEndHour: 23,
                    workDays: [0, 1, 2, 3, 4, 5, 6],
                    useGlobalSchedule: true
                }
            })
        }
    }
}, { _id: false });
const WorkerStatusSchema = new mongoose_1.Schema({
    activeInstances: { type: Number, default: 0 },
    pendingDocuments: { type: Number, default: 0 },
    optimalInstances: { type: Number, default: 0 },
    lastProcessedAt: { type: Date },
    processedThisCycle: { type: Number, default: 0 },
    errorsThisCycle: { type: Number, default: 0 }
}, { _id: false });
const SystemResourcesSchema = new mongoose_1.Schema({
    cpuUsage: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    memoryTotal: { type: Number, default: 0 },
    memoryFree: { type: Number, default: 0 },
    loadAvg: { type: [Number], default: [0, 0, 0] }
}, { _id: false });
const ManagerStateSchema = new mongoose_1.Schema({
    isRunning: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
    lastCycleAt: { type: Date },
    cycleCount: { type: Number, default: 0 },
    workers: {
        verification: { type: WorkerStatusSchema, default: () => ({ ...DEFAULT_WORKER_STATUS }) },
        update: { type: WorkerStatusSchema, default: () => ({ ...DEFAULT_WORKER_STATUS }) },
        stuck: { type: WorkerStatusSchema, default: () => ({ ...DEFAULT_WORKER_STATUS }) }
    },
    systemResources: { type: SystemResourcesSchema, default: () => ({}) },
    lastScaleAction: {
        timestamp: { type: Date },
        workerType: { type: String, enum: ['verification', 'update', 'stuck'] },
        action: { type: String, enum: ['scale_up', 'scale_down', 'no_change'] },
        from: { type: Number },
        to: { type: Number },
        reason: { type: String }
    }
}, { _id: false });
const HistorySnapshotSchema = new mongoose_1.Schema({
    timestamp: { type: Date, default: Date.now },
    workers: {
        verification: { active: Number, pending: Number },
        update: { active: Number, pending: Number },
        stuck: { active: Number, pending: Number }
    },
    systemResources: { type: SystemResourcesSchema, default: () => ({}) },
    scaleChanges: { type: Number, default: 0 }
}, { _id: false });
const AlertSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['high_cpu', 'high_memory', 'no_workers', 'high_pending', 'manager_stopped', 'stuck_documents', 'worker_error'],
        required: true
    },
    workerType: { type: String, enum: ['verification', 'update', 'stuck'] },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String },
    value: { type: Number },
    threshold: { type: Number }
}, { _id: false });
const DailyStatsSchema = new mongoose_1.Schema({
    date: { type: String, required: true },
    byWorker: {
        verification: {
            processed: { type: Number, default: 0 },
            success: { type: Number, default: 0 },
            errors: { type: Number, default: 0 },
            peakPending: { type: Number, default: 0 },
            peakWorkers: { type: Number, default: 0 }
        },
        update: {
            processed: { type: Number, default: 0 },
            success: { type: Number, default: 0 },
            errors: { type: Number, default: 0 },
            movimientosFound: { type: Number, default: 0 },
            peakPending: { type: Number, default: 0 },
            peakWorkers: { type: Number, default: 0 }
        },
        stuck: {
            processed: { type: Number, default: 0 },
            recovered: { type: Number, default: 0 },
            markedInvalid: { type: Number, default: 0 }
        }
    },
    cyclesRun: { type: Number, default: 0 },
    avgCycleTime: { type: Number, default: 0 }
}, { _id: false });
// ========== SCHEMA PRINCIPAL ==========
const ManagerConfigEjeSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        default: 'eje-manager'
    },
    config: { type: ManagerSettingsSchema, default: () => ({}) },
    currentState: { type: ManagerStateSchema, default: () => ({}) },
    history: { type: [HistorySnapshotSchema], default: [] },
    alerts: { type: [AlertSchema], default: [] },
    dailyStats: { type: [DailyStatsSchema], default: [] }
}, {
    timestamps: true,
    collection: 'manager-config-eje'
});
// Índice para búsqueda rápida
ManagerConfigEjeSchema.index({ name: 1 });
// ========== MÉTODOS ESTÁTICOS ==========
ManagerConfigEjeSchema.statics.getOrCreate = async function () {
    let config = await this.findOne({ name: 'eje-manager' });
    if (!config) {
        config = await this.create({ name: 'eje-manager' });
    }
    return config;
};
ManagerConfigEjeSchema.statics.getConfig = async function () {
    return this.findOne({ name: 'eje-manager' });
};
ManagerConfigEjeSchema.statics.updateConfig = async function (updates) {
    const updateObj = {};
    for (const [key, value] of Object.entries(updates)) {
        if (key === 'workers' && typeof value === 'object') {
            // Actualizar configuración de workers específicos
            for (const [workerType, workerConfig] of Object.entries(value)) {
                for (const [configKey, configValue] of Object.entries(workerConfig)) {
                    updateObj[`config.workers.${workerType}.${configKey}`] = configValue;
                }
            }
        }
        else {
            updateObj[`config.${key}`] = value;
        }
    }
    return this.findOneAndUpdate({ name: 'eje-manager' }, { $set: updateObj }, { new: true, upsert: true });
};
ManagerConfigEjeSchema.statics.updateWorkerConfig = async function (workerType, updates) {
    const updateObj = {};
    for (const [key, value] of Object.entries(updates)) {
        updateObj[`config.workers.${workerType}.${key}`] = value;
    }
    return this.findOneAndUpdate({ name: 'eje-manager' }, { $set: updateObj }, { new: true });
};
ManagerConfigEjeSchema.statics.getWorkerConfig = async function (workerType) {
    const config = await this.findOne({ name: 'eje-manager' }).lean();
    return config?.config?.workers?.[workerType] || null;
};
ManagerConfigEjeSchema.statics.updateState = async function (state) {
    const updateObj = {};
    for (const [key, value] of Object.entries(state)) {
        if (key === 'workers' && typeof value === 'object') {
            for (const [workerType, workerStatus] of Object.entries(value)) {
                for (const [statusKey, statusValue] of Object.entries(workerStatus)) {
                    updateObj[`currentState.workers.${workerType}.${statusKey}`] = statusValue;
                }
            }
        }
        else {
            updateObj[`currentState.${key}`] = value;
        }
    }
    updateObj['currentState.lastCycleAt'] = new Date();
    return this.findOneAndUpdate({ name: 'eje-manager' }, {
        $set: updateObj,
        $inc: { 'currentState.cycleCount': 1 }
    }, { new: true });
};
ManagerConfigEjeSchema.statics.updateWorkerStatus = async function (workerType, status) {
    const updateObj = {};
    for (const [key, value] of Object.entries(status)) {
        updateObj[`currentState.workers.${workerType}.${key}`] = value;
    }
    return this.findOneAndUpdate({ name: 'eje-manager' }, { $set: updateObj }, { new: true });
};
ManagerConfigEjeSchema.statics.addHistorySnapshot = async function (snapshot) {
    const fullSnapshot = {
        ...snapshot,
        timestamp: new Date()
    };
    await this.findOneAndUpdate({ name: 'eje-manager' }, {
        $push: {
            history: {
                $each: [fullSnapshot],
                $slice: -1440 // Mantener últimas 24h (1 snapshot/minuto)
            }
        }
    });
};
ManagerConfigEjeSchema.statics.addAlert = async function (alert) {
    const fullAlert = {
        ...alert,
        timestamp: new Date(),
        acknowledged: false
    };
    await this.findOneAndUpdate({ name: 'eje-manager' }, {
        $push: {
            alerts: {
                $each: [fullAlert],
                $slice: -100 // Mantener últimas 100 alertas
            }
        }
    });
};
ManagerConfigEjeSchema.statics.acknowledgeAlert = async function (alertIndex, acknowledgedBy) {
    await this.findOneAndUpdate({ name: 'eje-manager' }, {
        $set: {
            [`alerts.${alertIndex}.acknowledged`]: true,
            [`alerts.${alertIndex}.acknowledgedAt`]: new Date(),
            [`alerts.${alertIndex}.acknowledgedBy`]: acknowledgedBy
        }
    });
};
ManagerConfigEjeSchema.statics.recordScaleAction = async function (workerType, action, from, to, reason) {
    await this.findOneAndUpdate({ name: 'eje-manager' }, {
        $set: {
            'currentState.lastScaleAction': {
                timestamp: new Date(),
                workerType,
                action,
                from,
                to,
                reason
            }
        }
    });
};
ManagerConfigEjeSchema.statics.isWithinWorkingHours = async function () {
    const config = await this.findOne({ name: 'eje-manager' }).lean();
    if (!config)
        return false;
    const { workStartHour, workEndHour, workDays, timezone } = config.config;
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'America/Argentina/Buenos_Aires',
        hour: 'numeric',
        hour12: false
    });
    const currentHour = parseInt(formatter.format(now));
    const currentDay = now.getDay();
    if (!workDays.includes(currentDay))
        return false;
    if (currentHour < workStartHour || currentHour >= workEndHour)
        return false;
    return true;
};
ManagerConfigEjeSchema.statics.isWorkerWithinWorkingHours = async function (workerType) {
    const config = await this.findOne({ name: 'eje-manager' }).lean();
    if (!config)
        return false;
    const workerConfig = config.config.workers[workerType];
    if (!workerConfig)
        return false;
    const timezone = config.config.timezone || 'America/Argentina/Buenos_Aires';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
    });
    const currentHour = parseInt(formatter.format(now));
    const dayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getDay();
    // Si no hay schedule definido o usa horario global, verificar horario global
    if (!workerConfig.schedule || workerConfig.schedule.useGlobalSchedule !== false) {
        const { workStartHour, workEndHour, workDays } = config.config;
        if (!workDays.includes(dayOfWeek))
            return false;
        if (currentHour < workStartHour || currentHour >= workEndHour)
            return false;
        return true;
    }
    // Usar horario específico del worker
    const schedule = workerConfig.schedule;
    const workStartHour = schedule.workStartHour ?? 0;
    const workEndHour = schedule.workEndHour ?? 23;
    const workDays = schedule.workDays ?? [0, 1, 2, 3, 4, 5, 6];
    if (!workDays.includes(dayOfWeek))
        return false;
    if (currentHour < workStartHour || currentHour >= workEndHour)
        return false;
    return true;
};
ManagerConfigEjeSchema.statics.markManagerRunning = async function (isRunning) {
    await this.findOneAndUpdate({ name: 'eje-manager' }, {
        $set: {
            'currentState.isRunning': isRunning,
            'currentState.lastCycleAt': new Date()
        }
    }, { upsert: true });
};
// ========== EXPORT ==========
exports.ManagerConfigEje = mongoose_1.default.model('ManagerConfigEje', ManagerConfigEjeSchema);
exports.default = exports.ManagerConfigEje;
//# sourceMappingURL=manager-config-eje.js.map