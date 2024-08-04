import {Directive, EventEmitter, HostBinding, HostListener, Output} from '@angular/core';

@Directive({
  selector: '[dsDragAndDrop]',
  standalone: true
})
export class DragAndDropDirective {

  @HostBinding('class.file-over') fileOver: boolean = false;
  @Output() private readonly filesDropped = new EventEmitter();

  constructor() {
  }

  @HostListener('document:dragover', ['$event'])
  public onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.items[0]?.kind == 'file') {
      this.fileOver = true;
    }
  }

  @HostListener('document:dragleave', ['$event'])
  public onDragLeave(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    // this.fileOver = false;
  }

  @HostListener('document:drop', ['$event'])
  public onDragDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileOver = false;
    const files = event?.dataTransfer?.files ?? [];
    if (files.length > 0) {
      this.filesDropped.emit(files);
    }
  }
}
