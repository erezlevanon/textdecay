import { TestBed } from '@angular/core/testing';

import { ImagesApiService } from './sensor_api.service';

describe('ImagesServiceService', () => {
  let service: ImagesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImagesApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
