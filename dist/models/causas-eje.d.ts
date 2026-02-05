/**
 * Modelo CausasEje
 * Causas del sistema EJE (Expediente Judicial Electrónico)
 * Poder Judicial de la Ciudad de Buenos Aires - Fuero Contencioso Administrativo
 */
import mongoose, { Document } from 'mongoose';
export interface IMovimiento {
    fecha: Date;
    tipo: string;
    descripcion: string;
    detalle?: string;
    firmante?: string;
    numero?: string;
}
export interface IInterviniente {
    tipo: string;
    nombre: string;
    representante?: string;
}
export interface ICausaRelacionada {
    cuij: string;
    caratula?: string;
    relacion: string;
}
export interface IUserUpdateEnabled {
    userId: mongoose.Types.ObjectId;
    enabled: boolean;
}
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
export interface IUpdateStatsToday {
    date: string;
    count: number;
    hours: number[];
}
export interface IUpdateStats {
    avgMs: number;
    count: number;
    errors: number;
    newMovs: number;
    today?: IUpdateStatsToday;
    last?: Date;
}
export interface ICausasEje extends Document {
    cuij: string;
    numero: number;
    anio: number;
    caratula: string;
    objeto?: string;
    monto?: number;
    montoMoneda?: string;
    fechaInicio?: Date;
    juzgado?: string;
    sala?: string;
    tribunalSuperior?: string;
    ubicacionActual?: string;
    movimientos: IMovimiento[];
    movimientosCount: number;
    ultimoMovimiento?: Date;
    intervinientes: IInterviniente[];
    causasRelacionadas: ICausaRelacionada[];
    estado?: string;
    isPrivate: boolean;
    source: 'app' | 'import' | 'scraping';
    verified: boolean;
    isValid: boolean;
    lastUpdate?: Date;
    verifiedAt?: Date;
    detailsLoaded: boolean;
    detailsLastUpdate?: Date;
    lastError?: string;
    errorCount: number;
    stuckSince?: Date;
    lockedBy?: string;
    lockedAt?: Date;
    folderIds: mongoose.Types.ObjectId[];
    userCausaIds: mongoose.Types.ObjectId[];
    userUpdatesEnabled: IUserUpdateEnabled[];
    update: boolean;
    updateHistory: IUpdateHistoryEntry[];
    updateStats?: IUpdateStats;
    createdAt: Date;
    updatedAt: Date;
}
export declare const CausasEje: mongoose.Model<ICausasEje, {}, {}, {}, mongoose.Document<unknown, {}, ICausasEje, {}, {}> & ICausasEje & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default CausasEje;
//# sourceMappingURL=causas-eje.d.ts.map