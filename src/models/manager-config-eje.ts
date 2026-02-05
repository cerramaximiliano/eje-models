/**
 * Modelo ManagerConfigEje
 * Configuración flexible de managers para workers EJE
 * Soporta múltiples tipos: 'verification', 'update', 'stuck'
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

// ========== TIPOS DE MANAGER ==========

export type ManagerType = 'verification' | 'update' | 'stuck';

// ========== INTERFACES ==========

export interface IWorkerSchedule {
  workStartHour: number;           // hora inicio (0-23)
  workEndHour: number;             // hora fin (0-23)
  workDays: number[];              // días de trabajo (0=dom, 1=lun, ... 6=sab)
  useGlobalSchedule: boolean;      // true = usa horario global, false = usa propio
}

export interface IManagerWorkerConfig {
  // Habilitación
  enabled: boolean;

  // Límites de workers
  minWorkers: number;
  maxWorkers: number;

  // Umbrales de escalado
  scaleUpThreshold: number;        // Docs pendientes para escalar UP
  scaleDownThreshold: number;      // Docs pendientes para escalar DOWN

  // Umbrales de tiempo (específico por worker)
  updateThresholdHours: number;    // Horas para considerar doc desactualizado (default 24)

  // Procesamiento
  batchSize: number;               // Docs por ciclo
  delayBetweenRequests: number;    // ms entre requests
  maxRetries: number;              // Reintentos máximos

  // Horario específico del worker
  schedule: IWorkerSchedule;

  // Cron
  cronExpression: string;          // Expresión cron del worker

  // PM2
  workerName: string;              // Nombre del proceso PM2
  workerScript: string;            // Script a ejecutar
  maxMemoryRestart: string;        // Límite de memoria (ej: "500M")
}

export interface IManagerSettings {
  // Intervalos y tiempos
  checkInterval: number;           // ms entre ciclos del manager (default 60000)
  lockTimeoutMinutes: number;      // minutos antes de considerar lock expirado

  // Umbrales de tiempo
  updateThresholdHours: number;    // horas para considerar documento desactualizado

  // Recursos del sistema
  cpuThreshold: number;            // % CPU máximo (0.75 = 75%)
  memoryThreshold: number;         // % memoria máximo (0.80 = 80%)

  // Horario de trabajo
  workStartHour: number;           // hora inicio (0-23)
  workEndHour: number;             // hora fin (0-23)
  workDays: number[];              // días de trabajo (0=dom, 1=lun, ... 6=sab)
  timezone: string;                // zona horaria

  // Configuración por tipo de worker
  workers: {
    verification: IManagerWorkerConfig;
    update: IManagerWorkerConfig;
    stuck: IManagerWorkerConfig;
  };
}

export interface IWorkerStatus {
  activeInstances: number;
  pendingDocuments: number;
  optimalInstances: number;
  lastProcessedAt?: Date;
  processedThisCycle: number;
  errorsThisCycle: number;
}

export interface ISystemResources {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryFree: number;
  loadAvg: number[];
}

export interface IManagerState {
  isRunning: boolean;
  isPaused: boolean;
  lastCycleAt?: Date;
  cycleCount: number;

  // Estado por tipo de worker
  workers: {
    verification: IWorkerStatus;
    update: IWorkerStatus;
    stuck: IWorkerStatus;
  };

  systemResources: ISystemResources;

  lastScaleAction?: {
    timestamp: Date;
    workerType: ManagerType;
    action: 'scale_up' | 'scale_down' | 'no_change';
    from: number;
    to: number;
    reason: string;
  };
}

export interface IHistorySnapshot {
  timestamp: Date;
  workers: {
    verification: { active: number; pending: number };
    update: { active: number; pending: number };
    stuck: { active: number; pending: number };
  };
  systemResources: ISystemResources;
  scaleChanges: number;
}

export interface IAlert {
  type: 'high_cpu' | 'high_memory' | 'no_workers' | 'high_pending' | 'manager_stopped' | 'stuck_documents' | 'worker_error';
  workerType?: ManagerType;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  value?: number;
  threshold?: number;
}

export interface IDailyStats {
  date: string;                    // YYYY-MM-DD
  byWorker: {
    verification: {
      processed: number;
      success: number;
      errors: number;
      peakPending: number;
      peakWorkers: number;
    };
    update: {
      processed: number;
      success: number;
      errors: number;
      movimientosFound: number;
      peakPending: number;
      peakWorkers: number;
    };
    stuck: {
      processed: number;
      recovered: number;
      markedInvalid: number;
    };
  };
  cyclesRun: number;
  avgCycleTime: number;
}

export interface IManagerConfigEje extends Document {
  name: string;                    // 'eje-manager' (singleton para todo EJE)

  // Configuración
  config: IManagerSettings;

  // Estado actual
  currentState: IManagerState;

  // Historial de estados (últimas 24h)
  history: IHistorySnapshot[];

  // Alertas
  alerts: IAlert[];

  // Estadísticas diarias (últimos 30 días)
  dailyStats: IDailyStats[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ========== VALORES POR DEFECTO ==========

const DEFAULT_WORKER_SCHEDULE: IWorkerSchedule = {
  workStartHour: 0,
  workEndHour: 23,
  workDays: [0, 1, 2, 3, 4, 5, 6],
  useGlobalSchedule: true
};

const DEFAULT_WORKER_CONFIG: IManagerWorkerConfig = {
  enabled: true,
  minWorkers: 1,
  maxWorkers: 3,
  scaleUpThreshold: 100,
  scaleDownThreshold: 10,
  updateThresholdHours: 24,
  batchSize: 10,
  delayBetweenRequests: 2000,
  maxRetries: 3,
  schedule: { ...DEFAULT_WORKER_SCHEDULE },
  cronExpression: '*/2 * * * *',
  workerName: 'eje-worker',
  workerScript: './dist/workers/worker.js',
  maxMemoryRestart: '500M'
};

