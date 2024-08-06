import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SensorApiService {
  constructor(private http: HttpClient) {
  }

  getSensorRead(): Observable<number> {
    let url = "http://localhost:8000/api/v1/read_sensor/";
    return (this.http.get(url)).pipe(map(response => {
      return response as number;
    }));
  }

  resetMock(): Observable<any> {
    let url = "http://localhost:8000/api/v1/reset_mock/";
     return (this.http.get(url)).pipe(map(response => {
      return response;
    }));
  }
}
