import {APP_BASE_HREF} from '@angular/common'
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {BehaviorSubject, map, Observable, ReplaySubject, switchMap, tap} from "rxjs";
import {compareNumbers} from "@angular/compiler-cli/src/version_helpers";

@Injectable({
  providedIn: 'root'
})
export class TextService {

  private readonly internalText$: ReplaySubject<string> = new ReplaySubject()

  private canonicalToInstance: Map<string, Set<string>> = new Map();
  private termToFreq = new Map<string, number>();
  private termToDocFreq = new Map<string, number>();
  private tfidf = new Map<string, number>();

  private readonly deployUrl = 'static/text_decay_api_app/browser/';

  terms : BehaviorSubject<Array<string>> = new BehaviorSubject<Array<string>>([]);
  minScore = new BehaviorSubject<number>(0);
  maxScore = new BehaviorSubject<number>(Infinity);
  readonly asHtml$ = this.internalText$.pipe(map(t => this.asHtml(t)));

  constructor(private http: HttpClient) {
    this.updateText().pipe(
      map((t: string) => this.countWords(t)),
      switchMap((docFreq: Map<string, number>) => this.updateTF(docFreq)),
      map(() => this.updateTFIDF()))
      .subscribe(
        () => {
        }
      )
  }

  getTFIDF(term: string) : number {
    return this.tfidf.get(term) ?? 0;
  }

  updateTFIDF() {
    this.tfidf.clear();
    let min = Infinity;
    let max = 0;
    const sumTerms = Array.from(this.termToDocFreq.values()).reduceRight((a,b) => a+b);
    for (const term of this.termToDocFreq.keys()) {
      const idf = 1 / (this.termToDocFreq.get(term)! / sumTerms);
      const curTfidf = this.termToFreq.get(term)! * idf;
      min = curTfidf < min ? curTfidf : min;
      max = curTfidf > max ? curTfidf : max;
      this.tfidf.set(term, curTfidf);
    }
    this.terms.next(Array.from(this.tfidf.keys()));
    this.minScore.next(min);
    this.maxScore.next(max);
    console.log(this.tfidf);
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

  updateText(): Observable<string> {
    return this.http.get<string>(`${this.deployUrl}/assets/test.txt`, {responseType: 'text' as 'json'}).pipe(tap(v => this.internalText$.next(v as string)));
  }

  private asHtml(text: string) {
    const wordCounts = this.countWords(text);
    text = text.replaceAll("\n", "<br>");
    const seen = new Set<string>();
    for (let canonical of wordCounts.keys()) {
      for (let wordInstance of this.canonicalToInstance.get(canonical)!) {
        if (seen.has(canonical)) continue;
        seen.add(canonical);
        const r = new RegExp(`(^|\\W|[_])(${wordInstance})(\\W|$|[_])`, 'gi');
        text = text.replaceAll(r, `$1<span class="${canonical}">${wordInstance}</span>$3`);
        const rStart = new RegExp(`^(${wordInstance})(\\W|$|[_])`, 'gi');
        text = text.replaceAll(rStart, `<span class="${canonical}">${wordInstance}</span>$2`);
        const rEnd = new RegExp(`(^|\\W|[_])(${wordInstance})$`, 'gi');
        text = text.replaceAll(rEnd, `$1<span class="${canonical}">${wordInstance}</span>`);
      }
    }
    return text.replaceAll("\n", "<br>");
  }

  countWords(text: string): Map<string, number> {
    this.termToDocFreq.clear();
    this.canonicalToInstance.clear();
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
    console.log(this.canonicalToInstance);
    console.log(this.termToDocFreq);
    return this.termToDocFreq;
  }
}
