import { create } from 'zustand';
import { AccessLog } from '@/types';

interface AccessLogState {
  logs: AccessLog[];
  addLog: (userId: string, systemId: string) => void;
  getRecentLogs: (userId: string, limit?: number) => AccessLog[];
  getUserLogs: (userId: string) => AccessLog[];
  getAllLogs: (userId: string) => AccessLog[];
}

export const useAccessLogStore = create<AccessLogState>((set, get) => ({
  logs: [],

  addLog: (userId: string, systemId: string) => {
    const newLog: AccessLog = {
      id: `log-${Date.now()}`,
      userId,
      systemId,
      timestamp: new Date(),
    };
    set((state) => ({
      logs: [newLog, ...state.logs],
    }));
  },

  getRecentLogs: (userId: string, limit = 5) => {
    const { logs } = get();
    return logs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  },

  getUserLogs: (userId: string) => {
    const { logs } = get();
    return logs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  getAllLogs: (userId: string) => {
    const { logs } = get();
    return logs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },
}));
