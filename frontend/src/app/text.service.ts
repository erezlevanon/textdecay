import {APP_BASE_HREF} from '@angular/common'
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {
  BehaviorSubject, combineLatest,
  combineLatestAll,
  distinctUntilChanged,
  map,
  Observable,
  ReplaySubject,
  shareReplay,
  switchMap,
  tap, zip
} from "rxjs";
import {compareNumbers} from "@angular/compiler-cli/src/version_helpers";

@Injectable({
  providedIn: 'root'
})
export class TextService {

  private readonly deployUrl = 'static/text_decay_api_app/browser';

  private readonly internalDocumentHeader$: Observable<string> = this.getDocumentHeader();
  private readonly internalBodyText$: Observable<string> = this.getBodyText();
  readonly asciiHeader$ = this.getAsciiHeader();

  private canonicalToInstance: Map<string, Set<string>> = new Map();
  private termToFreq = new Map<string, number>();
  private termToDocFreq = new Map<string, number>();

  private tfidf = new Map<string, number>();

  terms: BehaviorSubject<Array<string>> = new BehaviorSubject<Array<string>>([]);
  minScore = new BehaviorSubject<number>(0);
  maxScore = new BehaviorSubject<number>(Infinity);
  private readonly prepareMetadata$ = this.prepareMetadata();
  readonly textBodyAsHml$ = this.prepareMetadata$.pipe(
    switchMap(() => this.internalBodyText$),
    map(t => this.asHtml(t))
  );
  readonly documentHeaderAsHtml$ = this.prepareMetadata$.pipe(
    switchMap(() => this.internalDocumentHeader$),
    map(t => this.asHtml(t))
  );

  constructor(private http: HttpClient) {
  }

  private prepareMetadata() {
    return combineLatest([this.internalBodyText$, this.internalDocumentHeader$]).pipe(
      map(([a, b]) => a + " " + b),
      map((t: string) => this.countWords(t)),
      switchMap((docFreq: Map<string, number>) => this.updateTF(docFreq)),
      map(() => this.updateTFIDF()),
      shareReplay());
  }

  private getAsciiHeader(): Observable<string> {
    return this.http.get(`${this.deployUrl}/assets/ascii_header_0.txt`, {responseType: 'text' as 'json'}).pipe(map((t) => {
      return t as string;
    })).pipe(
      map((t) => this.replaceSpaces(t)),
      shareReplay(),
      distinctUntilChanged(),
      tap((t) => {
        console.log("got ascii header");
      }));
  }

  private getBodyText(): Observable<string> {
    return this.http.get<string>(`${this.deployUrl}/assets/test.txt`, {responseType: 'text' as 'json'}).pipe(
      tap(() => void console.log('got body text')),
      shareReplay()
    );
  }

  private getDocumentHeader(): Observable<string> {
    return this.http.get<string>(`${this.deployUrl}/assets/file_header.txt`, {responseType: 'text' as 'json'}).pipe(
      tap(() => void console.log('got document header')),
      shareReplay()
    );
  }

  getTFIDF(term: string): number {
    return this.tfidf.get(term) ?? 0;
  }

  updateTFIDF() {
    this.tfidf.clear();
    let min = Infinity;
    let max = 0;
    const sumTerms = Array.from(this.termToDocFreq.values()).reduceRight((a, b) => a + b);
    for (const term of this.termToDocFreq.keys()) {
      const idf = 1 / (this.termToDocFreq.get(term)! / sumTerms);
      const curTfidf = this.termToFreq.get(term)! * idf;
      min = curTfidf < min ? curTfidf : min;
      max = curTfidf > max ? curTfidf : max;
      this.tfidf.set(term, curTfidf);
    }
    for (const term of this.tfidf.keys()) {
      this.tfidf.set(term, this.mapValue(this.tfidf.get(term)!, min, max, 50, 1000));
    }
    this.terms.next(Array.from(this.tfidf.keys()));
    this.minScore.next(min);
    this.maxScore.next(max);
  }

  updateTF(docFreq: Map<string, number>) {
    return this.http.get(`${this.deployUrl}/assets/tf.csv`, {responseType: 'text' as 'json'}).pipe(
      tap((v) => {
        console.log('got csv');
        const csv = v as string;
        let sum = 0;
        for (const l of csv.split('\n').splice(1)) {
          const [t, f] = l.split(',');
          let freq = parseInt(f);
          if (Number.isNaN(freq)) {
            continue;
          }
          freq = freq + (docFreq.get(t) ?? 0);
          sum += freq;
          this.termToFreq.set(t, freq);
        }
        for (const curTerm of docFreq.keys()) {
          const curVal = this.termToFreq.get(curTerm) ?? 0;
          this.termToFreq.set(curTerm, curVal + docFreq.get(curTerm)!)
        }
        for (const t of this.termToFreq.keys()) {
          this.termToFreq.set(t, this.termToFreq.get(t)! / sum)
        }
      }),
    );
  }

  private asHtml(text: string) {
    const seen = new Set<string>();
    for (let canonical of this.termToDocFreq.keys()) {
      for (let wordInstance of this.canonicalToInstance.get(canonical)!) {
        if (seen.has(canonical)) continue;
        const nonSplitter = '[^a-zA-Z0-9\'’]';
        seen.add(canonical);
        const r = new RegExp(`(${nonSplitter})(${wordInstance})(${nonSplitter})`, 'gi');
        text = text.replaceAll(r, `$1<span class="${canonical}">$2</span>$3`);
        const rStart = new RegExp(`^(${wordInstance})(${nonSplitter}|$)`, 'gi');
        text = text.replaceAll(rStart, `<span class="${canonical}">$1</span>$2`);
        const rEnd = new RegExp(`(${nonSplitter})(${wordInstance})$`, 'gi');
        text = text.replaceAll(rEnd, `$1<span class="${canonical}">$2</span>`);
      }
    }
    return text.replaceAll("\n", "<br>");
  }

  countWords(text: string): Map<string, number> {
    const words = text.split(/[,.;\-—_"=\*\[\]&:\?)(\s]/g).map(word => {
      const canonical = word.toLowerCase();
      this.canonicalToInstance.has(canonical) ? this.canonicalToInstance.get(canonical)!.add(word) : this.canonicalToInstance.set(canonical, new Set([word]));
      return canonical;
    });
    for (const word of words) {
      this.termToDocFreq.set(word, this.termToDocFreq.has(word) ? this.termToDocFreq.get(word)! + 1 : 1);
    }
    this.termToDocFreq.delete("");
    this.canonicalToInstance.delete("");
    return this.termToDocFreq;
  }

  private mapValue(x: number, oldMin: number, oldMax: number, newMin: number, newMax: number) {
    return (x - oldMin / (oldMax - oldMin)) * (newMax - newMin) + newMin;
  }

  private replaceSpaces(text: string) {
    return text.replaceAll(' ', '&nbsp');
  }
}
