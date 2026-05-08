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
import mongoose, { Schema, Document, Model } from 'mongoose';

// ========== INTERFACES ==========

export interface IPendingCandidate {
  cuij: string;
  caratula?: string;
  estado?: string;
  fechaInicio?: string;
}

export interface IEjePendingSelectionNotification extends Document {
  userId: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId;
  pivotCausaId: mongoose.Types.ObjectId;
  searchTerm: string;
  resultsCount: number;
  candidates: IPendingCandidate[];

  // Lock para coordinación cross-worker
  lockedBy?: string | null;
  lockedAt?: Date | null;

  // Estado de notificación
  notifiedAt?: Date | null;
  emailLogId?: mongoose.Types.ObjectId | null;
  skipped?: boolean;
  skippedReason?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface IEjePendingSelectionNotificationModel
  extends Model<IEjePendingSelectionNotification> {
  /**
   * Encola (upsert) un evento pending_selection para un folder.
   * Si ya existe un pendiente sin notificar para ese folder, actualiza el
   * snapshot (pivotCausaId, candidates, resultsCount) en lugar de duplicar.
   */
  enqueueForFolder(params: {
    userId: mongoose.Types.ObjectId | string;
    folderId: mongoose.Types.ObjectId | string;
    pivotCausaId: mongoose.Types.ObjectId | string;
    searchTerm: string;
    resultsCount: number;
    candidates: IPendingCandidate[];
  }): Promise<IEjePendingSelectionNotification | null>;

  /**
   * Lista los userIds distintos con pendientes sin reclamar (notifiedAt=null,
   * lock libre o expirado). Devuelve a lo sumo `limit` userIds.
   */
  listPendingUserIds(limit?: number, lockTtlMs?: number): Promise<mongoose.Types.ObjectId[]>;

  /**
   * Reclama atómicamente todos los pendientes sin notificar de un usuario.
   * Devuelve los docs lockeados. El caller debe liberar (markNotified o
   * unlock) antes del próximo ciclo.
   */
  claimUserPendings(
    userId: mongoose.Types.ObjectId | string,
    workerId: string,
    lockTtlMs?: number
  ): Promise<IEjePendingSelectionNotification[]>;

  /**
   * Marca como notificados los items reclamados por este worker para un userId.
   */
  markNotified(
    userId: mongoose.Types.ObjectId | string,
    workerId: string,
    emailLogId: mongoose.Types.ObjectId | null
  ): Promise<number>;

  /**
   * Libera el lock para que el próximo ciclo reintente.
   */
  releaseLock(
    userId: mongoose.Types.ObjectId | string,
    workerId: string
  ): Promise<number>;

  /**
   * Marca un item como skipped (ej: el folder ya no está en pending_selection).
   */
  markSkipped(
    notificationId: mongoose.Types.ObjectId | string,
    reason: string
  ): Promise<void>;
}

// ========== SCHEMA ==========

const PendingCandidateSchema = new Schema<IPendingCandidate>(
  {
    cuij: { type: String, required: true },
    caratula: { type: String },
    estado: { type: String },
    fechaInicio: { type: String }
  },
  { _id: false }
);

const EjePendingSelectionNotificationSchema = new Schema<IEjePendingSelectionNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', required: true },
    pivotCausaId: { type: Schema.Types.ObjectId, ref: 'CausasEje', required: true },
    searchTerm: { type: String, required: true },
    resultsCount: { type: Number, required: true, min: 2 },
    candidates: { type: [PendingCandidateSchema], default: [] },

    lockedBy: { type: String, default: null },
    lockedAt: { type: Date, default: null },

    notifiedAt: { type: Date, default: null },
    emailLogId: { type: Schema.Types.ObjectId, default: null },
    skipped: { type: Boolean, default: false },
    skippedReason: { type: String, default: null }
  },
  {
    timestamps: true,
    collection: 'ejependingselectionnotifications'
  }
);

// Índice principal: query del flusher (pendientes por usuario)
EjePendingSelectionNotificationSchema.index({ userId: 1, notifiedAt: 1 });

// Único parcial: un solo "pendiente sin notificar" por folder. Si el worker
// re-procesa un pivote (raro pero posible), el upsert actualiza el doc en
// lugar de duplicar.
EjePendingSelectionNotificationSchema.index(
  { folderId: 1 },
  {
    unique: true,
    partialFilterExpression: { notifiedAt: null }
  }
);

