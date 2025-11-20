declare module "butterchurn" {
  export interface VisualizerOptions {
    width: number;
    height: number;
    meshWidth?: number;
    meshHeight?: number;
    pixelRatio?: number;
  }

  export interface Preset {
    name: string;
    [key: string]: unknown;
  }

  export interface Visualizer {
    loadPreset(preset: Preset, blendTime?: number): void;
    render(): void;
    setRendererSize(width: number, height: number): void;
    connectAudio(audioNode: AudioNode): void;
    disconnectAudio(audioNode: AudioNode): void;
    launchSongTitleAnim(title: string): void;
  }

  interface Butterchurn {
    createVisualizer(
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options: VisualizerOptions
    ): Visualizer;
  }

  const butterchurn: Butterchurn;
  export default {
    default: butterchurn,
  };
}

declare module "butterchurn-presets" {
  export interface PresetCollection {
    [presetName: string]: {
      name: string;
      [key: string]: unknown;
    };
  }

  export function getPresets(): PresetCollection;
  export function getMainPresets(): PresetCollection;
  export function getExtraPresets(): PresetCollection;
  export function getIdlePresets(): PresetCollection;

  const butterchurnPresets: {
    getPresets(): PresetCollection;
    getMainPresets(): PresetCollection;
    getExtraPresets(): PresetCollection;
    getIdlePresets(): PresetCollection;
  };

  export default butterchurnPresets;
}
