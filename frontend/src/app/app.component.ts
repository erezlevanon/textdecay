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
  shareReplay,
  timer,
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

  private readonly interval = interval(100);
  readonly latestRead = this.interval.pipe(
    switchMap(() => this.sensorApi.getSensorRead()),
    shareReplay(),
    tap(v => {
      const noise = Math.random() > 0.9 ? -1 : 1;
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
  }

  bodyTextAsHtml() {
    return this.text.textBodyAsHml$;
  }

  documentHeaderAsHtml() {
    return this.text.documentHeaderAsHtml$;
  }

  asciiHeader() {
    return this.text.asciiHeader$;
  }

  randomOffset(interval: number, unit: string = 'px'): string {
    return `${Math.floor(Math.random() * interval * 2) - interval}${unit}`;
  }

  private updateClasses() {
    for (const term of this.text.terms.value) {
      try {
        for (const e of this.elem.nativeElement.querySelectorAll(`.${term}`)) {
          // console.log(read, normalizedScore);
          timer(Math.random() * 2000).subscribe(() => {
            if (this.text.getTFIDF(term) > this.decayFactor) {
              e.classList.add('hidden');
            } else {
              e.classList.remove('hidden');
            }
          })
        }
      } catch {

      }
    }
  }

  getDecayFactor() {
    return this.decayFactor;
  }
}
