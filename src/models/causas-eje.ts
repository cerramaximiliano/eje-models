/**
 * Modelo CausasEje
 * Causas del sistema EJE (Expediente Judicial Electrónico)
 * Poder Judicial de la Ciudad de Buenos Aires - Fuero Contencioso Administrativo
 */
import mongoose, { Schema, Document } from 'mongoose';

// ========== INTERFACES ==========

export interface IMovimiento {
  fecha: Date;
  tipo: string;
  descripcion: string;
  detalle?: string;
  firmante?: string;
  numero?: string;         // Número de actuación (ej: "19841413/2025")
}

export interface IInterviniente {
  tipo: string;           // Actor, Demandado, Letrado, Tercero, etc.
  nombre: string;
  representante?: string; // Ej: "MANDATARIO (AGIP): JUAN MARTIN, CAGNI FAZZIO"
}

export interface ICausaRelacionada {
  cuij: string;
  caratula?: string;
  relacion: string;       // Acumulada, Conexa, Principal, etc.
}

// Interface para control de actualizaciones por usuario
export interface IUserUpdateEnabled {
  userId: mongoose.Types.ObjectId;
  enabled: boolean;
}

// Interface para historial de actualizaciones
export interface IUpdateHistoryEntry {
  timestamp: Date;
  source: string;
  updateType: 'link' | 'unlink' | 'update' | 'verify' | 'scrape';
  success: boolean;
  movimientosAdded: number;
  movimientosTotal: number;
  details?: {
    message?: string;
    folderId?: string;
    userId?: string;
    searchTerm?: string;
    error?: string;
  };
}

export interface ICausasEje extends Document {
  // ========== IDENTIFICACIÓN ==========
  cuij: string;                     // Código Único de Identificación Judicial
  numero: number;
  anio: number;

  // ========== DATOS DEL EXPEDIENTE ==========
  caratula: string;
  objeto?: string;
  monto?: number;
  montoMoneda?: string;
  fechaInicio?: Date;

  // ========== UBICACIÓN JUDICIAL ==========
  juzgado?: string;
  sala?: string;                    // Segunda instancia
  tribunalSuperior?: string;
  ubicacionActual?: string;

  // ========== MOVIMIENTOS ==========
  movimientos: IMovimiento[];
  movimientosCount: number;
  ultimoMovimiento?: Date;

  // ========== INTERVINIENTES ==========
  intervinientes: IInterviniente[];

  // ========== CAUSAS RELACIONADAS ==========
  causasRelacionadas: ICausaRelacionada[];

  // ========== ESTADO DEL EXPEDIENTE ==========
  estado?: string;            // "EN LETRA", etc. (del badge en resultados)
  isPrivate: boolean;         // true si tiene candado (expediente privado)

  // ========== ESTADO DE PROCESAMIENTO ==========
  source: 'app' | 'import' | 'scraping';
  verified: boolean;          // true = se verificó si existe
  isValid: boolean;           // true = existe, false = no existe
  lastUpdate?: Date;

  // ========== CONTROL DE WORKERS ==========
  verifiedAt?: Date;
  detailsLoaded: boolean;
  detailsLastUpdate?: Date;
  lastError?: string;
  errorCount: number;
  stuckSince?: Date;

  // Bloqueo para escalamiento de workers (evita colisiones)
  lockedBy?: string;              // ID del worker que bloqueó el documento
  lockedAt?: Date;                // Cuándo fue bloqueado

  // ========== VINCULACIÓN CON FOLDERS Y USUARIOS ==========
  folderIds: mongoose.Types.ObjectId[];       // Folders que referencian esta causa
  userCausaIds: mongoose.Types.ObjectId[];    // Usuarios que tienen esta causa
  userUpdatesEnabled: IUserUpdateEnabled[];   // Control de actualizaciones por usuario
  update: boolean;                            // Si al menos un usuario requiere actualizaciones
  updateHistory: IUpdateHistoryEntry[];       // Historial de operaciones

  // ========== TIMESTAMPS ==========
  createdAt: Date;
  updatedAt: Date;
}

// ========== SCHEMAS ==========

const MovimientoSchema = new Schema<IMovimiento>({
  fecha: { type: Date, required: true },
  tipo: { type: String, required: true },
  descripcion: { type: String, required: true },
  detalle: { type: String },
  firmante: { type: String },
  numero: { type: String }
}, { _id: false });

const IntervinienteSchema = new Schema<IInterviniente>({
  tipo: { type: String, required: true },
  nombre: { type: String, required: true },
  representante: { type: String }
}, { _id: false });

const CausaRelacionadaSchema = new Schema<ICausaRelacionada>({
  cuij: { type: String, required: true },
  caratula: { type: String },
  relacion: { type: String, required: true }
}, { _id: false });

const UserUpdateEnabledSchema = new Schema<IUserUpdateEnabled>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const UpdateHistoryEntrySchema = new Schema<IUpdateHistoryEntry>({
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

const CausasEjeSchema = new Schema<ICausasEje>({
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
  estado: { type: String },              // "EN LETRA", etc.
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
  folderIds: [{ type: Schema.Types.ObjectId, ref: 'Folder' }],
  userCausaIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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

CausasEjeSchema.statics.findByCuij = function(cuij: string) {
  return this.findOne({ cuij });
};

CausasEjeSchema.statics.findByNumeroAnio = function(numero: number, anio: number) {
  return this.findOne({ numero, anio });
};

CausasEjeSchema.statics.findPendingVerification = function(limit: number = 10) {
  return this.find({
    verified: false,
    isValid: true,
    errorCount: { $lt: 3 }
  })
  .sort({ createdAt: 1 })
  .limit(limit);
};

CausasEjeSchema.statics.findPendingUpdate = function(limit: number = 10) {
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

CausasEjeSchema.statics.findStuckDocuments = function(stuckAfterHours: number = 24) {
  const cutoffDate = new Date(Date.now() - stuckAfterHours * 60 * 60 * 1000);
  return this.find({
    verified: true,
    isValid: true,
    stuckSince: { $lt: cutoffDate }
  });
};

// ========== EXPORT ==========

export const CausasEje = mongoose.model<ICausasEje>('CausasEje', CausasEjeSchema);
export default CausasEje;
