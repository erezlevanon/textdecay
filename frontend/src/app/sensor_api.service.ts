import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SensorApiService {
  constructor(private http: HttpClient) {
  }

  getSensorRead(): Observable<boolean> {
    let url = "http://localhost:8000/api/v1/read_sensor/";
    return (this.http.get(url)).pipe(map(response => {
      return response as boolean;
    }));
  }
}
