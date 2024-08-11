import {ChangeDetectionStrategy, Component, ElementRef, OnInit} from '@angular/core';
import {ActivatedRoute, RouterOutlet} from '@angular/router';
import {SensorApiService} from "./sensor_api.service";
import {TextService} from "./text.service";
import {
  auditTime,
  BehaviorSubject,
  Observable,
  tap,
  of as observableOf,
  interval,
  map,
  switchMap,
  shareReplay
} from "rxjs";
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe, NgIf, NgForOf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  title = 'decaying_storage_frontend';

  private readonly interval = interval(200);
  readonly latestRead = this.interval.pipe(
    switchMap(() => this.sensorApi.getSensorRead()),
    shareReplay(),
    tap(v => {
      const noise = Math.random() > 0.6 ? -1 : 1;
      const dir = v ? 1 : -1;
      const change = dir * noise;
      this.decayFactor = Math.max(this.decayFactor + change, 0);
    }),
    tap(() => this.updateClasses()));

  private decayFactor = 0;

  constructor(private readonly sensorApi: SensorApiService, private readonly text: TextService, private readonly route: ActivatedRoute, private elem: ElementRef) {
    this.latestRead.subscribe();
  }

  ngOnInit() {
    this.updateImages();
  }

  updateImages() {
    this.route.queryParams.subscribe((p) => {
      console.log(p);
      // this.imagesApi.getImagesList(p['dir']).subscribe(v => void this.curImages.next(v))
    })
  }

  asHtml() {
    return this.text.asHtml$;
  }

  updateViewer(imageData: ImageData) {

  }

  randomOffset(interval: number, unit: string = 'px'): string {
    return `${Math.floor(Math.random() * interval * 2) - interval}${unit}`;
  }

  private updateClasses() {
    for (const term of this.text.terms.value) {
      const normalizedScore = this.mapValue(this.text.getTFIDF(term), this.text.minScore.value, this.text.maxScore.value, 0, 1000);
      try {
        for (const e of this.elem.nativeElement.querySelectorAll(`.${term}`)) {
          // console.log(read, normalizedScore);
          if (normalizedScore > this.decayFactor) {
            e.classList.add('hidden');
          } else {
            e.classList.remove('hidden');
          }
        }
      } catch {

      }
    }
  }

  private mapValue(x: number, oldMin: number, oldMax: number, newMin: number, newMax: number) {
    return (x - oldMin / (oldMax - oldMin)) * (newMax - newMin) + newMin;
  }

  getDecayFactor() {
    return this.decayFactor;
  }
}
