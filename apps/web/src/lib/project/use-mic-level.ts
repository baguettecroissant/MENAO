"use client";

import { SILENCE_RMS, SILENCE_WARNING_MS, levelFromRms, rms } from "@menao/core";
import { useEffect, useState } from "react";

const IDLE = { level: 0, quiet: false };

/**
 * Niveau du micro en direct (de 0 à 1) et silence prolongé (plus de 3 secondes sous le seuil)
 * pendant un enregistrement (F-05, F-19) : l'utilisateur voit tout de suite si sa voix est captée.
 * Sans contexte audio actif (navigateur qui le suspend), rien n'est signalé : le contrôle final
 * porte de toute façon sur l'enregistrement décodé.
 */
export function useMicLevel(stream: MediaStream | null): { level: number; quiet: boolean } {
  // Mesure rattachée à son flux : un nouvel enregistrement repart de zéro.
  const [state, setState] = useState<{ stream: MediaStream | null; level: number; quiet: boolean }>(
    { stream: null, ...IDLE },
  );
  useEffect(() => {
    if (!stream) return;
    const context = new AudioContext();
    void context.resume();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    let frame = 0;
    let last = 0;
    let heardAt = performance.now();
    const loop = (now: number) => {
      if (context.state === "running") {
        analyser.getFloatTimeDomainData(data);
        const value = rms(data);
        if (value >= SILENCE_RMS) heardAt = now;
        // Affichage rafraîchi dix fois par seconde au plus.
        if (now - last >= 100) {
          last = now;
          setState({
            stream,
            level: levelFromRms(value),
            quiet: now - heardAt >= SILENCE_WARNING_MS,
          });
        }
      } else {
        heardAt = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [stream]);
  return stream && state.stream === stream ? state : IDLE;
}
