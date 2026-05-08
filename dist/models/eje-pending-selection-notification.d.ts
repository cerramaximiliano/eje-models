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
import mongoose, { Document, Model } from 'mongoose';
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
    lockedBy?: string | null;
    lockedAt?: Date | null;
    notifiedAt?: Date | null;
    emailLogId?: mongoose.Types.ObjectId | null;
    skipped?: boolean;
    skippedReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface IEjePendingSelectionNotificationModel extends Model<IEjePendingSelectionNotification> {
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
    claimUserPendings(userId: mongoose.Types.ObjectId | string, workerId: string, lockTtlMs?: number): Promise<IEjePendingSelectionNotification[]>;
    /**
     * Marca como notificados los items reclamados por este worker para un userId.
     */
    markNotified(userId: mongoose.Types.ObjectId | string, workerId: string, emailLogId: mongoose.Types.ObjectId | null): Promise<number>;
    /**
     * Libera el lock para que el próximo ciclo reintente.
     */
    releaseLock(userId: mongoose.Types.ObjectId | string, workerId: string): Promise<number>;
    /**
     * Marca un item como skipped (ej: el folder ya no está en pending_selection).
     */
    markSkipped(notificationId: mongoose.Types.ObjectId | string, reason: string): Promise<void>;
}
export declare const EjePendingSelectionNotification: IEjePendingSelectionNotificationModel;
export default EjePendingSelectionNotification;
//# sourceMappingURL=eje-pending-selection-notification.d.ts.map