/**
 * Modelo Folder mínimo para eje-workers
 * Solo incluye los campos necesarios para actualización por el verification-worker
 *
 * IMPORTANTE: Este modelo usa la colección 'folders' existente de law-analytics-server.
 * No crear índices ni modificar la estructura - solo lectura/escritura de campos específicos.
 */
import mongoose, { Schema, Model } from 'mongoose';

// ========== INTERFACES ==========

/**
 * Interface para los campos que necesitamos del Folder
 * No extendemos Document para evitar conflictos con métodos de Mongoose
 */
export interface IFolderEjeFields {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  folderName?: string;

  // Campos de jurisdicción
  folderJuris?: {
    label?: string;
    item?: string;
  };

  // Campos de expediente judicial
  judFolder?: {
    numberJudFolder?: string;
    courtNumber?: string;
  };

  // Flags de plataforma
  pjn: boolean;
  mev: boolean;
  eje: boolean;

  // Referencia a causa
  causaId?: mongoose.Types.ObjectId;
  causaType?: 'CausasCivil' | 'CausasTrabajo' | 'CausasSegSocial' | 'CausasComercial' | 'MEV' | 'CausasEje';

  // Estado de la causa asociada
  causaVerified: boolean;
  causaIsValid?: boolean | null;
  causaUpdateEnabled: boolean;
  causaAssociationStatus: 'pending' | 'pending_selection' | 'success' | 'failed' | 'not_attempted';
  causaAssociationError?: string;
  causaLastSyncDate?: Date;

  // Campos para selección múltiple
  pendingCausaIds: mongoose.Types.ObjectId[];
  pendingCausaType?: 'CausasEje' | 'MEV';
  searchTerm?: string;

  // Campo overwrite para control de actualización
  overwrite?: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ========== SCHEMA ==========

/**
 * Schema mínimo - NO crear la colección, usar la existente
 * Solo definimos los campos que necesitamos leer/escribir
 */
const FolderEjeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
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

  causaId: { type: Schema.Types.ObjectId, refPath: 'causaType' },
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

  pendingCausaIds: [{ type: Schema.Types.ObjectId, refPath: 'pendingCausaType' }],
  pendingCausaType: { type: String, enum: ['CausasEje', 'MEV'] },
  searchTerm: { type: String },

  overwrite: { type: Boolean },

  causaAssociationHistory: [{
    status: { type: String, enum: ['pending', 'pending_selection', 'success', 'failed', 'not_attempted'] },
    timestamp: { type: Date, default: Date.now },
    source: { type: String, enum: ['user', 'worker', 'api', 'system'] },
    details: { type: String },
    causaId: { type: Schema.Types.ObjectId },
    searchTerm: { type: String }
  }]
}, {
  timestamps: true,
  collection: 'folders',  // Usar colección existente
  strict: false           // Permitir campos no definidos (el modelo original tiene más campos)
});

// ========== MODELO ==========

// Verificar si el modelo ya existe para evitar errores en hot-reload
export const FolderEje: Model<IFolderEjeFields> = mongoose.models.FolderEje || mongoose.model<IFolderEjeFields>('FolderEje', FolderEjeSchema);

export default FolderEje;
