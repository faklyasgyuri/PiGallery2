import {Component, Input} from "@angular/core";

@Component({
    selector: 'gallery-grid-photo-loading',
    templateUrl: 'app/gallery/grid/photo/loading/loading.photo.grid.gallery.component.html',
    styleUrls: ['app/gallery/grid/photo/loading/loading.photo.grid.gallery.component.css'],
})
export class GalleryPhotoLoadingComponent {

    @Input() animate:boolean;


}

