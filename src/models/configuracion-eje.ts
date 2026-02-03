/**
 * Modelo ConfiguracionEje
 * Configuración de workers para el sistema EJE
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

// ========== INTERFACES ==========

export interface ISchedule {
  cronExpression: string;
  workStartHour: number;
  workEndHour: number;
  workDays: number[];
  timezone: string;
  respectWorkingHours: boolean;
}

export interface IWorkerConfig {
  enabled: boolean;
  batchSize: number;
  delayBetweenRequests: number;    // ms entre requests (rate limiting propio)
  maxRetries: number;
  retryDelay: number;              // ms entre reintentos
}

export interface IStats {
  documentsProcessed: number;
  documentsSuccess: number;
  documentsError: number;
  movimientosExtracted: number;
  lastReset: Date;
}

export interface IState {
  isRunning: boolean;
  lastCycleAt?: Date;
  cycleCount: number;
  lastError?: {
    message: string;
    timestamp: Date;
    documentId?: mongoose.Types.ObjectId;
  };
}

export interface IDailyStat {
  date: Date;
  totalEligible: number;
  processed: number;
  success: number;
  errors: number;
  pending: number;
  movimientosExtracted: number;
  cyclesRun: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConfiguracionEje extends Document {
  // Identificación
  workerId: string;
  name: string;

  // Configuración global
  enabled: boolean;
  baseUrl: string;

  // Configuración por worker
  workers: {
    verification: IWorkerConfig;
    update: IWorkerConfig;
    stuck: IWorkerConfig;
  };

  // Horario de trabajo
  schedule: ISchedule;

  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  // Estadísticas globales
  stats: IStats;

  // Estado actual
  state: IState;

  // Estadísticas diarias
  dailyStats: IDailyStat[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ========== SCHEMAS ==========

const ScheduleSchema = new Schema<ISchedule>({
  cronExpression: { type: String, default: '*/30 * * * *' },
  workStartHour: { type: Number, default: 8, min: 0, max: 23 },
  workEndHour: { type: Number, default: 22, min: 0, max: 23 },
  workDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
  respectWorkingHours: { type: Boolean, default: true }
}, { _id: false });

const WorkerConfigSchema = new Schema<IWorkerConfig>({
  enabled: { type: Boolean, default: true },
  batchSize: { type: Number, default: 10 },
  delayBetweenRequests: { type: Number, default: 2000 },
  maxRetries: { type: Number, default: 3 },
  retryDelay: { type: Number, default: 5000 }
}, { _id: false });

const StatsSchema = new Schema<IStats>({
  documentsProcessed: { type: Number, default: 0 },
  documentsSuccess: { type: Number, default: 0 },
  documentsError: { type: Number, default: 0 },
  movimientosExtracted: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now }
}, { _id: false });

const StateSchema = new Schema<IState>({
  isRunning: { type: Boolean, default: false },
  lastCycleAt: { type: Date },
  cycleCount: { type: Number, default: 0 },
  lastError: {
    message: { type: String },
    timestamp: { type: Date },
    documentId: { type: Schema.Types.ObjectId }
  }
}, { _id: false });

