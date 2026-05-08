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
exports.EjePendingSelectionNotification = void 0;
/**
 * Modelo EjePendingSelectionNotification
 *
 * Buffer de eventos pending_selection generados por el verification-worker EJE.
 * Un worker dedicado (pending-selection-flusher) corre cada 60s, agrupa los
 * eventos pendientes por usuario y envía un único email digest.
 *
 * Flujo:
 *   1. verification-worker detecta múltiples coincidencias y crea/actualiza un
 *      doc por cada folder afectado con notifiedAt=null.
 *   2. flusher reclama todos los pendientes de un userId con un lock atómico,
 *      revalida que sigan en pending_selection (skip si el usuario ya resolvió),
 *      arma el digest y envía un solo email.
 *   3. Tras envío exitoso marca notifiedAt=now y guarda emailLogId.
 *   4. Si SES falla, libera el lock y se reintenta en el próximo ciclo.
 *
 * Cluster-safe: el lock por (lockedBy, lockedAt) impide que dos instancias del
 * flusher (improbable pero posible) procesen el mismo userId en paralelo.
 *
 * Una sola notificación por evento: si el usuario no actúa, no insistimos.
 * Re-recordatorios quedarían como mejora futura.
 */
const mongoose_1 = __importStar(require("mongoose"));
// ========== SCHEMA ==========
const PendingCandidateSchema = new mongoose_1.Schema({
    cuij: { type: String, required: true },
    caratula: { type: String },
    estado: { type: String },
    fechaInicio: { type: String }
}, { _id: false });
const EjePendingSelectionNotificationSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Folder', required: true },
    pivotCausaId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CausasEje', required: true },
    searchTerm: { type: String, required: true },
    resultsCount: { type: Number, required: true, min: 2 },
    candidates: { type: [PendingCandidateSchema], default: [] },
    lockedBy: { type: String, default: null },
    lockedAt: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
    emailLogId: { type: mongoose_1.Schema.Types.ObjectId, default: null },
    skipped: { type: Boolean, default: false },
    skippedReason: { type: String, default: null }
}, {
    timestamps: true,
    collection: 'ejependingselectionnotifications'
});
// Índice principal: query del flusher (pendientes por usuario)
EjePendingSelectionNotificationSchema.index({ userId: 1, notifiedAt: 1 });
// Único parcial: un solo "pendiente sin notificar" por folder. Si el worker
// re-procesa un pivote (raro pero posible), el upsert actualiza el doc en
// lugar de duplicar.
EjePendingSelectionNotificationSchema.index({ folderId: 1 }, {
    unique: true,
    partialFilterExpression: { notifiedAt: null }
});
// Cobertura para cleanup eventual
EjePendingSelectionNotificationSchema.index({ notifiedAt: 1, createdAt: -1 });
// ========== STATICS ==========
EjePendingSelectionNotificationSchema.statics.enqueueForFolder = async function (params) {
    // Cap a 5 candidatos en el snapshot (suficiente para el digest)
    const candidates = params.candidates.slice(0, 5).map((c) => ({
        cuij: c.cuij,
        caratula: c.caratula,
        estado: c.estado,
        fechaInicio: c.fechaInicio
    }));
    // Upsert sobre folderId (con notifiedAt=null por el partial unique).
    // Si ya existe pendiente, actualiza snapshot al estado más reciente.
    const result = await this.findOneAndUpdate({ folderId: params.folderId, notifiedAt: null }, {
        $set: {
            userId: params.userId,
            pivotCausaId: params.pivotCausaId,
            searchTerm: params.searchTerm,
            resultsCount: params.resultsCount,
            candidates
        },
        $setOnInsert: {
            notifiedAt: null,
            skipped: false
        }
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return result;
};
EjePendingSelectionNotificationSchema.statics.listPendingUserIds = async function (limit = 50, lockTtlMs = 5 * 60 * 1000) {
    const lockExpiredBefore = new Date(Date.now() - lockTtlMs);
    const userIds = await this.aggregate([
        {
            $match: {
                notifiedAt: null,
                $or: [
                    { lockedBy: null },
                    { lockedAt: { $lt: lockExpiredBefore } }
                ]
            }
        },
        { $group: { _id: '$userId' } },
        { $limit: limit }
    ]);
    return userIds.map((doc) => doc._id);
};
EjePendingSelectionNotificationSchema.statics.claimUserPendings = async function (userId, workerId, lockTtlMs = 5 * 60 * 1000) {
    const lockExpiredBefore = new Date(Date.now() - lockTtlMs);
    const now = new Date();
    // Reclamar todos los pendientes de este userId
    await this.updateMany({
        userId,
        notifiedAt: null,
        $or: [
            { lockedBy: null },
            { lockedAt: { $lt: lockExpiredBefore } }
        ]
    }, {
        $set: { lockedBy: workerId, lockedAt: now }
    });
    // Devolver los docs ya lockeados por este worker
    return this.find({ userId, notifiedAt: null, lockedBy: workerId }).lean();
};
EjePendingSelectionNotificationSchema.statics.markNotified = async function (userId, workerId, emailLogId) {
    const result = await this.updateMany({ userId, lockedBy: workerId, notifiedAt: null }, {
        $set: {
            notifiedAt: new Date(),
            emailLogId,
            lockedBy: null,
            lockedAt: null
        }
    });
    return result.modifiedCount;
};
EjePendingSelectionNotificationSchema.statics.releaseLock = async function (userId, workerId) {
    const result = await this.updateMany({ userId, lockedBy: workerId, notifiedAt: null }, { $set: { lockedBy: null, lockedAt: null } });
    return result.modifiedCount;
};
EjePendingSelectionNotificationSchema.statics.markSkipped = async function (notificationId, reason) {
    await this.updateOne({ _id: notificationId }, {
        $set: {
            notifiedAt: new Date(),
            skipped: true,
            skippedReason: reason,
            lockedBy: null,
            lockedAt: null
        }
    });
};
// ========== MODELO ==========
exports.EjePendingSelectionNotification = mongoose_1.default.models.EjePendingSelectionNotification ||
    mongoose_1.default.model('EjePendingSelectionNotification', EjePendingSelectionNotificationSchema);
exports.default = exports.EjePendingSelectionNotification;
//# sourceMappingURL=eje-pending-selection-notification.js.map