const DEFAULT_WORKER_STATUS: IWorkerStatus = {
  activeInstances: 0,
  pendingDocuments: 0,
  optimalInstances: 0,
  processedThisCycle: 0,
  errorsThisCycle: 0
};

// ========== SCHEMAS ==========

const WorkerScheduleSchema = new Schema<IWorkerSchedule>({
  workStartHour: { type: Number, default: 0 },
  workEndHour: { type: Number, default: 23 },
  workDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  useGlobalSchedule: { type: Boolean, default: true }
}, { _id: false });

const WorkerConfigSchema = new Schema<IManagerWorkerConfig>({
  enabled: { type: Boolean, default: true },
  minWorkers: { type: Number, default: 1 },
  maxWorkers: { type: Number, default: 3 },
  scaleUpThreshold: { type: Number, default: 100 },
  scaleDownThreshold: { type: Number, default: 10 },
  updateThresholdHours: { type: Number, default: 24 },
  batchSize: { type: Number, default: 10 },
  delayBetweenRequests: { type: Number, default: 2000 },
  maxRetries: { type: Number, default: 3 },
  schedule: { type: WorkerScheduleSchema, default: () => ({ ...DEFAULT_WORKER_SCHEDULE }) },
  cronExpression: { type: String, default: '*/2 * * * *' },
  workerName: { type: String, default: 'eje-worker' },
  workerScript: { type: String, default: './dist/workers/worker.js' },
  maxMemoryRestart: { type: String, default: '500M' }
}, { _id: false });

