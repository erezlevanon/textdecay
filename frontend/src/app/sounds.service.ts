import {Injectable} from '@angular/core';
import {environment} from "../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class SoundsService {

  private readonly clickSound = new Audio();
  private readonly beepSound = new Audio();
  private readonly volume = 0.8;

  constructor() {
    this.clickSound.src = `${environment.deployUrl}/assets/sounds/click.mp3`;
    this.clickSound.load();
    this.beepSound.src = `${environment.deployUrl}/assets/sounds/beep.mp3`;
    this.beepSound.load();
    this.beepSound.volume = 0.3;
  }

  click() {
    const tempSound: HTMLAudioElement = this.clickSound.cloneNode() as HTMLAudioElement;
    tempSound.volume = this.volume;

    tempSound.onended = () => this.clearSound(tempSound);
    tempSound.play().catch(() => this.clearSound(tempSound));
  }

  private clearSound(audio: HTMLAudioElement) {
     audio.remove();
     audio.srcObject = null;
  }

  beep() {
    this.beepSound.play();
  }
}
