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
exports.CausasEje = void 0;
/**
 * Modelo CausasEje
 * Causas del sistema EJE (Expediente Judicial Electrónico)
 * Poder Judicial de la Ciudad de Buenos Aires - Fuero Contencioso Administrativo
 */
const mongoose_1 = __importStar(require("mongoose"));
// ========== SCHEMAS ==========
const MovimientoSchema = new mongoose_1.Schema({
    fecha: { type: Date, required: true },
    tipo: { type: String, required: true },
    descripcion: { type: String, required: true },
    detalle: { type: String },
    firmante: { type: String },
    numero: { type: String }
}, { _id: false });
const IntervinienteSchema = new mongoose_1.Schema({
    tipo: { type: String, required: true },
    nombre: { type: String, required: true },
    representante: { type: String }
}, { _id: false });
const CausaRelacionadaSchema = new mongoose_1.Schema({
    cuij: { type: String, required: true },
    caratula: { type: String },
    relacion: { type: String, required: true }
}, { _id: false });
const UserUpdateEnabledSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    enabled: { type: Boolean, default: true }
}, { _id: false });
const UpdateHistoryEntrySchema = new mongoose_1.Schema({
    timestamp: { type: Date, default: Date.now },
    source: { type: String, required: true },
    updateType: {
        type: String,
        enum: ['link', 'unlink', 'update', 'verify', 'scrape'],
        required: true
    },
    success: { type: Boolean, required: true },
    movimientosAdded: { type: Number, default: 0 },
    movimientosTotal: { type: Number, default: 0 },
    details: {
        message: { type: String },
        folderId: { type: String },
        userId: { type: String },
        searchTerm: { type: String },
        error: { type: String }
    }
}, { _id: false });
// ========== SCHEMA PRINCIPAL ==========
const CausasEjeSchema = new mongoose_1.Schema({
    // Identificación
    cuij: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    numero: { type: Number, required: true },
    anio: { type: Number, required: true },
    // Datos del expediente
    caratula: { type: String, required: true },
    objeto: { type: String },
    monto: { type: Number },
    montoMoneda: { type: String, default: 'ARS' },
    fechaInicio: { type: Date },
    // Ubicación judicial
    juzgado: { type: String },
    sala: { type: String },
    tribunalSuperior: { type: String },
    ubicacionActual: { type: String },
    // Movimientos
    movimientos: { type: [MovimientoSchema], default: [] },
    movimientosCount: { type: Number, default: 0 },
    ultimoMovimiento: { type: Date },
    // Intervinientes
    intervinientes: { type: [IntervinienteSchema], default: [] },
    // Causas relacionadas
    causasRelacionadas: { type: [CausaRelacionadaSchema], default: [] },
    // Estado del expediente
    estado: { type: String }, // "EN LETRA", etc.
    isPrivate: { type: Boolean, default: false },
    // Estado de procesamiento
    source: {
        type: String,
        enum: ['app', 'import', 'scraping'],
        default: 'app'
    },
    verified: { type: Boolean, default: false },
    isValid: { type: Boolean, default: true },
    lastUpdate: { type: Date },
    // Control de workers
    verifiedAt: { type: Date },
    detailsLoaded: { type: Boolean, default: false },
    detailsLastUpdate: { type: Date },
    lastError: { type: String },
    errorCount: { type: Number, default: 0 },
    stuckSince: { type: Date },
    // Bloqueo para escalamiento de workers
    lockedBy: { type: String },
    lockedAt: { type: Date },
    // Vinculación con folders y usuarios
    folderIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Folder' }],
    userCausaIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    userUpdatesEnabled: { type: [UserUpdateEnabledSchema], default: [] },
    update: { type: Boolean, default: false },
    updateHistory: { type: [UpdateHistoryEntrySchema], default: [] }
}, {
    timestamps: true,
    collection: 'causas-eje'
});
// ========== ÍNDICES ==========
// Índice compuesto para búsqueda por número/año
CausasEjeSchema.index({ numero: 1, anio: 1 });
// Índices para workers
CausasEjeSchema.index({ verified: 1, isValid: 1 });
CausasEjeSchema.index({ detailsLoaded: 1, verified: 1 });
CausasEjeSchema.index({ lastUpdate: -1 });
CausasEjeSchema.index({ stuckSince: 1 });
CausasEjeSchema.index({ errorCount: 1 });
// Índice para búsqueda por carátula
CausasEjeSchema.index({ caratula: 'text' });
// Índices para vinculación con folders y usuarios
CausasEjeSchema.index({ folderIds: 1 });
CausasEjeSchema.index({ userCausaIds: 1 });
CausasEjeSchema.index({ update: 1 });
// ========== MÉTODOS ESTÁTICOS ==========
CausasEjeSchema.statics.findByCuij = function (cuij) {
    return this.findOne({ cuij });
};
CausasEjeSchema.statics.findByNumeroAnio = function (numero, anio) {
    return this.findOne({ numero, anio });
};
CausasEjeSchema.statics.findPendingVerification = function (limit = 10) {
    return this.find({
        verified: false,
        isValid: true,
        errorCount: { $lt: 3 }
    })
        .sort({ createdAt: 1 })
        .limit(limit);
};
CausasEjeSchema.statics.findPendingUpdate = function (limit = 10) {
    return this.find({
        verified: true,
        isValid: true,
        $or: [
            { detailsLoaded: false },
            { detailsLoaded: { $exists: false } }
        ]
    })
        .sort({ lastUpdate: -1 })
        .limit(limit);
};
CausasEjeSchema.statics.findStuckDocuments = function (stuckAfterHours = 24) {
    const cutoffDate = new Date(Date.now() - stuckAfterHours * 60 * 60 * 1000);
    return this.find({
        verified: true,
        isValid: true,
        stuckSince: { $lt: cutoffDate }
    });
};
// ========== EXPORT ==========
exports.CausasEje = mongoose_1.default.model('CausasEje', CausasEjeSchema);
exports.default = exports.CausasEje;
//# sourceMappingURL=causas-eje.js.map