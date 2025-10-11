import {Injectable} from '@angular/core';
import {environment} from '../environments/environment';

@Injectable({providedIn: 'root'})
export class SoundsService {
  private context = new AudioContext();

  private clickBuffer: AudioBuffer | null = null;
  private beepBuffer: AudioBuffer | null = null;

  private volume = 1.0;

  constructor() {
    // Preload sounds
    this.loadSound(`${environment.deployUrl}/assets/sounds/click.mp3`)
      .then(buffer => this.clickBuffer = buffer)
      .catch(() => console.warn('Failed to load click sound'));

    this.loadSound(`${environment.deployUrl}/assets/sounds/beep.mp3`)
      .then(buffer => this.beepBuffer = buffer)
      .catch(() => console.warn('Failed to load beep sound'));

    // Resume context on first interaction (needed in modern browsers)
    window.addEventListener('click', () => this.resumeContext(), {once: true});
  }

  private async loadSound(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.context.decodeAudioData(arrayBuffer);
  }

  private resumeContext() {
    if (this.context.state === 'suspended') {
      this.context.resume().then(() => {
        console.log('AudioContext resumed');
      });
    }
  }

  private playBuffer(buffer: AudioBuffer | null, volume: number = 1.0) {
    if (!buffer) return;

    const source = this.context.createBufferSource();
    const gainNode = this.context.createGain();

    gainNode.gain.value = volume;

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    source.start();
  }

  click() {
    this.playBuffer(this.clickBuffer, this.volume);
  }

  beep() {
    this.playBuffer(this.beepBuffer, this.volume * 0.8); // quieter beep
  }
}
