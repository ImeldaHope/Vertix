import create from 'zustand';

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
  addWatched: (item: WatchedItem) => void;
  saveVideo: (id: string, uri: string) => void;
  toggleCreatorMode: () => void;
  setCoinBalance: (n: number) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  coinBalance: 0,
  watched: [],
  saved: [],
  creatorMode: false,
  addWatched: (item) => set((s) => ({ watched: [item, ...s.watched].slice(0, 200) })),
  saveVideo: (id, uri) => set((s) => ({ saved: [{ id, uri }, ...s.saved.filter((v) => v.id !== id)] })),
  toggleCreatorMode: () => set((s) => ({ creatorMode: !s.creatorMode })),
  setCoinBalance: (n) => set({ coinBalance: n })
}));

export default useProfileStore;
