"use client";

import { AlertTriangle, Eye, Gauge } from "lucide-react";
import React from "react";

import type { VisualObservation } from "@/lib/contracts/chat";

type VisualEvidenceProps = {
  observation: VisualObservation;
};

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

export function VisualEvidence({ observation }: VisualEvidenceProps) {
  const isLowConfidence = observation.isUsable && observation.confidence < 0.5;

  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-3" aria-label="视觉理解">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
        {observation.isUsable ? (
          <Eye className="h-4 w-4 text-signal" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
        )}
        <span>{observation.isUsable ? "AI 看到的画面" : "视觉不可用"}</span>
        {isLowConfidence ? (
          <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            置信度较低
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-800">
        {observation.isUsable
          ? observation.summary
          : `${observation.failureReason} - Riff 没有编造画面，只根据你说的话继续交流。`}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-700">
        <span className="rounded-sm bg-white px-2 py-1 ring-1 ring-slate-200">
          置信度 {formatConfidence(observation.confidence)}
        </span>
        {observation.sceneMood ? (
          <span className="rounded-sm bg-white px-2 py-1 ring-1 ring-slate-200">{observation.sceneMood}</span>
        ) : null}
        {observation.motionEnergy ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-white px-2 py-1 ring-1 ring-slate-200">
            <Gauge className="h-3 w-3" aria-hidden="true" />
            {observation.motionEnergy}
          </span>
        ) : null}
        {observation.objects.map((object) => (
          <span key={object} className="rounded-sm bg-white px-2 py-1 ring-1 ring-slate-200">
            {object}
          </span>
        ))}
      </div>
    </section>
  );
}
