import { create } from 'zustand';
import { AccessLog } from '@/types';
import { mockAccessLogs, mockSystems, mockUsers } from '@/mock/data';

interface AccessLogState {
  logs: AccessLog[];
  addLog: (userId: string, systemId: string) => void;
  getRecentLogs: (userId: string, limit?: number) => AccessLog[];
  getUserLogs: (userId: string) => AccessLog[];
  getAllLogs: (userId: string) => AccessLog[];
}

export const useAccessLogStore = create<AccessLogState>((set, get) => ({
  logs: mockAccessLogs.map(log => {
    const system = mockSystems.find(s => s.id === log.systemId);
    const user = mockUsers.find(u => u.id === log.userId);
    return {
      ...log,
      systemName: system?.name,
      userName: user?.name,
    };
  }),

  addLog: (userId: string, systemId: string) => {
    const system = mockSystems.find(s => s.id === systemId);
    const user = mockUsers.find(u => u.id === userId);
    
    const newLog: AccessLog = {
      id: `log-${Date.now()}`,
      userId,
      systemId,
      timestamp: new Date(),
      systemName: system?.name,
      userName: user?.name,
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