// Cobertura para cleanup eventual
EjePendingSelectionNotificationSchema.index({ notifiedAt: 1, createdAt: -1 });

// ========== STATICS ==========

EjePendingSelectionNotificationSchema.statics.enqueueForFolder = async function (
  params: {
    userId: mongoose.Types.ObjectId | string;
    folderId: mongoose.Types.ObjectId | string;
    pivotCausaId: mongoose.Types.ObjectId | string;
    searchTerm: string;
    resultsCount: number;
    candidates: IPendingCandidate[];
  }
): Promise<IEjePendingSelectionNotification | null> {
  // Cap a 5 candidatos en el snapshot (suficiente para el digest)
  const candidates = params.candidates.slice(0, 5).map((c) => ({
    cuij: c.cuij,
    caratula: c.caratula,
    estado: c.estado,
    fechaInicio: c.fechaInicio
  }));

  // Upsert sobre folderId (con notifiedAt=null por el partial unique).
  // Si ya existe pendiente, actualiza snapshot al estado más reciente.
  const result = await this.findOneAndUpdate(
    { folderId: params.folderId, notifiedAt: null },
    {
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
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return result;
};

EjePendingSelectionNotificationSchema.statics.listPendingUserIds = async function (
  limit = 50,
  lockTtlMs = 5 * 60 * 1000
): Promise<mongoose.Types.ObjectId[]> {
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
  return userIds.map((doc: { _id: mongoose.Types.ObjectId }) => doc._id);
};

EjePendingSelectionNotificationSchema.statics.claimUserPendings = async function (
  userId: mongoose.Types.ObjectId | string,
  workerId: string,
  lockTtlMs = 5 * 60 * 1000
): Promise<IEjePendingSelectionNotification[]> {
  const lockExpiredBefore = new Date(Date.now() - lockTtlMs);
  const now = new Date();

  // Reclamar todos los pendientes de este userId
  await this.updateMany(
    {
      userId,
      notifiedAt: null,
      $or: [
        { lockedBy: null },
        { lockedAt: { $lt: lockExpiredBefore } }
      ]
    },
    {
      $set: { lockedBy: workerId, lockedAt: now }
    }
  );

  // Devolver los docs ya lockeados por este worker
  return this.find({ userId, notifiedAt: null, lockedBy: workerId }).lean() as unknown as Promise<
    IEjePendingSelectionNotification[]
  >;
};

EjePendingSelectionNotificationSchema.statics.markNotified = async function (
  userId: mongoose.Types.ObjectId | string,
  workerId: string,
  emailLogId: mongoose.Types.ObjectId | null
): Promise<number> {
  const result = await this.updateMany(
    { userId, lockedBy: workerId, notifiedAt: null },
    {
      $set: {
        notifiedAt: new Date(),
        emailLogId,
        lockedBy: null,
        lockedAt: null
      }
    }
  );
  return result.modifiedCount;
};

EjePendingSelectionNotificationSchema.statics.releaseLock = async function (
  userId: mongoose.Types.ObjectId | string,
  workerId: string
): Promise<number> {
  const result = await this.updateMany(
    { userId, lockedBy: workerId, notifiedAt: null },
    { $set: { lockedBy: null, lockedAt: null } }
  );
  return result.modifiedCount;
};

EjePendingSelectionNotificationSchema.statics.markSkipped = async function (
  notificationId: mongoose.Types.ObjectId | string,
  reason: string
): Promise<void> {
  await this.updateOne(
    { _id: notificationId },
    {
      $set: {
        notifiedAt: new Date(),
        skipped: true,
        skippedReason: reason,
        lockedBy: null,
        lockedAt: null
      }
    }
  );
};

// ========== MODELO ==========

export const EjePendingSelectionNotification: IEjePendingSelectionNotificationModel =
  (mongoose.models.EjePendingSelectionNotification as IEjePendingSelectionNotificationModel) ||
  mongoose.model<IEjePendingSelectionNotification, IEjePendingSelectionNotificationModel>(
    'EjePendingSelectionNotification',
    EjePendingSelectionNotificationSchema
  );

export default EjePendingSelectionNotification;
