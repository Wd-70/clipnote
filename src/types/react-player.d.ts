declare module 'react-player' {
  import { Component } from 'react';

  interface ReactPlayerProps {
    url?: string | string[] | MediaStream;
    playing?: boolean;
    loop?: boolean;
    controls?: boolean;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    progressInterval?: number;
    playsinline?: boolean;
    pip?: boolean;
    stopOnUnmount?: boolean;
    light?: boolean | string;
    fallback?: React.ReactNode;
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
    playIcon?: React.ReactNode;
    previewTabIndex?: number;
    config?: {
      youtube?: Record<string, unknown>;
      facebook?: Record<string, unknown>;
      dailymotion?: Record<string, unknown>;
      vimeo?: Record<string, unknown>;
      file?: Record<string, unknown>;
      wistia?: Record<string, unknown>;
      mixcloud?: Record<string, unknown>;
      soundcloud?: Record<string, unknown>;
      twitch?: Record<string, unknown>;
    };
    onReady?: (player: ReactPlayer) => void;
    onStart?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onBuffer?: () => void;
    onBufferEnd?: () => void;
    onEnded?: () => void;
    onError?: (error: unknown) => void;
    onDuration?: (duration: number) => void;
    onSeek?: (seconds: number) => void;
    onProgress?: (state: {
      played: number;
      playedSeconds: number;
      loaded: number;
      loadedSeconds: number;
    }) => void;
    onClickPreview?: (event: React.MouseEvent) => void;
    onEnablePIP?: () => void;
    onDisablePIP?: () => void;
  }

  export default class ReactPlayer extends Component<ReactPlayerProps> {
    static canPlay(url: string): boolean;
    seekTo(amount: number, type?: 'seconds' | 'fraction'): void;
    getCurrentTime(): number;
    getSecondsLoaded(): number;
    getDuration(): number;
    getInternalPlayer(key?: string): unknown;
    showPreview(): void;
  }
}

declare module 'react-player/lazy' {
  import ReactPlayer from 'react-player';
  export default ReactPlayer;
}
