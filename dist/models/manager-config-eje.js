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
 * Configuración del manager de escalado para workers EJE
 * Similar a ManagerConfig de PJN pero adaptado para EJE
 */
const mongoose_1 = __importStar(require("mongoose"));
// ========== SCHEMAS ==========
const ManagerSettingsSchema = new mongoose_1.Schema({
    checkInterval: { type: Number, default: 60000 },
    lockTimeoutMinutes: { type: Number, default: 10 },
    maxWorkers: { type: Number, default: 2 },
    minWorkers: { type: Number, default: 0 },
    scaleUpThreshold: { type: Number, default: 100 },
    scaleDownThreshold: { type: Number, default: 10 },
    updateThresholdHours: { type: Number, default: 24 },
    cpuThreshold: { type: Number, default: 0.75 },
    memoryThreshold: { type: Number, default: 0.80 },
    workStartHour: { type: Number, default: 8 },
    workEndHour: { type: Number, default: 22 },
    workDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
    workerNames: {
        verification: { type: String, default: 'eje/verification-worker' },
        update: { type: String, default: 'eje/update-worker' },
        stuck: { type: String, default: 'eje/stuck-worker' }
    }
}, { _id: false });
const WorkerCountSchema = new mongoose_1.Schema({
    verification: { type: Number, default: 0 },
    update: { type: Number, default: 0 },
    stuck: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
}, { _id: false });
const PendingCountSchema = new mongoose_1.Schema({
    verification: { type: Number, default: 0 },
    update: { type: Number, default: 0 },
    stuck: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
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
    workers: { type: WorkerCountSchema, default: () => ({}) },
    pending: { type: PendingCountSchema, default: () => ({}) },
    optimalWorkers: { type: WorkerCountSchema, default: () => ({}) },
    systemResources: { type: SystemResourcesSchema, default: () => ({}) },
    lastScaleAction: {
        timestamp: { type: Date },
        workerType: { type: String },
        action: { type: String, enum: ['scale_up', 'scale_down'] },
        from: { type: Number },
        to: { type: Number },
        reason: { type: String }
    }
}, { _id: false });
const HistorySnapshotSchema = new mongoose_1.Schema({
    timestamp: { type: Date, default: Date.now },
    workers: { type: WorkerCountSchema, default: () => ({}) },
    pending: { type: PendingCountSchema, default: () => ({}) },
    systemResources: { type: SystemResourcesSchema, default: () => ({}) },
    scaleChanges: { type: Number, default: 0 }
}, { _id: false });
const AlertSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['high_cpu', 'high_memory', 'no_workers', 'high_pending', 'manager_stopped', 'stuck_documents'],
        required: true
    },
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
    totalEligible: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    movimientosFound: { type: Number, default: 0 },
    avgProcessingTime: { type: Number, default: 0 },
    peakPending: { type: Number, default: 0 },
    peakWorkers: { type: Number, default: 0 },
    cyclesRun: { type: Number, default: 0 }
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
    return this.findOne({ name: 'eje-manager' }).lean();
};
ManagerConfigEjeSchema.statics.updateConfig = async function (updates) {
    const updateObj = {};
    for (const [key, value] of Object.entries(updates)) {
        updateObj[`config.${key}`] = value;
    }
    return this.findOneAndUpdate({ name: 'eje-manager' }, { $set: updateObj }, { new: true, upsert: true });
};
ManagerConfigEjeSchema.statics.updateState = async function (state) {
    const updateObj = {};
    for (const [key, value] of Object.entries(state)) {
        updateObj[`currentState.${key}`] = value;
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
ManagerConfigEjeSchema.statics.updateDailyStats = async function (stats) {
    const today = new Date().toISOString().split('T')[0];
    // Buscar si ya existe el registro de hoy
    const config = await this.findOne({
        name: 'eje-manager',
        'dailyStats.date': today
    });
    if (config) {
        // Actualizar el registro existente
        const updateObj = {};
        for (const [key, value] of Object.entries(stats)) {
            if (key !== 'date') {
                if (['processed', 'success', 'errors', 'movimientosFound', 'cyclesRun'].includes(key)) {
                    updateObj[`dailyStats.$.${key}`] = { $add: [`$dailyStats.$.${key}`, value] };
                }
                else {
                    updateObj[`dailyStats.$.${key}`] = value;
                }
            }
        }
        await this.findOneAndUpdate({ name: 'eje-manager', 'dailyStats.date': today }, { $inc: stats });
    }
    else {
        // Crear nuevo registro
        const newStats = {
            date: today,
            totalEligible: 0,
            processed: 0,
            success: 0,
            errors: 0,
            movimientosFound: 0,
            avgProcessingTime: 0,
            peakPending: 0,
            peakWorkers: 0,
            cyclesRun: 0,
            ...stats
        };
        await this.findOneAndUpdate({ name: 'eje-manager' }, {
            $push: {
                dailyStats: {
                    $each: [newStats],
                    $slice: -30 // Mantener últimos 30 días
                }
            }
        });
    }
};
ManagerConfigEjeSchema.statics.isWithinWorkingHours = async function () {
    const config = await this.findOne({ name: 'eje-manager' }).lean();
    if (!config)
        return false;
    const { workStartHour, workEndHour, workDays, timezone } = config.config;
    const now = new Date();
    const options = {
        timeZone: timezone || 'America/Argentina/Buenos_Aires',
        hour: 'numeric',
        weekday: 'short'
    };
    const localTimeStr = now.toLocaleString('en-US', options);
    const localTime = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false });
    const currentHour = parseInt(formatter.format(now));
    const currentDay = now.getDay();
    if (!workDays.includes(currentDay))
        return false;
    if (currentHour < workStartHour || currentHour >= workEndHour)
        return false;
    return true;
};
// ========== EXPORT ==========
exports.ManagerConfigEje = mongoose_1.default.model('ManagerConfigEje', ManagerConfigEjeSchema);
exports.default = exports.ManagerConfigEje;
//# sourceMappingURL=manager-config-eje.js.map