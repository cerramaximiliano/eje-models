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
exports.FolderEje = void 0;
/**
 * Modelo Folder mínimo para eje-workers
 * Solo incluye los campos necesarios para actualización por el verification-worker
 *
 * IMPORTANTE: Este modelo usa la colección 'folders' existente de law-analytics-server.
 * No crear índices ni modificar la estructura - solo lectura/escritura de campos específicos.
 */
const mongoose_1 = __importStar(require("mongoose"));
// ========== SCHEMA ==========
/**
 * Schema mínimo - NO crear la colección, usar la existente
 * Solo definimos los campos que necesitamos leer/escribir
 */
const FolderEjeSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    folderName: { type: String },
    folderJuris: {
        label: { type: String },
        item: { type: String }
    },
    judFolder: {
        numberJudFolder: { type: String },
        courtNumber: { type: String }
    },
    pjn: { type: Boolean, default: false },
    mev: { type: Boolean, default: false },
    eje: { type: Boolean, default: false },
    causaId: { type: mongoose_1.Schema.Types.ObjectId, refPath: 'causaType' },
    causaType: {
        type: String,
        enum: ['CausasCivil', 'CausasTrabajo', 'CausasSegSocial', 'CausasComercial', 'MEV', 'CausasEje']
    },
    causaVerified: { type: Boolean, default: false },
    causaIsValid: { type: Boolean },
    causaUpdateEnabled: { type: Boolean, default: false },
    causaAssociationStatus: {
        type: String,
        enum: ['pending', 'pending_selection', 'success', 'failed', 'not_attempted'],
        default: 'not_attempted'
    },
    causaAssociationError: { type: String },
    causaLastSyncDate: { type: Date },
    pendingCausaIds: [{ type: mongoose_1.Schema.Types.ObjectId, refPath: 'pendingCausaType' }],
    pendingCausaType: { type: String, enum: ['CausasEje', 'MEV'] },
    searchTerm: { type: String },
    overwrite: { type: Boolean }
}, {
    timestamps: true,
    collection: 'folders', // Usar colección existente
    strict: false // Permitir campos no definidos (el modelo original tiene más campos)
});
// ========== MODELO ==========
// Verificar si el modelo ya existe para evitar errores en hot-reload
exports.FolderEje = mongoose_1.default.models.FolderEje || mongoose_1.default.model('FolderEje', FolderEjeSchema);
exports.default = exports.FolderEje;
//# sourceMappingURL=folder.js.map