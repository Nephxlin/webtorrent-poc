/**
 * Serviço para agregar estatísticas de todas as sessões P2P conectadas
 */

export interface SessionStats {
  sessionId: string;
  downloaded: number;
  downloadedP2P: number;
  downloadedHTTP: number;
  uploaded: number;
  peers: number;
  lastUpdate: number;
}

interface AggregatedStats {
  totalDownloaded: number;
  totalDownloadedP2P: number;
  totalDownloadedHTTP: number;
  totalUploaded: number;
  totalPeers: number;
  activeSessions: number;
  cdnSavings: number; // Porcentagem de economia (0-100)
}

class StatsAggregator {
  private sessions: Map<string, SessionStats> = new Map();
  private readonly SESSION_TIMEOUT = 30000; // 30 segundos sem atualização = sessão inativa

  /**
   * Atualiza as estatísticas de uma sessão
   */
  updateSession(sessionId: string, stats: Omit<SessionStats, 'sessionId' | 'lastUpdate'>): void {
    this.sessions.set(sessionId, {
      ...stats,
      sessionId,
      lastUpdate: Date.now(),
    });
  }

  /**
   * Remove uma sessão
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Remove sessões inativas (timeout)
   */
  cleanupInactiveSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastUpdate > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Calcula estatísticas agregadas de todas as sessões ativas
   */
  getAggregatedStats(): AggregatedStats {
    this.cleanupInactiveSessions();

    let totalDownloaded = 0;
    let totalDownloadedP2P = 0;
    let totalDownloadedHTTP = 0;
    let totalUploaded = 0;
    // Para peers, usar o máximo entre todas as sessões (peers são compartilhados no mesmo swarm)
    // ou somar se forem de swarms diferentes. Por enquanto, vamos usar o máximo para evitar duplicação
    let maxPeers = 0;
    const activeSessions = this.sessions.size;

    for (const session of this.sessions.values()) {
      totalDownloaded += session.downloaded;
      totalDownloadedP2P += session.downloadedP2P;
      totalDownloadedHTTP += session.downloadedHTTP;
      totalUploaded += session.uploaded;
      // Usar o máximo de peers (pois peers podem ser compartilhados entre sessões do mesmo stream)
      // Se quisermos somar peers únicos, precisaríamos rastrear IDs de peers, mas isso é mais complexo
      maxPeers = Math.max(maxPeers, session.peers);
    }

    // Calcular economia de CDN: (P2P / Total) * 100
    const cdnSavings = totalDownloaded > 0
      ? (totalDownloadedP2P / totalDownloaded) * 100
      : 0;

    return {
      totalDownloaded,
      totalDownloadedP2P,
      totalDownloadedHTTP,
      totalUploaded,
      totalPeers: maxPeers,
      activeSessions,
      cdnSavings: Math.min(100, Math.max(0, cdnSavings)),
    };
  }

  /**
   * Retorna o número de sessões ativas
   */
  getActiveSessionsCount(): number {
    this.cleanupInactiveSessions();
    return this.sessions.size;
  }
}

// Singleton
export const statsAggregator = new StatsAggregator();
export type { AggregatedStats };
