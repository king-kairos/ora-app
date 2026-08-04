import * as os from 'os';
import * as fs from 'fs';
import { promisify } from 'util';

const statfsAsync = promisify(fs.statfs);

async function getORAHealth() {
  const uptime = process.uptime();
  let freeDiskSpace;
  try {
    const stats = await statfsAsync('/');
    freeDiskSpace = stats.bavail * stats.bsize; 
  } catch (error) {
    freeDiskSpace = -1; 
    console.error('Error getting free disk space:', error);
  }

  return {
    uptime,
    freeDiskSpace,
    timestamp: Date.now(),
  };
}

async function measureModelLatency() {
  const startTime = Date.now();
  
  await new Promise(resolve => setTimeout(resolve, 50));

  const endTime = Date.now();
  return endTime - startTime;
}

export { getORAHealth, measureModelLatency };