const ManagerSettingsSchema = new Schema<IManagerSettings>({
  checkInterval: { type: Number, default: 60000 },
  lockTimeoutMinutes: { type: Number, default: 10 },
  updateThresholdHours: { type: Number, default: 24 },
  cpuThreshold: { type: Number, default: 0.75 },
  memoryThreshold: { type: Number, default: 0.80 },
  workStartHour: { type: Number, default: 0 },      // 24/7 por defecto
  workEndHour: { type: Number, default: 23 },       // 24/7 por defecto
  workDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },  // Todos los días
  timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
  workers: {
    verification: {
      type: WorkerConfigSchema,
      default: () => ({
        ...DEFAULT_WORKER_CONFIG,
        workerName: 'eje-verification-worker',
        workerScript: './dist/workers/verification-worker.js',
        cronExpression: '*/2 * * * *',
        minWorkers: 1,
        maxWorkers: 5,
        updateThresholdHours: 0,  // No aplica para verification
        schedule: {
          workStartHour: 0,
          workEndHour: 23,
          workDays: [0, 1, 2, 3, 4, 5, 6],
          useGlobalSchedule: true
        }
      })
    },
    update: {
      type: WorkerConfigSchema,
      default: () => ({
        ...DEFAULT_WORKER_CONFIG,
        workerName: 'eje-update-worker',
        workerScript: './dist/workers/update-worker.js',
        cronExpression: '*/2 * * * *',
        minWorkers: 1,
        maxWorkers: 3,
        updateThresholdHours: 24,  // Actualizar documentos cada 24 horas
        schedule: {
          workStartHour: 8,        // Solo de 8am a 20pm por defecto
          workEndHour: 20,
          workDays: [1, 2, 3, 4, 5],  // Lunes a viernes
          useGlobalSchedule: false    // Usa su propio horario
        }
      })
    },
    stuck: {
      type: WorkerConfigSchema,
      default: () => ({
        ...DEFAULT_WORKER_CONFIG,
        workerName: 'eje-stuck-worker',
        workerScript: './dist/workers/stuck-worker.js',
        cronExpression: '0 */2 * * *',  // Cada 2 horas
        minWorkers: 1,
        maxWorkers: 1,  // Solo 1 instancia para stuck
        updateThresholdHours: 0,  // No aplica para stuck
        schedule: {
          workStartHour: 0,
          workEndHour: 23,
          workDays: [0, 1, 2, 3, 4, 5, 6],
          useGlobalSchedule: true
        }
      })
    }
  }
}, { _id: false });

const WorkerStatusSchema = new Schema<IWorkerStatus>({
  activeInstances: { type: Number, default: 0 },
  pendingDocuments: { type: Number, default: 0 },
  optimalInstances: { type: Number, default: 0 },
  lastProcessedAt: { type: Date },
  processedThisCycle: { type: Number, default: 0 },
  errorsThisCycle: { type: Number, default: 0 }
}, { _id: false });

const SystemResourcesSchema = new Schema<ISystemResources>({
  cpuUsage: { type: Number, default: 0 },
  memoryUsage: { type: Number, default: 0 },
  memoryTotal: { type: Number, default: 0 },
  memoryFree: { type: Number, default: 0 },
  loadAvg: { type: [Number], default: [0, 0, 0] }
}, { _id: false });

const ManagerStateSchema = new Schema<IManagerState>({
  isRunning: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  lastCycleAt: { type: Date },
  cycleCount: { type: Number, default: 0 },
  workers: {
    verification: { type: WorkerStatusSchema, default: () => ({ ...DEFAULT_WORKER_STATUS }) },
    update: { type: WorkerStatusSchema, default: () => ({ ...DEFAULT_WORKER_STATUS }) },
    stuck: { type: WorkerStatusSchema, default: () => ({ ...DEFAULT_WORKER_STATUS }) }
  },
  systemResources: { type: SystemResourcesSchema, default: () => ({}) },
  lastScaleAction: {
    timestamp: { type: Date },
    workerType: { type: String, enum: ['verification', 'update', 'stuck'] },
    action: { type: String, enum: ['scale_up', 'scale_down', 'no_change'] },
    from: { type: Number },
    to: { type: Number },
    reason: { type: String }
  }
}, { _id: false });

