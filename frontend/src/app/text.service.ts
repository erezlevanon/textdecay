import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {map, ReplaySubject, tap} from "rxjs";
import {compareNumbers} from "@angular/compiler-cli/src/version_helpers";

@Injectable({
  providedIn: 'root'
})
export class TextService {

  private readonly internalText$: ReplaySubject<string> = new ReplaySubject()

  // private readonly wordCount$ = this.internalText$.pipe(map(
  //   text => this.countWords(text)
  // ));

  private canonicalToInstance: Map<string, Set<string>> = new Map();

  readonly asHtml$ = this.internalText$.pipe(map(t => this.asHtml(t)));

  constructor(private http: HttpClient) {
    this.updateText();
  }

  updateText() {
    this.http.get('assets/test.txt', {responseType: 'text' as 'json'}).pipe(tap(v => console.log(v))).subscribe(v => this.internalText$.next(v as string));
  }

  private asHtml(text: string) {
    const wordCounts = this.countWords(text);
    text = text.replaceAll("\n", "<br>");
    for (let canonical of wordCounts.keys()) {
      for (let wordInstance of this.canonicalToInstance.get(canonical)!) {
        const r = new RegExp(`(^|\\W)(${wordInstance})(\\W|$)`, 'g');
        text = text.replaceAll(r, `$1<span class="${canonical}">${wordInstance}</span>$3`);
        const rStart = new RegExp(`^(${wordInstance})(\\W|$)`, 'g');
        text = text.replaceAll(rStart, `<span class="${canonical}">${wordInstance}</span>$2`);
        const rEnd = new RegExp(`(^|\\W)(${wordInstance})$`, 'g');
        text = text.replaceAll(rEnd, `$1<span class="${canonical}">${wordInstance}</span>`);
      }
    }
    return text.replaceAll("\n", "<br>");
  }

  countWords(text: string): Map<string, number> {
    const res = new Map();
    this.canonicalToInstance.clear();
    const words = text.split(/\s/g).map(word => {
      const stripped = word.replaceAll(/[,.;\-_"=\[\])(]/g, '');
      const canonical = stripped.toLowerCase();
      this.canonicalToInstance.has(canonical) ? this.canonicalToInstance.get(canonical)!.add(stripped) : this.canonicalToInstance.set(canonical, new Set([stripped]));
      return canonical;
    });
    words.forEach(word => res.set(word, res.has(word) ? res.get(word) + 1 : 1));
    res.delete("");
    this.canonicalToInstance.delete("");
    console.log(this.canonicalToInstance);
    console.log(res);
    return res;
  }
}
