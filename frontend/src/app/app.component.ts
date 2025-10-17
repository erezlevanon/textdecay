import {ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, OnDestroy} from '@angular/core';
import {SensorApiService} from "./sensor_api.service";
import {TextService} from "./text.service";
import {
  tap,
  interval,
  map,
  switchMap,
  shareReplay,
  combineLatest,
  timer,
  BehaviorSubject,
  take,
  delay,
  distinctUntilChanged,
  merge,
  Subject,
  bufferCount,
  filter,
  takeUntil, startWith,
} from "rxjs";
import {AsyncPipe, formatNumber, NgForOf, NgIf} from "@angular/common";
import {Title} from "@angular/platform-browser";
import {environment} from "../environments/environment";
import {SoundsService} from "./sounds.service";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

enum Directions {
  APPEAR = 1,
  DECAY = -1
}

// Playable constants
const DIRECTION: Directions = Directions.DECAY;
const DECAY_RATE = 0.1;
const INITIAL_RESPONSE_TIME_SECOND = 3;
const SENSOR_READ_TIME = 1000;
const SIGNAL_TO_NOISE = 0.6;

const BLINK_EVERY_MS = 2000;
const BLINK_OFF_MS = 300;

const ALLOW_FLICKER = true;
const FANCY_HIDDEN = false;

// Calculated constants
const READS_TO_START = INITIAL_RESPONSE_TIME_SECOND * 1000 / SENSOR_READ_TIME;
const ALLOWED_MIN = TextService.NORMALIZED_MIN * (1 - DECAY_RATE) ** READS_TO_START;
const ALLOWED_MAX = TextService.NORMALIZED_MAX * (1 + DECAY_RATE) ** READS_TO_START;
const INITIAL_DECAY_FACTOR = DIRECTION === Directions.APPEAR as Directions ? ALLOWED_MIN : ALLOWED_MAX;

