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
exports.ConfiguracionEje = void 0;
/**
 * Modelo ConfiguracionEje
 * Configuración de workers para el sistema EJE
 */
const mongoose_1 = __importStar(require("mongoose"));
// ========== SCHEMAS ==========
const ScheduleSchema = new mongoose_1.Schema({
    cronExpression: { type: String, default: '*/30 * * * *' },
    workStartHour: { type: Number, default: 8, min: 0, max: 23 },
    workEndHour: { type: Number, default: 22, min: 0, max: 23 },
    workDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
    respectWorkingHours: { type: Boolean, default: true }
}, { _id: false });
const WorkerConfigSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: true },
    batchSize: { type: Number, default: 10 },
    delayBetweenRequests: { type: Number, default: 2000 },
    maxRetries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 5000 }
}, { _id: false });
const StatsSchema = new mongoose_1.Schema({
    documentsProcessed: { type: Number, default: 0 },
    documentsSuccess: { type: Number, default: 0 },
    documentsError: { type: Number, default: 0 },
    movimientosExtracted: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
}, { _id: false });
const StateSchema = new mongoose_1.Schema({
    isRunning: { type: Boolean, default: false },
    lastCycleAt: { type: Date },
    cycleCount: { type: Number, default: 0 },
    lastError: {
        message: { type: String },
        timestamp: { type: Date },
        documentId: { type: mongoose_1.Schema.Types.ObjectId }
    }
}, { _id: false });
const DailyStatSchema = new mongoose_1.Schema({
    date: { type: Date, required: true },
    totalEligible: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    movimientosExtracted: { type: Number, default: 0 },
    cyclesRun: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
// ========== SCHEMA PRINCIPAL ==========
const ConfiguracionEjeSchema = new mongoose_1.Schema({
    workerId: {
        type: String,
        required: true,
        default: 'eje_main',
        unique: true
    },
    name: {
        type: String,
        default: 'eje-workers'
    },
    // Configuración global
    enabled: { type: Boolean, default: true },
    baseUrl: { type: String, default: 'https://eje.juscaba.gob.ar/iol-ui/p/inicio' },
    // Configuración por worker
    workers: {
        verification: { type: WorkerConfigSchema, default: () => ({}) },
        update: { type: WorkerConfigSchema, default: () => ({}) },
        stuck: { type: WorkerConfigSchema, default: () => ({}) }
    },
    // Horario
    schedule: { type: ScheduleSchema, default: () => ({}) },
    // Rate limiting
    rateLimiting: {
        enabled: { type: Boolean, default: true },
        requestsPerMinute: { type: Number, default: 20 },
        requestsPerHour: { type: Number, default: 500 }
    },
    // Estadísticas
    stats: { type: StatsSchema, default: () => ({}) },
    // Estado
    state: { type: StateSchema, default: () => ({}) },
    // Estadísticas diarias
    dailyStats: { type: [DailyStatSchema], default: [] }
}, {
    timestamps: true,
    collection: 'configuracion-eje'
});
// ========== MÉTODOS ESTÁTICOS ==========
ConfiguracionEjeSchema.statics.getOrCreate = async function (workerId = 'eje_main') {
    let config = await this.findOne({ workerId });
    if (!config) {
        config = await this.create({ workerId });
    }
    return config;
};
ConfiguracionEjeSchema.statics.getConfig = async function () {
    return this.findOne({ workerId: 'eje_main' }).lean();
};
ConfiguracionEjeSchema.statics.updateConfig = async function (updates) {
    return this.findOneAndUpdate({ workerId: 'eje_main' }, { $set: { ...updates, updatedAt: new Date() } }, { upsert: true, new: true });
};
ConfiguracionEjeSchema.statics.isWithinWorkingHours = async function () {
    const config = await this.findOne({ workerId: 'eje_main' }).lean();
    if (!config)
        return false;
    if (!config.schedule?.respectWorkingHours)
        return true;
    const now = new Date();
    const options = {
        timeZone: config.schedule.timezone || 'America/Argentina/Buenos_Aires'
    };
    const localTimeStr = now.toLocaleString('en-US', options);
    const localTime = new Date(localTimeStr);
    const currentHour = localTime.getHours();
    const currentDay = localTime.getDay();
    const { workStartHour, workEndHour, workDays } = config.schedule;
    if (!workDays.includes(currentDay))
        return false;
    if (currentHour < workStartHour || currentHour >= workEndHour)
        return false;
    return true;
};
ConfiguracionEjeSchema.statics.logSuccess = async function (movimientosCount = 0) {
    return this.findOneAndUpdate({ workerId: 'eje_main' }, {
        $inc: {
            'stats.documentsProcessed': 1,
            'stats.documentsSuccess': 1,
            'stats.movimientosExtracted': movimientosCount
        },
        $set: {
            'state.lastCycleAt': new Date()
        }
    });
};
ConfiguracionEjeSchema.statics.logError = async function (error, documentId) {
    return this.findOneAndUpdate({ workerId: 'eje_main' }, {
        $inc: {
            'stats.documentsProcessed': 1,
            'stats.documentsError': 1
        },
        $set: {
            'state.lastError': {
                message: error.message,
                timestamp: new Date(),
                documentId
            }
        }
    });
};
// ========== EXPORT ==========
exports.ConfiguracionEje = mongoose_1.default.model('ConfiguracionEje', ConfiguracionEjeSchema);
exports.default = exports.ConfiguracionEje;
//# sourceMappingURL=configuracion-eje.js.map