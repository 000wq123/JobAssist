import { create } from "zustand";

const useUpgradeModal = create((set) => ({
  isOpen: false,
  feature: null,
  plan: null,
  used: null,
  limit: null,
  message: null,

  open: (data) => set({ isOpen: true, ...data }),
  close: () => set({ isOpen: false, feature: null, plan: null, used: null, limit: null, message: null }),
}));

export default useUpgradeModal;