const HistorySnapshotSchema = new Schema<IHistorySnapshot>({
  timestamp: { type: Date, default: Date.now },
  workers: {
    verification: { active: Number, pending: Number },
    update: { active: Number, pending: Number },
    stuck: { active: Number, pending: Number }
  },
  systemResources: { type: SystemResourcesSchema, default: () => ({}) },
  scaleChanges: { type: Number, default: 0 }
}, { _id: false });

const AlertSchema = new Schema<IAlert>({
  type: {
    type: String,
    enum: ['high_cpu', 'high_memory', 'no_workers', 'high_pending', 'manager_stopped', 'stuck_documents', 'worker_error'],
    required: true
  },
  workerType: { type: String, enum: ['verification', 'update', 'stuck'] },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date },
  acknowledgedBy: { type: String },
  value: { type: Number },
  threshold: { type: Number }
}, { _id: false });

const DailyStatsSchema = new Schema<IDailyStats>({
  date: { type: String, required: true },
  byWorker: {
    verification: {
      processed: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
      peakPending: { type: Number, default: 0 },
      peakWorkers: { type: Number, default: 0 }
    },
    update: {
      processed: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
      movimientosFound: { type: Number, default: 0 },
      peakPending: { type: Number, default: 0 },
      peakWorkers: { type: Number, default: 0 }
    },
    stuck: {
      processed: { type: Number, default: 0 },
      recovered: { type: Number, default: 0 },
      markedInvalid: { type: Number, default: 0 }
    }
  },
  cyclesRun: { type: Number, default: 0 },
  avgCycleTime: { type: Number, default: 0 }
}, { _id: false });

// ========== SCHEMA PRINCIPAL ==========

const ManagerConfigEjeSchema = new Schema<IManagerConfigEje>({
  name: {
    type: String,
    required: true,
    unique: true,
    default: 'eje-manager'
  },
  config: { type: ManagerSettingsSchema, default: () => ({}) },
  currentState: { type: ManagerStateSchema, default: () => ({}) },
  history: { type: [HistorySnapshotSchema], default: [] },
  alerts: { type: [AlertSchema], default: [] },
  dailyStats: { type: [DailyStatsSchema], default: [] }
}, {
  timestamps: true,
  collection: 'manager-config-eje'
});

// Índice para búsqueda rápida
ManagerConfigEjeSchema.index({ name: 1 });

// ========== MÉTODOS ESTÁTICOS ==========

ManagerConfigEjeSchema.statics.getOrCreate = async function(): Promise<IManagerConfigEje> {
  let config = await this.findOne({ name: 'eje-manager' });

  if (!config) {
    config = await this.create({ name: 'eje-manager' });
  }

  return config;
};

ManagerConfigEjeSchema.statics.getConfig = async function(): Promise<IManagerConfigEje | null> {
  return this.findOne({ name: 'eje-manager' });
};

ManagerConfigEjeSchema.statics.updateConfig = async function(
  updates: Partial<IManagerSettings>
): Promise<IManagerConfigEje | null> {
  const updateObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'workers' && typeof value === 'object') {
      // Actualizar configuración de workers específicos
      for (const [workerType, workerConfig] of Object.entries(value as Record<string, Partial<IManagerWorkerConfig>>)) {
        for (const [configKey, configValue] of Object.entries(workerConfig)) {
          updateObj[`config.workers.${workerType}.${configKey}`] = configValue;
        }
      }
    } else {
      updateObj[`config.${key}`] = value;
    }
  }

  return this.findOneAndUpdate(
    { name: 'eje-manager' },
    { $set: updateObj },
    { new: true, upsert: true }
  );
};

ManagerConfigEjeSchema.statics.updateWorkerConfig = async function(
  workerType: ManagerType,
  updates: Partial<IManagerWorkerConfig>
): Promise<IManagerConfigEje | null> {
  const updateObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    updateObj[`config.workers.${workerType}.${key}`] = value;
  }

  return this.findOneAndUpdate(
    { name: 'eje-manager' },
    { $set: updateObj },
    { new: true }
  );
};

