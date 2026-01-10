import create from 'zustand';
import * as profileApi from '../api/profile';

type WatchedItem = {
  id: string;
  uri: string;
  watchedAt: number;
  seconds: number;
};

type ProfileState = {
  coinBalance: number;
  watched: WatchedItem[];
  saved: { id: string; uri: string }[];
  creatorMode: boolean;
  addWatched: (item: WatchedItem) => Promise<void>;
  saveVideo: (id: string, uri?: string) => Promise<void>;
  toggleCreatorMode: () => void;
  setCoinBalance: (n: number) => void;
  loadFromServer: () => Promise<void>;
  receipts: any[];
  addReceipt: (r: any) => void;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  coinBalance: 0,
  watched: [],
  saved: [],
  creatorMode: false,
  addWatched: async (item) => {
    set((s) => ({ watched: [item, ...s.watched].slice(0, 200) }));
    try {
      await profileApi.reportWatched(item.id, item.seconds);
    } catch (e) {
      // server may fail; keep local history for reconciliation
      console.warn('reportWatched failed', e);
    }
  },
  addCoins: (n: number) => set((s) => ({ coinBalance: s.coinBalance + n })),
  receipts: [],
  addReceipt: (r) => set((s) => ({ receipts: [r, ...s.receipts].slice(0, 200) })),
  saveVideo: async (id, uri) => {
    set((s) => ({ saved: [{ id, uri: uri || '' }, ...s.saved.filter((v) => v.id !== id)] }));
    try {
      await profileApi.saveVideo(id);
    } catch (e) {
      console.warn('saveVideo failed', e);
    }
  },
  toggleCreatorMode: () => set((s) => ({ creatorMode: !s.creatorMode })),
  setCoinBalance: (n) => set({ coinBalance: n }),
  loadFromServer: async () => {
    try {
      const [profileResp, coinsResp] = await Promise.all([profileApi.getProfile(), profileApi.getCoins()]);
      const profile = profileResp.data;
      const coins = coinsResp.data?.coins ?? 0;
      set({
        coinBalance: coins,
        saved: profile.saved || [],
        watched: profile.watched || [],
        creatorMode: profile.creatorMode || false
      });
    } catch (e) {
      console.warn('loadFromServer failed', e);
    }
  }
}));

export default useProfileStore;
