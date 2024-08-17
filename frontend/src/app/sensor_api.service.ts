import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map, Observable, of as ObservableOf} from "rxjs";
import {environment} from "../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class SensorApiService {
  constructor(private http: HttpClient) {
  }

  getSensorRead(): Observable<boolean> {
    if (environment.mockSensorData) {
      return ObservableOf(true);
    }
    let url = "api/v1/read_sensor/";
    return (this.http.get(url)).pipe(map(response => {
      return response as boolean;
    }));
  }
}
