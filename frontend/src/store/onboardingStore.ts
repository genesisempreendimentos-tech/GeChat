import { create } from "zustand"
import { persist } from "zustand/middleware"

interface OnboardingState {
  hasSeenOnboarding: boolean
  currentStep: number
  isOnboardingActive: boolean
  setHasSeenOnboarding: (seen: boolean) => void
  setCurrentStep: (step: number) => void
  setIsOnboardingActive: (active: boolean) => void
  nextStep: () => void
  previousStep: () => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      currentStep: 0,
      isOnboardingActive: false,

      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setIsOnboardingActive: (active) => set({ isOnboardingActive: active }),

      nextStep: () =>
        set((state) => ({ currentStep: state.currentStep + 1 })),

      previousStep: () =>
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        })),

      resetOnboarding: () =>
        set({
          hasSeenOnboarding: false,
          currentStep: 0,
          isOnboardingActive: false,
        }),
    }),
    {
      name: "onboarding-storage",
    }
  )
)
