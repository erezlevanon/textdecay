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

  private readonly interval = interval(1000);

  private readonly latestRead = this.interval.pipe(switchMap(
    () => this.sensorApi.getSensorRead()
  ), shareReplay(), tap((read) => this.updateClasses(read)))

  constructor(private readonly sensorApi: SensorApiService, private readonly text: TextService, private readonly route: ActivatedRoute, private elem: ElementRef) {
  }

  ngOnInit() {
    this.updateImages();
    this.sensorApi.resetMock().subscribe();
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

  getSensorRead(): Observable<number> {
    return this.latestRead;
  }

  private updateClasses(read: number) {
    for (const term of this.text.terms.value) {
      const normalizedScore = this.mapValue(this.text.getTFIDF(term), this.text.minScore.value, this.text.maxScore.value, 0, 1000);
      try {
        for (const e of this.elem.nativeElement.querySelectorAll(`.${term}`)) {
          // console.log(read, normalizedScore);
          if (normalizedScore > read) {
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
}
