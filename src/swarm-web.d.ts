export interface SwarmWebOptions {
  /** Number of particles, or 'auto' to scale with the canvas area. Default 'auto'. */
  count: number | 'auto';
  /** Auto mode: one particle per N square CSS pixels. Default 12000. */
  density: number;
  minCount: number;
  maxCount: number;
  /** Particle colors (array or comma-separated string). */
  colors: string[] | string;
  shape: 'dot' | 'triangle';
  size: number;
  speed: number;
  perception: number;
  separation: number;
  alignment: number;
  cohesion: number;
  /** Max distance for connecting lines; 0 disables lines. */
  linkDistance: number;
  linkColor: string | null;
  linkOpacity: number;
  linkWidth: number;
  interaction: 'repel' | 'attract' | 'none';
  interactionRadius: number;
  interactionStrength: number;
  opacity: number;
  background: string;
  /** Fixed, full-viewport background behind the whole page. */
  fullscreen: boolean;
  zIndex: number;
  maxDpr: number;
  respectReducedMotion: boolean;
}

export declare const DEFAULTS: Readonly<SwarmWebOptions>;

export declare class SwarmWeb {
  constructor(target: HTMLElement | HTMLCanvasElement | string, options?: Partial<SwarmWebOptions>);
  options: SwarmWebOptions;
  readonly canvas: HTMLCanvasElement;
  start(): this;
  stop(): this;
  setOptions(options: Partial<SwarmWebOptions>): this;
  destroy(): void;
}

export declare function defineSwarmWeb(tagName?: string): CustomElementConstructor | undefined;

export default SwarmWeb;

declare global {
  interface HTMLElementTagNameMap {
    'swarm-web': HTMLElement & { swarm: SwarmWeb | null };
  }
}
