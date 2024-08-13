import {Injectable} from '@angular/core';
import {environment} from "../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class SoundsService {

  private readonly clickSound = new Audio();
  private readonly volume = 0.4;

  constructor() {
    this.clickSound.src = `${environment.deployUrl}/assets/sounds/click.mp3`;
    this.clickSound.load();
  }

  click() {
    const tempSound: HTMLAudioElement = this.clickSound.cloneNode() as HTMLAudioElement;
    tempSound.volume = this.volume;
    const clear = () => {
      tempSound.remove();
      tempSound.srcObject = null;
    }
    tempSound.onended = () => clear();
    tempSound.play().catch(() => {
      clear();
    });
  }
}