const DailyStatSchema = new Schema<IDailyStat>({
  date: { type: Date, required: true },
  totalEligible: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  errors: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  movimientosExtracted: { type: Number, default: 0 },
  cyclesRun: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ========== SCHEMA PRINCIPAL ==========

const ConfiguracionEjeSchema = new Schema<IConfiguracionEje>({
  workerId: {
    type: String,
    required: true,
    default: 'eje_main',
    unique: true
  },
  name: {
    type: String,
    default: 'eje-workers'
  },

  // Configuración global
  enabled: { type: Boolean, default: true },
  baseUrl: { type: String, default: 'https://eje.juscaba.gob.ar/iol-ui/p/inicio' },

  // Configuración por worker
  workers: {
    verification: { type: WorkerConfigSchema, default: () => ({}) },
    update: { type: WorkerConfigSchema, default: () => ({}) },
    stuck: { type: WorkerConfigSchema, default: () => ({}) }
  },

  // Horario
  schedule: { type: ScheduleSchema, default: () => ({}) },

  // Rate limiting
  rateLimiting: {
    enabled: { type: Boolean, default: true },
    requestsPerMinute: { type: Number, default: 20 },
    requestsPerHour: { type: Number, default: 500 }
  },

  // Estadísticas
  stats: { type: StatsSchema, default: () => ({}) },

  // Estado
  state: { type: StateSchema, default: () => ({}) },

  // Estadísticas diarias
  dailyStats: { type: [DailyStatSchema], default: [] }
}, {
  timestamps: true,
  collection: 'configuracion-eje'
});

// ========== MÉTODOS ESTÁTICOS ==========

ConfiguracionEjeSchema.statics.getOrCreate = async function(workerId: string = 'eje_main') {
  let config = await this.findOne({ workerId });

  if (!config) {
    config = await this.create({ workerId });
  }

  return config;
};

ConfiguracionEjeSchema.statics.getConfig = async function() {
  return this.findOne({ workerId: 'eje_main' }).lean();
};

ConfiguracionEjeSchema.statics.updateConfig = async function(updates: Partial<IConfiguracionEje>) {
  return this.findOneAndUpdate(
    { workerId: 'eje_main' },
    { $set: { ...updates, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
};

ConfiguracionEjeSchema.statics.isWithinWorkingHours = async function() {
  const config = await this.findOne({ workerId: 'eje_main' }).lean();

  if (!config) return false;
  if (!config.schedule?.respectWorkingHours) return true;

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: config.schedule.timezone || 'America/Argentina/Buenos_Aires'
  };
  const localTimeStr = now.toLocaleString('en-US', options);
  const localTime = new Date(localTimeStr);

  const currentHour = localTime.getHours();
  const currentDay = localTime.getDay();

  const { workStartHour, workEndHour, workDays } = config.schedule;

  if (!workDays.includes(currentDay)) return false;
  if (currentHour < workStartHour || currentHour >= workEndHour) return false;

  return true;
};

ConfiguracionEjeSchema.statics.logSuccess = async function(movimientosCount: number = 0) {
  return this.findOneAndUpdate(
    { workerId: 'eje_main' },
    {
      $inc: {
        'stats.documentsProcessed': 1,
        'stats.documentsSuccess': 1,
        'stats.movimientosExtracted': movimientosCount
      },
      $set: {
        'state.lastCycleAt': new Date()
      }
    }
  );
};

ConfiguracionEjeSchema.statics.logError = async function(error: Error, documentId?: mongoose.Types.ObjectId) {
  return this.findOneAndUpdate(
    { workerId: 'eje_main' },
    {
      $inc: {
        'stats.documentsProcessed': 1,
        'stats.documentsError': 1
      },
      $set: {
        'state.lastError': {
          message: error.message,
          timestamp: new Date(),
          documentId
        }
      }
    }
  );
};

// ========== INTERFACE DE MODELO ESTÁTICO ==========

export interface IConfiguracionEjeModel extends Model<IConfiguracionEje> {
  getOrCreate(workerId?: string): Promise<IConfiguracionEje>;
  getConfig(): Promise<IConfiguracionEje | null>;
  updateConfig(updates: Partial<IConfiguracionEje>): Promise<IConfiguracionEje>;
  isWithinWorkingHours(): Promise<boolean>;
  logSuccess(movimientosCount?: number): Promise<IConfiguracionEje | null>;
  logError(error: Error, documentId?: mongoose.Types.ObjectId): Promise<IConfiguracionEje | null>;
}

// ========== EXPORT ==========

export const ConfiguracionEje = mongoose.model<IConfiguracionEje, IConfiguracionEjeModel>('ConfiguracionEje', ConfiguracionEjeSchema);
export default ConfiguracionEje;
