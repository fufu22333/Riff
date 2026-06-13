import { Camera, MessageSquareText, Mic2, Music2, Server } from "lucide-react";

const statusItems = [
  { label: "Camera", value: "Placeholder", icon: Camera },
  { label: "Mic / VAD", value: "Not connected", icon: Mic2 },
  { label: "Storage", value: "Server only", icon: Server }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stage text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-5 py-5">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-signal">Visual music partner</p>
            <h1 className="mt-1 text-4xl font-semibold">Riff</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            PR0 foundation: camera workspace, conversation workspace, and runtime status shell are ready for the P0
            vertical slices.
          </p>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
          <section
            aria-label="Camera workspace"
            className="flex min-h-[420px] flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Camera workspace</h2>
                <p className="mt-1 text-sm text-slate-600">Live preview and snapshot capture land in PR1.</p>
              </div>
              <Camera className="h-6 w-6 text-signal" aria-hidden="true" />
            </div>

            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
              <div className="max-w-sm px-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-signal shadow-sm">
                  <Camera className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="mt-4 text-base font-medium">Preview placeholder</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  No real camera access in PR0. This region reserves stable layout for permission, preview, and
                  snapshot states.
                </p>
              </div>
            </div>
          </section>

          <section
            aria-label="Conversation workspace"
            className="flex min-h-[420px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-xl font-semibold">Conversation workspace</h2>
                <p className="mt-1 text-sm text-slate-600">Structured replies and visual evidence arrive after PR3.</p>
              </div>
              <MessageSquareText className="h-6 w-6 text-signal" aria-hidden="true" />
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">User transcript</p>
                <p className="mt-2 text-base text-slate-800">Waiting for ASR in PR2.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-500">AI response</p>
                <p className="mt-2 text-base leading-6 text-slate-800">
                  The future response will always include visual evidence or a clear visual failure reason.
                </p>
              </div>
              <div className="mt-auto rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Music2 className="h-4 w-4" aria-hidden="true" />
                  Music suggestion shell
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  Mood, tempo, instruments, and structure will render here once `/api/chat` is wired.
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer
          role="contentinfo"
          aria-label="Status workspace"
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3"
        >
          {statusItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3">
                <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              </div>
            );
          })}
        </footer>
      </div>
    </main>
  );
}
