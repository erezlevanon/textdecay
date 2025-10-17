import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {catchError, map, Observable, of as observableOf} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SensorApiService {
  constructor(private http: HttpClient) {
  }

  getSensorRead(forceTrue: boolean = false): Observable<boolean> {
    let url = "api/v1/read_sensor/";

    // 1. Create HttpParams
    let params = new HttpParams();
    if (forceTrue) {
      params = params.set('force_true', "true");
    }

    return this.http.get(url, {params: params}).pipe(
      map(response => {
        return response as boolean;
      }),
      catchError((err) => {
        console.log('sensor read error', err);
        return observableOf(false);
      })
    );
  }
}