ManagerConfigEjeSchema.statics.getWorkerConfig = async function(
  workerType: ManagerType
): Promise<IManagerWorkerConfig | null> {
  const config = await this.findOne({ name: 'eje-manager' }).lean();
  return config?.config?.workers?.[workerType] || null;
};

ManagerConfigEjeSchema.statics.updateState = async function(
  state: Partial<IManagerState>
): Promise<IManagerConfigEje | null> {
  const updateObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state)) {
    if (key === 'workers' && typeof value === 'object') {
      for (const [workerType, workerStatus] of Object.entries(value as Record<string, Partial<IWorkerStatus>>)) {
        for (const [statusKey, statusValue] of Object.entries(workerStatus)) {
          updateObj[`currentState.workers.${workerType}.${statusKey}`] = statusValue;
        }
      }
    } else {
      updateObj[`currentState.${key}`] = value;
    }
  }

  updateObj['currentState.lastCycleAt'] = new Date();

  return this.findOneAndUpdate(
    { name: 'eje-manager' },
    {
      $set: updateObj,
      $inc: { 'currentState.cycleCount': 1 }
    },
    { new: true }
  );
};

ManagerConfigEjeSchema.statics.updateWorkerStatus = async function(
  workerType: ManagerType,
  status: Partial<IWorkerStatus>
): Promise<IManagerConfigEje | null> {
  const updateObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(status)) {
    updateObj[`currentState.workers.${workerType}.${key}`] = value;
  }

  return this.findOneAndUpdate(
    { name: 'eje-manager' },
    { $set: updateObj },
    { new: true }
  );
};

ManagerConfigEjeSchema.statics.addHistorySnapshot = async function(
  snapshot: Omit<IHistorySnapshot, 'timestamp'>
): Promise<void> {
  const fullSnapshot: IHistorySnapshot = {
    ...snapshot,
    timestamp: new Date()
  };

  await this.findOneAndUpdate(
    { name: 'eje-manager' },
    {
      $push: {
        history: {
          $each: [fullSnapshot],
          $slice: -1440  // Mantener últimas 24h (1 snapshot/minuto)
        }
      }
    }
  );
};

ManagerConfigEjeSchema.statics.addAlert = async function(
  alert: Omit<IAlert, 'timestamp' | 'acknowledged'>
): Promise<void> {
  const fullAlert: IAlert = {
    ...alert,
    timestamp: new Date(),
    acknowledged: false
  };

  await this.findOneAndUpdate(
    { name: 'eje-manager' },
    {
      $push: {
        alerts: {
          $each: [fullAlert],
          $slice: -100  // Mantener últimas 100 alertas
        }
      }
    }
  );
};

ManagerConfigEjeSchema.statics.acknowledgeAlert = async function(
  alertIndex: number,
  acknowledgedBy: string
): Promise<void> {
  await this.findOneAndUpdate(
    { name: 'eje-manager' },
    {
      $set: {
        [`alerts.${alertIndex}.acknowledged`]: true,
        [`alerts.${alertIndex}.acknowledgedAt`]: new Date(),
        [`alerts.${alertIndex}.acknowledgedBy`]: acknowledgedBy
      }
    }
  );
};

ManagerConfigEjeSchema.statics.recordScaleAction = async function(
  workerType: ManagerType,
  action: 'scale_up' | 'scale_down' | 'no_change',
  from: number,
  to: number,
  reason: string
): Promise<void> {
  await this.findOneAndUpdate(
    { name: 'eje-manager' },
    {
      $set: {
        'currentState.lastScaleAction': {
          timestamp: new Date(),
          workerType,
          action,
          from,
          to,
          reason
        }
      }
    }
  );
};

