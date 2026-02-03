/**
 * Modelo WorkerStatsEje
 * Estadísticas detalladas de workers EJE
 * Incluye estadísticas por run, diarias y horarias
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

// ========== INTERFACES ==========

export interface IErrorDetail {
  causaId?: mongoose.Types.ObjectId;
  cuij?: string;
  numero?: number;
  anio?: number;
  errorType: string;
  message: string;
  stack?: string;
  timestamp: Date;
}

export interface IRunStats {
  runId: string;
  workerType: 'verification' | 'update' | 'stuck';
  workerId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;                // ms
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalToProcess: number;
  processed: number;
  success: number;
  errors: number;
  skipped: number;
  movimientosFound: number;
  privateCausas: number;
  publicCausas: number;
  errorDetails: IErrorDetail[];
  metadata?: {
    batchSize?: number;
    configVersion?: string;
    errorMessage?: string;
  };
}

export interface IHourlyStats {
  hour: number;                     // 0-23
  processed: number;
  success: number;
  errors: number;
  movimientosFound: number;
  avgProcessingTime: number;        // ms
  runsCount: number;
}

export interface IDailyWorkerStats {
  date: string;                     // YYYY-MM-DD
  workerType: 'verification' | 'update' | 'stuck' | 'all';

  // Totales del día
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
  totalSkipped: number;
  totalMovimientosFound: number;
  totalPrivateCausas: number;
  totalPublicCausas: number;

  // Runs
  runsCompleted: number;
  runsFailed: number;
  runsCancelled: number;
  totalRunTime: number;             // ms total
  avgRunTime: number;               // ms promedio por run

  // Estadísticas por hora
  hourlyStats: IHourlyStats[];

  // Errores más comunes
  topErrors: {
    errorType: string;
    count: number;
    lastOccurrence: Date;
  }[];

  // Performance
  avgProcessingTime: number;        // ms por documento
  peakProcessingHour: number;       // hora con más procesamiento
  peakProcessingCount: number;      // máximo procesado en una hora
}

export interface IWorkerStatsEje extends Document {
  // Identificación
  workerType: 'verification' | 'update' | 'stuck';
  workerId: string;

  // Run actual (si está corriendo)
  currentRun?: IRunStats;

  // Historial de runs (últimos 100)
  runHistory: IRunStats[];

  // Estadísticas diarias (últimos 30 días)
  dailyStats: IDailyWorkerStats[];

  // Estadísticas agregadas (all-time)
  totalStats: {
    totalProcessed: number;
    totalSuccess: number;
    totalErrors: number;
    totalMovimientosFound: number;
    totalRunsCompleted: number;
    totalRunTime: number;
    firstRunAt?: Date;
    lastRunAt?: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ========== SCHEMAS ==========

const ErrorDetailSchema = new Schema<IErrorDetail>({
  causaId: { type: Schema.Types.ObjectId },
  cuij: { type: String },
  numero: { type: Number },
  anio: { type: Number },
  errorType: { type: String, required: true },
  message: { type: String, required: true },
  stack: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const RunStatsSchema = new Schema<IRunStats>({
  runId: { type: String, required: true },
  workerType: { type: String, enum: ['verification', 'update', 'stuck'], required: true },
  workerId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number },
  status: { type: String, enum: ['running', 'completed', 'failed', 'cancelled'], default: 'running' },
  totalToProcess: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  errors: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  movimientosFound: { type: Number, default: 0 },
  privateCausas: { type: Number, default: 0 },
  publicCausas: { type: Number, default: 0 },
  errorDetails: { type: [ErrorDetailSchema], default: [] },
  metadata: {
    batchSize: { type: Number },
    configVersion: { type: String },
    errorMessage: { type: String }
  }
}, { _id: false });

const HourlyStatsSchema = new Schema<IHourlyStats>({
  hour: { type: Number, required: true, min: 0, max: 23 },
  processed: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  errors: { type: Number, default: 0 },
  movimientosFound: { type: Number, default: 0 },
  avgProcessingTime: { type: Number, default: 0 },
  runsCount: { type: Number, default: 0 }
}, { _id: false });

const DailyWorkerStatsSchema = new Schema<IDailyWorkerStats>({
  date: { type: String, required: true },
  workerType: { type: String, enum: ['verification', 'update', 'stuck', 'all'], required: true },
  totalProcessed: { type: Number, default: 0 },
  totalSuccess: { type: Number, default: 0 },
  totalErrors: { type: Number, default: 0 },
  totalSkipped: { type: Number, default: 0 },
  totalMovimientosFound: { type: Number, default: 0 },
  totalPrivateCausas: { type: Number, default: 0 },
  totalPublicCausas: { type: Number, default: 0 },
  runsCompleted: { type: Number, default: 0 },
  runsFailed: { type: Number, default: 0 },
  runsCancelled: { type: Number, default: 0 },
  totalRunTime: { type: Number, default: 0 },
  avgRunTime: { type: Number, default: 0 },
  hourlyStats: { type: [HourlyStatsSchema], default: () => Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    processed: 0,
    success: 0,
    errors: 0,
    movimientosFound: 0,
    avgProcessingTime: 0,
    runsCount: 0
  })) },
  topErrors: [{
    errorType: { type: String },
    count: { type: Number, default: 0 },
    lastOccurrence: { type: Date }
  }],
  avgProcessingTime: { type: Number, default: 0 },
  peakProcessingHour: { type: Number, default: 0 },
  peakProcessingCount: { type: Number, default: 0 }
}, { _id: false });

// ========== SCHEMA PRINCIPAL ==========

const WorkerStatsEjeSchema = new Schema<IWorkerStatsEje>({
  workerType: {
    type: String,
    enum: ['verification', 'update', 'stuck'],
    required: true
  },
  workerId: {
    type: String,
    required: true
  },
  currentRun: { type: RunStatsSchema },
  runHistory: { type: [RunStatsSchema], default: [] },
  dailyStats: { type: [DailyWorkerStatsSchema], default: [] },
  totalStats: {
    totalProcessed: { type: Number, default: 0 },
    totalSuccess: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    totalMovimientosFound: { type: Number, default: 0 },
    totalRunsCompleted: { type: Number, default: 0 },
    totalRunTime: { type: Number, default: 0 },
    firstRunAt: { type: Date },
    lastRunAt: { type: Date }
  }
}, {
  timestamps: true,
  collection: 'worker-stats-eje'
});

// Índices
WorkerStatsEjeSchema.index({ workerType: 1, workerId: 1 }, { unique: true });
WorkerStatsEjeSchema.index({ 'currentRun.status': 1 });
WorkerStatsEjeSchema.index({ 'dailyStats.date': 1 });

// ========== MÉTODOS ESTÁTICOS ==========

WorkerStatsEjeSchema.statics.getOrCreate = async function(
  workerType: 'verification' | 'update' | 'stuck',
  workerId: string
): Promise<IWorkerStatsEje> {
  let stats = await this.findOne({ workerType, workerId });

  if (!stats) {
    stats = await this.create({ workerType, workerId });
  }

  return stats;
};

WorkerStatsEjeSchema.statics.startRun = async function(
  workerType: 'verification' | 'update' | 'stuck',
  workerId: string,
  totalToProcess: number,
  metadata?: { batchSize?: number; configVersion?: string }
): Promise<string> {
  const runId = `${workerType}-${workerId}-${Date.now()}`;

  const newRun: IRunStats = {
    runId,
    workerType,
    workerId,
    startTime: new Date(),
    status: 'running',
    totalToProcess,
    processed: 0,
    success: 0,
    errors: 0,
    skipped: 0,
    movimientosFound: 0,
    privateCausas: 0,
    publicCausas: 0,
    errorDetails: [],
    metadata
  };

  await this.findOneAndUpdate(
    { workerType, workerId },
    {
      $set: { currentRun: newRun },
      $setOnInsert: { workerType, workerId }
    },
    { upsert: true }
  );

  return runId;
};

WorkerStatsEjeSchema.statics.recordSuccess = async function(
  workerType: 'verification' | 'update' | 'stuck',
  workerId: string,
  data: { movimientosFound?: number; isPrivate?: boolean }
): Promise<void> {
  const inc: Record<string, number> = {
    'currentRun.processed': 1,
    'currentRun.success': 1,
    'totalStats.totalProcessed': 1,
    'totalStats.totalSuccess': 1
  };

  if (data.movimientosFound) {
    inc['currentRun.movimientosFound'] = data.movimientosFound;
    inc['totalStats.totalMovimientosFound'] = data.movimientosFound;
  }

  if (data.isPrivate) {
    inc['currentRun.privateCausas'] = 1;
  } else {
    inc['currentRun.publicCausas'] = 1;
  }

  await this.findOneAndUpdate(
    { workerType, workerId },
    { $inc: inc }
  );
};

WorkerStatsEjeSchema.statics.recordError = async function(
  workerType: 'verification' | 'update' | 'stuck',
  workerId: string,
  error: IErrorDetail
): Promise<void> {
  await this.findOneAndUpdate(
    { workerType, workerId },
    {
      $inc: {
        'currentRun.processed': 1,
        'currentRun.errors': 1,
        'totalStats.totalProcessed': 1,
        'totalStats.totalErrors': 1
      },
      $push: {
        'currentRun.errorDetails': {
          $each: [{ ...error, timestamp: new Date() }],
          $slice: -50  // Mantener últimos 50 errores por run
        }
      }
    }
  );
};

WorkerStatsEjeSchema.statics.recordSkipped = async function(
  workerType: 'verification' | 'update' | 'stuck',
  workerId: string
): Promise<void> {
  await this.findOneAndUpdate(
    { workerType, workerId },
    {
      $inc: {
        'currentRun.processed': 1,
        'currentRun.skipped': 1
      }
    }
  );
};

WorkerStatsEjeSchema.statics.finishRun = async function(
  workerType: 'verification' | 'update' | 'stuck',
  workerId: string,
  status: 'completed' | 'failed' | 'cancelled',
  errorMessage?: string
): Promise<IRunStats | null> {
  const stats = await this.findOne({ workerType, workerId });

  if (!stats || !stats.currentRun) return null;

  const endTime = new Date();
  const duration = endTime.getTime() - stats.currentRun.startTime.getTime();

  const finishedRun: IRunStats = {
    ...stats.currentRun.toObject(),
    endTime,
    duration,
    status,
    metadata: {
      ...stats.currentRun.metadata,
      errorMessage
    }
  };

  // Actualizar estadísticas diarias
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();

  await this.findOneAndUpdate(
    { workerType, workerId },
    {
      $unset: { currentRun: 1 },
      $push: {
        runHistory: {
          $each: [finishedRun],
          $slice: -100  // Mantener últimos 100 runs
        }
      },
      $inc: {
        'totalStats.totalRunsCompleted': status === 'completed' ? 1 : 0,
        'totalStats.totalRunTime': duration
      },
      $set: {
        'totalStats.lastRunAt': endTime
      }
    }
  );

  // Actualizar o crear estadísticas diarias
  const dailyExists = await this.findOne({
    workerType,
    workerId,
    'dailyStats.date': today
  });

  if (dailyExists) {
    await this.findOneAndUpdate(
      { workerType, workerId, 'dailyStats.date': today },
      {
        $inc: {
          'dailyStats.$.totalProcessed': finishedRun.processed,
          'dailyStats.$.totalSuccess': finishedRun.success,
          'dailyStats.$.totalErrors': finishedRun.errors,
          'dailyStats.$.totalSkipped': finishedRun.skipped,
          'dailyStats.$.totalMovimientosFound': finishedRun.movimientosFound,
          'dailyStats.$.totalPrivateCausas': finishedRun.privateCausas,
          'dailyStats.$.totalPublicCausas': finishedRun.publicCausas,
          'dailyStats.$.runsCompleted': status === 'completed' ? 1 : 0,
          'dailyStats.$.runsFailed': status === 'failed' ? 1 : 0,
          'dailyStats.$.runsCancelled': status === 'cancelled' ? 1 : 0,
          'dailyStats.$.totalRunTime': duration,
          [`dailyStats.$.hourlyStats.${currentHour}.processed`]: finishedRun.processed,
          [`dailyStats.$.hourlyStats.${currentHour}.success`]: finishedRun.success,
          [`dailyStats.$.hourlyStats.${currentHour}.errors`]: finishedRun.errors,
          [`dailyStats.$.hourlyStats.${currentHour}.movimientosFound`]: finishedRun.movimientosFound,
          [`dailyStats.$.hourlyStats.${currentHour}.runsCount`]: 1
        }
      }
    );
  } else {
    const newDailyStats: IDailyWorkerStats = {
      date: today,
      workerType,
      totalProcessed: finishedRun.processed,
      totalSuccess: finishedRun.success,
      totalErrors: finishedRun.errors,
      totalSkipped: finishedRun.skipped,
      totalMovimientosFound: finishedRun.movimientosFound,
      totalPrivateCausas: finishedRun.privateCausas,
      totalPublicCausas: finishedRun.publicCausas,
      runsCompleted: status === 'completed' ? 1 : 0,
      runsFailed: status === 'failed' ? 1 : 0,
      runsCancelled: status === 'cancelled' ? 1 : 0,
      totalRunTime: duration,
      avgRunTime: duration,
      hourlyStats: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        processed: i === currentHour ? finishedRun.processed : 0,
        success: i === currentHour ? finishedRun.success : 0,
        errors: i === currentHour ? finishedRun.errors : 0,
        movimientosFound: i === currentHour ? finishedRun.movimientosFound : 0,
        avgProcessingTime: 0,
        runsCount: i === currentHour ? 1 : 0
      })),
      topErrors: [],
      avgProcessingTime: finishedRun.processed > 0 ? duration / finishedRun.processed : 0,
      peakProcessingHour: currentHour,
      peakProcessingCount: finishedRun.processed
    };

    await this.findOneAndUpdate(
      { workerType, workerId },
      {
        $push: {
          dailyStats: {
            $each: [newDailyStats],
            $slice: -30  // Mantener últimos 30 días
          }
        }
      }
    );
  }

  return finishedRun;
};

WorkerStatsEjeSchema.statics.getTodaySummary = async function(
  workerType?: 'verification' | 'update' | 'stuck'
): Promise<IDailyWorkerStats[]> {
  const today = new Date().toISOString().split('T')[0];

  const query: Record<string, any> = {
    'dailyStats.date': today
  };

  if (workerType) {
    query.workerType = workerType;
  }

  const stats = await this.find(query).lean();

  return stats.flatMap((s: IWorkerStatsEje) => s.dailyStats.filter((d: IDailyWorkerStats) => d.date === today));
};

// ========== INTERFACE DE MODELO ESTÁTICO ==========

export interface IWorkerStatsEjeModel extends Model<IWorkerStatsEje> {
  getOrCreate(workerType: 'verification' | 'update' | 'stuck', workerId: string): Promise<IWorkerStatsEje>;
  startRun(workerType: 'verification' | 'update' | 'stuck', workerId: string, totalToProcess: number, metadata?: { batchSize?: number; configVersion?: string }): Promise<string>;
  recordSuccess(workerType: 'verification' | 'update' | 'stuck', workerId: string, data: { movimientosFound?: number; isPrivate?: boolean }): Promise<void>;
  recordError(workerType: 'verification' | 'update' | 'stuck', workerId: string, error: IErrorDetail): Promise<void>;
  recordSkipped(workerType: 'verification' | 'update' | 'stuck', workerId: string): Promise<void>;
  finishRun(workerType: 'verification' | 'update' | 'stuck', workerId: string, status: 'completed' | 'failed' | 'cancelled', errorMessage?: string): Promise<IRunStats | null>;
  getTodaySummary(workerType?: 'verification' | 'update' | 'stuck'): Promise<IDailyWorkerStats[]>;
}

// ========== EXPORT ==========

export const WorkerStatsEje = mongoose.model<IWorkerStatsEje, IWorkerStatsEjeModel>('WorkerStatsEje', WorkerStatsEjeSchema);
export default WorkerStatsEje;
