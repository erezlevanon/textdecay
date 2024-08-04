import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
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
  ), shareReplay())

  constructor(private readonly sensorApi: SensorApiService, private readonly text: TextService, private readonly route: ActivatedRoute) {
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

  getSensorRead(): Observable<number> {
    return this.latestRead;
  }
}