ManagerConfigEjeSchema.statics.isWithinWorkingHours = async function(): Promise<boolean> {
  const config = await this.findOne({ name: 'eje-manager' }).lean();

  if (!config) return false;

  const { workStartHour, workEndHour, workDays, timezone } = config.config;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'America/Argentina/Buenos_Aires',
    hour: 'numeric',
    hour12: false
  });
  const currentHour = parseInt(formatter.format(now));
  const currentDay = now.getDay();

  if (!workDays.includes(currentDay)) return false;
  if (currentHour < workStartHour || currentHour >= workEndHour) return false;

  return true;
};

ManagerConfigEjeSchema.statics.isWorkerWithinWorkingHours = async function(
  workerType: ManagerType
): Promise<boolean> {
  const config = await this.findOne({ name: 'eje-manager' }).lean();

  if (!config) return false;

  const workerConfig = config.config.workers[workerType];
  if (!workerConfig) return false;

  const timezone = config.config.timezone || 'America/Argentina/Buenos_Aires';
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false
  });
  const currentHour = parseInt(formatter.format(now));

  const dayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getDay();

  // Si no hay schedule definido o usa horario global, verificar horario global
  if (!workerConfig.schedule || workerConfig.schedule.useGlobalSchedule !== false) {
    const { workStartHour, workEndHour, workDays } = config.config;
    if (!workDays.includes(dayOfWeek)) return false;
    if (currentHour < workStartHour || currentHour >= workEndHour) return false;
    return true;
  }

  // Usar horario específico del worker
  const schedule = workerConfig.schedule;
  const workStartHour = schedule.workStartHour ?? 0;
  const workEndHour = schedule.workEndHour ?? 23;
  const workDays = schedule.workDays ?? [0, 1, 2, 3, 4, 5, 6];

  if (!workDays.includes(dayOfWeek)) return false;
  if (currentHour < workStartHour || currentHour >= workEndHour) return false;

  return true;
};

ManagerConfigEjeSchema.statics.markManagerRunning = async function(
  isRunning: boolean
): Promise<void> {
  await this.findOneAndUpdate(
    { name: 'eje-manager' },
    {
      $set: {
        'currentState.isRunning': isRunning,
        'currentState.lastCycleAt': new Date()
      }
    },
    { upsert: true }
  );
};

// ========== INTERFACE DE MODELO ESTÁTICO ==========

export interface IManagerConfigEjeModel extends Model<IManagerConfigEje> {
  getOrCreate(): Promise<IManagerConfigEje>;
  getConfig(): Promise<IManagerConfigEje | null>;
  updateConfig(updates: Partial<IManagerSettings>): Promise<IManagerConfigEje | null>;
  updateWorkerConfig(workerType: ManagerType, updates: Partial<IManagerWorkerConfig>): Promise<IManagerConfigEje | null>;
  getWorkerConfig(workerType: ManagerType): Promise<IManagerWorkerConfig | null>;
  updateState(state: Partial<IManagerState>): Promise<IManagerConfigEje | null>;
  updateWorkerStatus(workerType: ManagerType, status: Partial<IWorkerStatus>): Promise<IManagerConfigEje | null>;
  addHistorySnapshot(snapshot: Omit<IHistorySnapshot, 'timestamp'>): Promise<void>;
  addAlert(alert: Omit<IAlert, 'timestamp' | 'acknowledged'>): Promise<void>;
  acknowledgeAlert(alertIndex: number, acknowledgedBy: string): Promise<void>;
  recordScaleAction(workerType: ManagerType, action: 'scale_up' | 'scale_down' | 'no_change', from: number, to: number, reason: string): Promise<void>;
  isWithinWorkingHours(): Promise<boolean>;
  isWorkerWithinWorkingHours(workerType: ManagerType): Promise<boolean>;
  markManagerRunning(isRunning: boolean): Promise<void>;
}

// ========== EXPORT ==========

export const ManagerConfigEje = mongoose.model<IManagerConfigEje, IManagerConfigEjeModel>(
  'ManagerConfigEje',
  ManagerConfigEjeSchema
);
export default ManagerConfigEje;
