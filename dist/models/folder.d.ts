/**
 * Modelo Folder mínimo para eje-workers
 * Solo incluye los campos necesarios para actualización por el verification-worker
 *
 * IMPORTANTE: Este modelo usa la colección 'folders' existente de law-analytics-server.
 * No crear índices ni modificar la estructura - solo lectura/escritura de campos específicos.
 */
import mongoose, { Model } from 'mongoose';
/**
 * Interface para los campos que necesitamos del Folder
 * No extendemos Document para evitar conflictos con métodos de Mongoose
 */
export interface IFolderEjeFields {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    folderName?: string;
    folderJuris?: {
        label?: string;
        item?: string;
    };
    judFolder?: {
        numberJudFolder?: string;
        courtNumber?: string;
    };
    pjn: boolean;
    mev: boolean;
    eje: boolean;
    causaId?: mongoose.Types.ObjectId;
    causaType?: 'CausasCivil' | 'CausasTrabajo' | 'CausasSegSocial' | 'CausasComercial' | 'MEV' | 'CausasEje';
    causaVerified: boolean;
    causaIsValid?: boolean | null;
    causaUpdateEnabled: boolean;
    causaAssociationStatus: 'pending' | 'pending_selection' | 'success' | 'failed' | 'not_attempted';
    causaAssociationError?: string;
    causaLastSyncDate?: Date;
    pendingCausaIds: mongoose.Types.ObjectId[];
    pendingCausaType?: 'CausasEje' | 'MEV';
    searchTerm?: string;
    overwrite?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FolderEje: Model<IFolderEjeFields>;
export default FolderEje;
//# sourceMappingURL=folder.d.ts.map