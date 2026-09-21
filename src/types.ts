export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
}

export interface NodeItem {
  id: string;
  name: string;
  host: string;
  port: number;
  token: string;
  status: 'online' | 'offline' | 'checking';
  cpuUsage: number;
  ramTotal: number;
  ramUsed: number;
  diskTotal: number;
  diskUsed: number;
  uptime: number;
  kvmSupported: boolean;
  dockerSupported: boolean;
  os: string;
}

export interface VPSInstance {
  id: string;
  name: string;
  hostname: string;
  nodeId: string;
  nodeName: string;
  userId: string;
  userName: string;
  vpsType: 'qemu' | 'docker';
  os: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  status: 'running' | 'stopped' | 'restarting';
  ipAddress: string;
  rootPass: string;
  kvmEnabled: boolean;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  uptimeSeconds: number;
  sshxUrl: string;
}