// Close window counter
const CONSECUTIVE_CLICKS_REQUIRED = 5;
const MAX_TIME_BETWEEN_CLICKS_MS = 800;


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AsyncPipe, NgIf, NgForOf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'decaying_storage_frontend';

  private forceTrue_ = false;

  private destroy$ = new Subject<void>();

  private readonly interval = interval(SENSOR_READ_TIME);
  readonly latestRead = this.interval.pipe(
    switchMap(() => this.sensorApi.getSensorRead(this.forceTrue_)),
    tap(v => {
      if (v && !this.forceTrue_) {
        this.forceTrue_ = true;
      }
    }),
    map(v => DIRECTION === Directions.APPEAR ? v : !v),
    shareReplay(1),
    tap(v => {
      const noise = Math.random() > SIGNAL_TO_NOISE ? -1 : 1;
      const dir = (v ? 1 : -1) * DIRECTION;
      const change = (dir * noise * DECAY_RATE);
      const directionalChange = DIRECTION === Directions.APPEAR ? 1 + change : 1 - change;
      this.decayFactor = Math.min(Math.max(this.decayFactor * directionalChange, ALLOWED_MIN), ALLOWED_MAX);
      if (this.decayFactor == ALLOWED_MIN) {
        setTimeout(() => {
          console.log("all clear");
          this.forceTrue_ = false;
        }, 5000);
      }
    }),
    tap(() => {
      this.updateClasses();
    }));

  private decayFactor = INITIAL_DECAY_FACTOR;
  private numTerms = 0;
  private readonly displaySize = new BehaviorSubject<string>("");

  readonly blinkVisibility = merge(
    timer(0, BLINK_EVERY_MS).pipe(map(() => 1)),
    timer(BLINK_EVERY_MS - BLINK_OFF_MS, BLINK_EVERY_MS).pipe(map(() => 0)),
  ).pipe(tap(visible => {
    if (visible) this.sounds.beep();
  }));

  readonly blinkText = this.latestRead.pipe(map((read) => {
    return read === (DIRECTION === Directions.APPEAR) ? "you are standing here." : "you are not standing here.";
  }), startWith('Initializing...'));

  private termToElements = new Map<string, any>();
  private idToVisibility = new Map<string, boolean>();

  // To close tab after 5 consecutive clicks.
  private readonly click$ = new Subject<MouseEvent>();

  constructor(private readonly sensorApi: SensorApiService, private readonly text: TextService,
              private readonly sounds: SoundsService, private readonly titleService: Title, private elem: ElementRef) {
    console.log("SANITY: constructor");
    this.latestRead.pipe(takeUntil(this.destroy$)).subscribe();
    this.setupConsecutiveClickWatcher();
    this.displaySize.pipe(distinctUntilChanged(), takeUntilDestroyed()).subscribe(v => {
      if (!this.termToElements.get('18kb')?.length) return;
      this.termToElements.get('18kb')[0].innerHTML = v;
    });
  }

  ngOnInit() {
    console.log("SANITY: on init");
    if (environment.isDevelopment) {
      this.titleService.setTitle("🐣 " + this.titleService.getTitle());
    }
    this.cacheTermElements();
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

  // Also adds IDs to the terms.
  private cacheTermElements() {
    const triggers = [
      this.text.terms.pipe(filter(v => v.length > 0)),
      this.bodyTextAsHtml().pipe(filter(v => v != "")),
      this.documentHeaderAsHtml().pipe(filter(v => v != "")),
    ];
    combineLatest(triggers).pipe(delay(0), takeUntil(this.destroy$)).subscribe(([terms, _unused0, _unused1]) => {
      console.log('SANITY: combine latest in cache term elements');
      this.numTerms = 0;
      this.termToElements.clear();
      for (let term of terms) {
        try {
          const elements = this.elem.nativeElement.querySelectorAll(`.${this.text.termToClass(term)}`);
          this.termToElements.set(term, elements);
          this.addIdToElements(elements);
          this.numTerms += elements.length;
        } catch {
          console.log(`failed getting elements for: ${term}`);
        }
      }
      console.log(`terms: ${terms.length}`);
      console.log(`words: ${this.numTerms}`);
    })
  }

  private addIdToElements(elements: any[]) {
    for (let e of elements) {
      const id = `_vis_${this.idToVisibility.size}`;
      e.id = id;
      if (this.idToVisibility.has(id)) console.log('double id, shouldnt happen.');
      this.idToVisibility.set(id, true);
    }
  }

  private updateClasses() {
    let i = 0;
    let shownCount = 0;
    for (const term of this.text.terms.value) {
      if (!this.termToElements.has(term)) continue;
      for (const e of this.termToElements.get(term)) {
        const targetVisibility = this.targetVisibility(term);
        if (targetVisibility) shownCount++;
        const id = e.id;
        if (targetVisibility == this.idToVisibility.get(id)) continue;
        this.idToVisibility.set(id, targetVisibility);
        setTimeout(() => {
          let size_before = e.classList.length;
          const visibility = ALLOW_FLICKER ? targetVisibility : this.targetVisibility(term);
          this.idToVisibility.set(id, visibility);
          if (!visibility) {
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
        }, Math.random() * 4000);
        i++;
      }
    }
    this.updateDisplaySize(shownCount);
  }

  private targetVisibility(term: string): boolean {
    return this.text.getTFIDF(term) <= this.decayFactor;
  }

  private updateDisplaySize(shownCount: number) {
    const minSize = 263;
    const maxDisplaySize = 18000;
    let curDisplaySize = Math.ceil(maxDisplaySize * shownCount / this.numTerms);
    let unit = 'kb'
    if (curDisplaySize < 1100) {
      unit = 'b';
      curDisplaySize += minSize;
    } else {
      curDisplaySize = curDisplaySize / 1000;
    }
    this.displaySize.next(`${formatNumber(curDisplaySize, "en-US", "1.0-1")}${unit}`);
  }

  getDecayFactor() {
    return this.decayFactor;
  }

  // 2. HostListener to capture clicks on the component's host element
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    this.click$.next(event);
  }

  private setupConsecutiveClickWatcher(): void {
    this.click$.pipe(
      bufferCount(CONSECUTIVE_CLICKS_REQUIRED, 1),
      map(clicks => {
        return clicks.every((v, i) => i === 0 ? true : clicks[i].timeStamp - clicks[i - 1].timeStamp < MAX_TIME_BETWEEN_CLICKS_MS);
      }),
      filter(v => v),
      take(1),
    ).subscribe(() => {
      console.log('5 consecutive clicks detected! Closing tab...');
      window.close();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
