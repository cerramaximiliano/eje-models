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

  // ========== ESTADO DE PROCESAMIENTO ==========
  source: 'app' | 'import' | 'scraping';
  verified: boolean;
  isValid: boolean;
  lastUpdate?: Date;

  // ========== CONTROL DE WORKERS ==========
  verifiedAt?: Date;
  detailsLoaded: boolean;
  detailsLastUpdate?: Date;
  lastError?: string;
  errorCount: number;
  stuckSince?: Date;

  // ========== VINCULACIÓN CON USUARIOS ==========
  // Los folders se vinculan por causaId desde la colección folders

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
  stuckSince: { type: Date }
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
