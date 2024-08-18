import {Injectable} from '@angular/core';
import {environment} from "../environments/environment";
import {BehaviorSubject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SoundsService {

  private readonly muted = new BehaviorSubject(true);

  private readonly clickSound = new Audio();
  private readonly beepSound = new Audio();
  private readonly volume = 1.0;

  constructor() {
    this.clickSound.src = `${environment.deployUrl}assets/sounds/click.mp3`;
    this.clickSound.load();
    this.beepSound.src = `${environment.deployUrl}assets/sounds/beep.mp3`;
    this.beepSound.load();
    this.beepSound.volume = 0.8;
  }

  click() {
    if (!this.muted.value) {
      const tempSound: HTMLAudioElement = this.clickSound.cloneNode() as HTMLAudioElement;
      tempSound.volume = this.volume;

      tempSound.onended = () => this.clearSound(tempSound);
      tempSound.play().catch(() => this.clearSound(tempSound));
    }
  }

  private clearSound(audio: HTMLAudioElement) {
    audio.remove();
    audio.srcObject = null;
  }

  beep() {
    if (!this.muted.value) {
      this.beepSound.play();
    }
  }

  setMuted(muted: boolean) {
    this.muted.next(muted);
  }

  getMuted() {
    return this.muted;
  }

  toggleMuted() {
    this.setMuted(!this.getMuted().value);
  }
}
