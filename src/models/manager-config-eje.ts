/**
 * Modelo ManagerConfigEje
 * Configuración del manager de escalado para workers EJE
 * Similar a ManagerConfig de PJN pero adaptado para EJE
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

// ========== INTERFACES ==========

export interface IManagerSettings {
  // Intervalos y tiempos
  checkInterval: number;           // ms entre verificaciones (default 60000 = 1min)
  lockTimeoutMinutes: number;      // minutos antes de considerar un documento bloqueado como stuck

  // Límites de workers
  maxWorkers: number;              // máximo de workers simultáneos
  minWorkers: number;              // mínimo de workers (0 = puede apagarse)

  // Umbrales de escalado
  scaleUpThreshold: number;        // documentos pendientes para escalar arriba
  scaleDownThreshold: number;      // documentos pendientes para escalar abajo

  // Umbrales de tiempo
  updateThresholdHours: number;    // horas desde última actualización para considerar documento elegible

  // Recursos del sistema
  cpuThreshold: number;            // % CPU máximo (0.75 = 75%)
  memoryThreshold: number;         // % memoria máximo (0.80 = 80%)

  // Horario de trabajo
  workStartHour: number;           // hora inicio (0-23)
  workEndHour: number;             // hora fin (0-24)
  workDays: number[];              // días de trabajo (0=dom, 1=lun, ... 6=sab)
  timezone: string;                // zona horaria

  // Nombres de workers PM2
  workerNames: {
    verification: string;
    update: string;
    stuck: string;
  };
}

export interface IWorkerCount {
  verification: number;
  update: number;
  stuck: number;
  total: number;
}

export interface IPendingCount {
  verification: number;            // verified: false
  update: number;                  // detailsLoaded: false o lastUpdate > threshold
  stuck: number;                   // lockedAt > timeout
  total: number;
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
  workers: IWorkerCount;
  pending: IPendingCount;
  optimalWorkers: IWorkerCount;
  systemResources: ISystemResources;
  lastScaleAction?: {
    timestamp: Date;
    workerType: string;
    action: 'scale_up' | 'scale_down';
    from: number;
    to: number;
    reason: string;
  };
}

export interface IHistorySnapshot {
  timestamp: Date;
  workers: IWorkerCount;
  pending: IPendingCount;
  systemResources: ISystemResources;
  scaleChanges: number;
}

export interface IAlert {
  type: 'high_cpu' | 'high_memory' | 'no_workers' | 'high_pending' | 'manager_stopped' | 'stuck_documents';
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
  totalEligible: number;
  processed: number;
  success: number;
  errors: number;
  movimientosFound: number;
  avgProcessingTime: number;       // ms promedio por documento
  peakPending: number;
  peakWorkers: number;
  cyclesRun: number;
}

export interface IManagerConfigEje extends Document {
  name: string;                    // 'eje-manager' (singleton)

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

// ========== SCHEMAS ==========

const ManagerSettingsSchema = new Schema<IManagerSettings>({
  checkInterval: { type: Number, default: 60000 },
  lockTimeoutMinutes: { type: Number, default: 10 },
  maxWorkers: { type: Number, default: 2 },
  minWorkers: { type: Number, default: 0 },
  scaleUpThreshold: { type: Number, default: 100 },
  scaleDownThreshold: { type: Number, default: 10 },
  updateThresholdHours: { type: Number, default: 24 },
  cpuThreshold: { type: Number, default: 0.75 },
  memoryThreshold: { type: Number, default: 0.80 },
  workStartHour: { type: Number, default: 8 },
  workEndHour: { type: Number, default: 22 },
  workDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
  workerNames: {
    verification: { type: String, default: 'eje/verification-worker' },
    update: { type: String, default: 'eje/update-worker' },
    stuck: { type: String, default: 'eje/stuck-worker' }
  }
}, { _id: false });

const WorkerCountSchema = new Schema<IWorkerCount>({
  verification: { type: Number, default: 0 },
  update: { type: Number, default: 0 },
  stuck: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { _id: false });

const PendingCountSchema = new Schema<IPendingCount>({
  verification: { type: Number, default: 0 },
  update: { type: Number, default: 0 },
  stuck: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
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
  workers: { type: WorkerCountSchema, default: () => ({}) },
  pending: { type: PendingCountSchema, default: () => ({}) },
  optimalWorkers: { type: WorkerCountSchema, default: () => ({}) },
  systemResources: { type: SystemResourcesSchema, default: () => ({}) },
  lastScaleAction: {
    timestamp: { type: Date },
    workerType: { type: String },
    action: { type: String, enum: ['scale_up', 'scale_down'] },
    from: { type: Number },
    to: { type: Number },
    reason: { type: String }
  }
}, { _id: false });

const HistorySnapshotSchema = new Schema<IHistorySnapshot>({
  timestamp: { type: Date, default: Date.now },
  workers: { type: WorkerCountSchema, default: () => ({}) },
  pending: { type: PendingCountSchema, default: () => ({}) },
  systemResources: { type: SystemResourcesSchema, default: () => ({}) },
  scaleChanges: { type: Number, default: 0 }
}, { _id: false });

const AlertSchema = new Schema<IAlert>({
  type: {
    type: String,
    enum: ['high_cpu', 'high_memory', 'no_workers', 'high_pending', 'manager_stopped', 'stuck_documents'],
    required: true
  },
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
  totalEligible: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  errors: { type: Number, default: 0 },
  movimientosFound: { type: Number, default: 0 },
  avgProcessingTime: { type: Number, default: 0 },
  peakPending: { type: Number, default: 0 },
  peakWorkers: { type: Number, default: 0 },
  cyclesRun: { type: Number, default: 0 }
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
  return this.findOne({ name: 'eje-manager' }).lean();
};

ManagerConfigEjeSchema.statics.updateConfig = async function(updates: Partial<IManagerSettings>): Promise<IManagerConfigEje | null> {
  const updateObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(updates)) {
    updateObj[`config.${key}`] = value;
  }

  return this.findOneAndUpdate(
    { name: 'eje-manager' },
    { $set: updateObj },
    { new: true, upsert: true }
  );
};

ManagerConfigEjeSchema.statics.updateState = async function(state: Partial<IManagerState>): Promise<IManagerConfigEje | null> {
  const updateObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(state)) {
    updateObj[`currentState.${key}`] = value;
  }

  return this.findOneAndUpdate(
    { name: 'eje-manager' },
    { $set: updateObj },
    { new: true }
  );
};

ManagerConfigEjeSchema.statics.addHistorySnapshot = async function(snapshot: Omit<IHistorySnapshot, 'timestamp'>): Promise<void> {
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

ManagerConfigEjeSchema.statics.addAlert = async function(alert: Omit<IAlert, 'timestamp' | 'acknowledged'>): Promise<void> {
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

ManagerConfigEjeSchema.statics.acknowledgeAlert = async function(alertIndex: number, acknowledgedBy: string): Promise<void> {
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

ManagerConfigEjeSchema.statics.updateDailyStats = async function(stats: Partial<IDailyStats>): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Buscar si ya existe el registro de hoy
  const config = await this.findOne({
    name: 'eje-manager',
    'dailyStats.date': today
  });

  if (config) {
    // Actualizar el registro existente
    const updateObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(stats)) {
      if (key !== 'date') {
        if (['processed', 'success', 'errors', 'movimientosFound', 'cyclesRun'].includes(key)) {
          updateObj[`dailyStats.$.${key}`] = { $add: [`$dailyStats.$.${key}`, value] };
        } else {
          updateObj[`dailyStats.$.${key}`] = value;
        }
      }
    }

    await this.findOneAndUpdate(
      { name: 'eje-manager', 'dailyStats.date': today },
      { $inc: stats }
    );
  } else {
    // Crear nuevo registro
    const newStats: IDailyStats = {
      date: today,
      totalEligible: 0,
      processed: 0,
      success: 0,
      errors: 0,
      movimientosFound: 0,
      avgProcessingTime: 0,
      peakPending: 0,
      peakWorkers: 0,
      cyclesRun: 0,
      ...stats
    };

    await this.findOneAndUpdate(
      { name: 'eje-manager' },
      {
        $push: {
          dailyStats: {
            $each: [newStats],
            $slice: -30  // Mantener últimos 30 días
          }
        }
      }
    );
  }
};

ManagerConfigEjeSchema.statics.isWithinWorkingHours = async function(): Promise<boolean> {
  const config = await this.findOne({ name: 'eje-manager' }).lean();

  if (!config) return false;

  const { workStartHour, workEndHour, workDays, timezone } = config.config;

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone || 'America/Argentina/Buenos_Aires',
    hour: 'numeric',
    weekday: 'short'
  };

  const localTimeStr = now.toLocaleString('en-US', options);
  const localTime = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false });
  const currentHour = parseInt(formatter.format(now));
  const currentDay = now.getDay();

  if (!workDays.includes(currentDay)) return false;
  if (currentHour < workStartHour || currentHour >= workEndHour) return false;

  return true;
};

// ========== INTERFACE DE MODELO ESTÁTICO ==========

export interface IManagerConfigEjeModel extends Model<IManagerConfigEje> {
  getOrCreate(): Promise<IManagerConfigEje>;
  getConfig(): Promise<IManagerConfigEje | null>;
  updateConfig(updates: Partial<IManagerSettings>): Promise<IManagerConfigEje | null>;
  updateState(state: Partial<IManagerState>): Promise<IManagerConfigEje | null>;
  addHistorySnapshot(snapshot: Omit<IHistorySnapshot, 'timestamp'>): Promise<void>;
  addAlert(alert: Omit<IAlert, 'timestamp' | 'acknowledged'>): Promise<void>;
  acknowledgeAlert(alertIndex: number, acknowledgedBy: string): Promise<void>;
  updateDailyStats(stats: Partial<IDailyStats>): Promise<void>;
  isWithinWorkingHours(): Promise<boolean>;
}

// ========== EXPORT ==========

export const ManagerConfigEje = mongoose.model<IManagerConfigEje, IManagerConfigEjeModel>('ManagerConfigEje', ManagerConfigEjeSchema);
export default ManagerConfigEje;
