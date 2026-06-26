import { PulseAidApp } from '@/components/pulse-aid-app'

export default function Page() {
  return (
    <main className="min-h-dvh w-full bg-background flex justify-center">
      <div className="w-full max-w-[390px] min-h-dvh relative flex flex-col">
        <PulseAidApp />
      </div>
    </main>
  )
}
