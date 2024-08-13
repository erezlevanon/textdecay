import {ChangeDetectionStrategy, Component, ElementRef, OnInit} from '@angular/core';
import {ActivatedRoute, RouterOutlet} from '@angular/router';
import {SensorApiService} from "./sensor_api.service";
import {TextService} from "./text.service";
import {
  tap,
  interval,
  map,
  switchMap,
  shareReplay,
  timer, BehaviorSubject, take, withLatestFrom,
} from "rxjs";
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {Title} from "@angular/platform-browser";
import {environment} from "../environments/environment";
import {SoundsService} from "./sounds.service";

enum Directions {
  APPEAR = 1,
  DECAY = -1
}

// Playable constants
const DIRECTION: Directions = Directions.DECAY;
const DECAY_RATE = 0.01;
const INITIAL_RESPONSE_TIME_SECOND = 3;
const SENSOR_READ_TIME = 100;
const SIGNAL_TO_NOISE = 0.6;;
const ALLOW_FLICKER = true;
const FANCY_HIDDEN = false;

// Calculated constants
const READS_TO_START = INITIAL_RESPONSE_TIME_SECOND * 1000 / SENSOR_READ_TIME;
const ALLOWED_MIN = TextService.NORMALIZED_MIN * (1 - DECAY_RATE) ** READS_TO_START;
const ALLOWED_MAX = TextService.NORMALIZED_MAX * (1 + DECAY_RATE) ** READS_TO_START;
const INITIAL_DECAY_FACTOR = DIRECTION === Directions.APPEAR as Directions ? ALLOWED_MIN : ALLOWED_MAX;


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

  private readonly interval = interval(SENSOR_READ_TIME);
  readonly latestRead = this.interval.pipe(
    switchMap(() => this.sensorApi.getSensorRead()),
    map(v => DIRECTION === Directions.APPEAR ? v : !v),
    shareReplay(),
    tap(v => {
      const noise = Math.random() > SIGNAL_TO_NOISE ? -1 : 1;
      const dir = (v ? 1 : -1) * DIRECTION;
      const change = (dir * noise * DECAY_RATE);
      const directionalChange = DIRECTION === Directions.APPEAR ? 1 + change : 1 - change;
      this.decayFactor = Math.min(Math.max(this.decayFactor * directionalChange, ALLOWED_MIN), ALLOWED_MAX);
    }),
    tap(() => this.updateClasses()));

  private decayFactor = INITIAL_DECAY_FACTOR;
  private numTerms = 0;
  private readonly displaySize = new BehaviorSubject<string>("");

  constructor(private readonly sensorApi: SensorApiService, private readonly text: TextService,
              private readonly sounds: SoundsService, private readonly titleService: Title, private elem: ElementRef) {
    this.latestRead.subscribe();
  }

  ngOnInit() {
    if (environment.isDevelopment) {
      this.titleService.setTitle("🐣 " + this.titleService.getTitle());
    }
    this.text.documentHeaderAsHtml$.pipe(take(1)).subscribe(
      (v) => {
        this.numTerms = this.countTerms();
        console.log("count", this.numTerms);
      }
    );
  }

  bodyTextAsHtml() {
    return this.text.textBodyAsHml$;
  }

  documentHeaderAsHtml() {
    return this.text.documentHeaderAsHtml$.pipe(
      withLatestFrom(this.displaySize),
      map(([text, displaySize]) => text.replaceAll("18kb", displaySize)));
  }

  asciiHeader() {
    return this.text.asciiHeader$;
  }

  randomOffset(interval: number, unit: string = 'px'): string {
    return `${Math.floor(Math.random() * interval * 2) - interval}${unit}`;
  }

  private countTerms() {
    let res = 0;
    for (const term of this.text.terms.value) {
      try {
        res += this.elem.nativeElement.querySelectorAll(`.${term}`).length;
      } catch {

      }
    }
    return res;
  }

  private updateClasses() {
    let i = 0;
    let shownCount = 0;
    for (const term of this.text.terms.value) {
      try {
        for (const e of this.elem.nativeElement.querySelectorAll(`.${term}`)) {
          const shouldHide = this.shouldHide(term);
          if (!shouldHide) shownCount++;
          timer(Math.random() * 2000).subscribe(() => {
            let size_before = e.classList.length;
            if (ALLOW_FLICKER ? shouldHide : this.shouldHide(term)) {
              e.classList.add('hidden');
              if (FANCY_HIDDEN) {
                e.classList.add(`hidden-${(term.length + i) % 10}`);
              }
            } else {
              e.classList.remove('hidden');
            }
            if (size_before < e.classList.length) {
              this.sounds.click();
            }
          });
          i++;
        }
      } catch {

      }
    }
    this.updateDisplaySize(shownCount);
  }

  private shouldHide(term: string): boolean {
    return this.text.getTFIDF(term) > this.decayFactor;
  }

  private updateDisplaySize(shownCount: number) {
    this.displaySize.next(shownCount / this.numTerms + "");
  }

  getDecayFactor() {
    return this.decayFactor;
  }
}
