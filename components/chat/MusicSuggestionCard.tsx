"use client";

import { Music2, Wand2 } from "lucide-react";
import React from "react";

import type { ChatResponse, MusicSuggestion } from "@/lib/contracts/chat";

type MusicSuggestionCardProps = {
  suggestion: MusicSuggestion;
  suggestedActions?: ChatResponse["suggestedActions"];
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase text-amber-800">{label}</p>
      <p className="mt-1 text-sm leading-5 text-amber-950">{value}</p>
    </div>
  );
}

export function MusicSuggestionCard({ suggestion, suggestedActions = [] }: MusicSuggestionCardProps) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-3" aria-label="Music suggestion">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Music2 className="h-4 w-4" aria-hidden="true" />
        Music suggestion
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Mood" value={suggestion.mood} />
        <Field label="Tempo" value={suggestion.tempo} />
        <Field label="Instruments" value={suggestion.instruments.join(", ")} />
        <Field label="Structure" value={suggestion.structure} />
      </div>

      {suggestion.promptForMusicGen ? (
        <p className="mt-3 rounded-sm bg-white px-2 py-2 text-xs leading-5 text-amber-950 ring-1 ring-amber-200">
          {suggestion.promptForMusicGen}
        </p>
      ) : null}

      {suggestedActions.includes("generate_music") ? (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950"
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Generate music
        </button>
      ) : null}
    </section>
  );
}
