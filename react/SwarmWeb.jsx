'use client';
// React wrapper for swarm-web. Copy this file AND dist/swarm-web.mjs into the same folder,
// e.g. src/components/swarm-web/{SwarmWeb.jsx, swarm-web.mjs}.
// Works with Vite, CRA, Next.js (App Router: 'use client' above; Pages Router: fine as-is).
import { useEffect, useRef } from 'react';
import { SwarmWeb as SwarmEngine } from './swarm-web.mjs';

/**
 * <SwarmWeb className="h-[60vh]"> ...content on top... </SwarmWeb>   // swarm inside a section
 * <SwarmWeb fullscreen />                                             // fixed background for the whole page
 *
 * All other props are swarm-web options (colors, count, speed, linkDistance, interaction, ...).
 */
export default function SwarmWeb({ fullscreen = false, as: Tag = 'div', className, style, children, ...options }) {
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    const target = fullscreen ? document.body : hostRef.current;
    if (!target) return undefined;
    const engine = new SwarmEngine(target, { ...JSON.parse(optionsKey), fullscreen });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Re-create only when the mount mode changes; option changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setOptions(JSON.parse(optionsKey));
  }, [optionsKey]);

  if (fullscreen) return children ?? null;
  return (
    <Tag ref={hostRef} className={className} style={{ position: 'relative', ...style }}>
      {children}
    </Tag>
  );
}
