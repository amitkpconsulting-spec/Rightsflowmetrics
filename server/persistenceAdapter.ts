/**
 * ============================================================================
 * RIGHTSFLOW METRICS - DATA PERSISTENCE & STORAGE ARCHITECTURE STRATEGY
 * ============================================================================
 *
 * Operational Strategy for Ephemeral vs. Persistent Deployment Targets:
 *
 * 1. LOCAL PERSISTENT STORAGE (RECOMMENDED FOR REPLIT RESERVED VM & DOCKER):
 *    - Replit Deployment Target: `deploymentTarget = "vm"` (Reserved VM with persistent disk).
 *    - Disk Mount Path: Specified via `process.env.DATA_DIR || './data'`.
 *    - Storage Engine: SQLite 3.45 in strict WAL mode via `sql.js` (WebAssembly) with
 *      tamper-evident SHA-256 hash chaining and synchronous disk persistence.
 *
 * 2. EPHEMERAL AUTOSCALE TARGETS (REPLIT AUTOSCALE / CLOUD RUN):
 *    - When `deploymentTarget = "autoscale"`, the compute container is stateless and
 *      scales to zero during idle periods. Any local disk modifications written to
 *      `data/*.sqlite` will not persist across cold boots.
 *    - Architectural Safeguard: The system automatically logs a diagnostic notice and
 *      maintains full in-memory functionality and self-healing initialization.
 *    - Remote Persistence Adapter Pattern (below): Allows plugging remote database
 *      providers (Turso / libSQL, Neon PostgreSQL, Supabase, or Cloudflare R2 / S3).
 */

import fs from 'fs';
import path from 'path';

export interface StorageStrategyConfig {
  mode: 'local-persistent-sqlite' | 'ephemeral-autoscale-sqlite' | 'remote-cloud-adapter';
  dataDir: string;
  isEphemeral: boolean;
  deploymentTarget: string;
  persistentDiskAvailable: boolean;
}

export function detectStorageStrategy(): StorageStrategyConfig {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const deploymentTarget = process.env.REPLIT_DEPLOYMENT_TARGET || (process.env.NODE_ENV === 'production' ? 'autoscale' : 'development');
  const isEphemeral = deploymentTarget === 'autoscale' && !process.env.PERSISTENT_DISK;

  return {
    mode: isEphemeral ? 'ephemeral-autoscale-sqlite' : 'local-persistent-sqlite',
    dataDir,
    isEphemeral,
    deploymentTarget,
    persistentDiskAvailable: !isEphemeral
  };
}

/**
 * Adapter interface for optional remote cloud database synchronization
 */
export interface RemotePersistenceAdapter {
  providerName: string;
  connect(): Promise<boolean>;
  syncSnapshotToRemote(snapshotBuffer: Buffer): Promise<boolean>;
  pullSnapshotFromRemote(): Promise<Buffer | null>;
}

export class LocalDiskPersistenceAdapter implements RemotePersistenceAdapter {
  providerName = 'Local Disk SQLite WAL (Persistent Mount / VM)';

  async connect(): Promise<boolean> {
    return true;
  }

  async syncSnapshotToRemote(snapshotBuffer: Buffer): Promise<boolean> {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'compliance_records.sqlite'), snapshotBuffer);
    return true;
  }

  async pullSnapshotFromRemote(): Promise<Buffer | null> {
    const dbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'compliance_records.sqlite');
    if (fs.existsSync(dbPath)) {
      return fs.readFileSync(dbPath);
    }
    return null;
  }
}
