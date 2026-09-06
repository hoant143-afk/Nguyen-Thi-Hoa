import { apiClient } from '../services/apiClient';
import { GAME_REGISTRY, GameDefinition } from '../games/gameRegistry';

export class GamesRepository {
  public static async listGames(): Promise<GameDefinition[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('games.list');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // Merge server catalog with local definitions
          return GAME_REGISTRY.map(localGame => {
            const serverGame = res.data?.find((g: any) => g.slug === localGame.id || g.id === localGame.id);
            if (serverGame) {
              return {
                ...localGame,
                name: serverGame.name || localGame.name,
                description: serverGame.description || localGame.description,
                enabled: serverGame.enabled !== false,
                featured: serverGame.featured === true,
              };
            }
            return localGame;
          });
        }
      } catch (err) {
        console.warn('Failed to load games catalog from cloud, falling back to local registry', err);
      }
    }
    return GAME_REGISTRY;
  }

  public static async getGame(slug: string): Promise<GameDefinition | null> {
    const games = await this.listGames();
    return games.find(g => g.id === slug) || null;
  }
}
