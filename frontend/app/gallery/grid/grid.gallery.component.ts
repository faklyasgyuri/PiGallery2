import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    QueryList,
    ViewChild,
    ViewChildren
} from "@angular/core";
import {PhotoDTO} from "../../../../common/entities/PhotoDTO";
import {GridRowBuilder} from "./GridRowBuilder";
import {GalleryLightboxComponent} from "../lightbox/lightbox.gallery.component";
import {GridPhoto} from "./GridPhoto";
import {GalleryPhotoComponent} from "./photo/photo.grid.gallery.component";
import {Config} from "../../config/Config";
import {OverlayService} from "../overlay.service";

@Component({
    selector: 'gallery-grid',
    templateUrl: 'app/gallery/grid/grid.gallery.component.html',
    styleUrls: ['app/gallery/grid/grid.gallery.component.css'],
})
export class GalleryGridComponent implements OnChanges, AfterViewInit {

    @ViewChild('gridContainer') gridContainer: ElementRef;
    @ViewChildren(GalleryPhotoComponent) gridPhotoQL: QueryList<GalleryPhotoComponent>;

    @Input() photos: Array<PhotoDTO>;
    @Input() lightbox: GalleryLightboxComponent;

    photosToRender: Array<GridPhoto> = [];
    containerWidth: number = 0;

    private IMAGE_MARGIN = 2;
    private TARGET_COL_COUNT = 5;
    private MIN_ROW_COUNT = 2;
    private MAX_ROW_COUNT = 5;

    private onScrollFired = false;
    private scrollbarWidth = 0;

    constructor(private overlayService: OverlayService, private changeDetector: ChangeDetectorRef) {
    }

    ngOnChanges() {
        if (this.isAfterViewInit === false) {
            return;
        }
        this.updateContainerWidth();
        this.sortPhotos();
        this.mergeNewPhotos();
        setImmediate(() => {
            this.renderPhotos();
        });
    }

    @HostListener('window:resize')
    onResize() {
        if (this.isAfterViewInit === false) {
            return;
        }
        this.updateContainerWidth();
        this.sortPhotos();
        //render the same amount of images on resize
        let renderedIndex = this.renderedPhotoIndex;
        this.clearRenderedPhotos();
        this.renderPhotos(renderedIndex);
    }


    isAfterViewInit: boolean = false;

    ngAfterViewInit() {
        this.lightbox.setGridPhotoQL(this.gridPhotoQL);

        //TODO: implement scroll detection


        this.updateContainerWidth();
        this.sortPhotos();
        this.clearRenderedPhotos();
        setImmediate(() => {
            this.renderPhotos();
        });
        this.isAfterViewInit = true;
    }


    private sortPhotos() {
        //sort pohots by date
        this.photos.sort((a: PhotoDTO, b: PhotoDTO) => {
            return a.metadata.creationDate - b.metadata.creationDate;
        });

    }

    private clearRenderedPhotos() {
        this.photosToRender = [];
        this.renderedPhotoIndex = 0;
        this.changeDetector.detectChanges();
    }

    private mergeNewPhotos() {
        //merge new data with old one
        let lastSameIndex = 0;
        let lastRowId = null;
        for (let i = 0; i < this.photos.length && i < this.photosToRender.length; i++) {

            //thIf a photo changed the whole row has to be removed
            if (this.photosToRender[i].rowId != lastRowId) {
                lastSameIndex = i;
                lastRowId = this.photosToRender[i].rowId;
            }
            if (this.photosToRender[i].equals(this.photos[i]) === false) {
                break;
            }
        }

        if (lastSameIndex > 0) {
            this.photosToRender.splice(lastSameIndex, this.photosToRender.length - lastSameIndex);
            this.renderedPhotoIndex = lastSameIndex;
        } else {
            this.clearRenderedPhotos();
        }
    }


    private renderedPhotoIndex: number = 0;

    private renderPhotos(numberOfPhotos: number = 0) {
        if (this.containerWidth == 0 || this.renderedPhotoIndex >= this.photos.length || !this.shouldRenderMore()) {
            return;
        }


        let renderedContentHeight = 0;

        while (this.renderedPhotoIndex < this.photos.length && (this.shouldRenderMore(renderedContentHeight) === true || this.renderedPhotoIndex < numberOfPhotos)) {
            let ret = this.renderARow();
            if (ret === null) {
                throw new Error("Gridphotos rendering failed");
            }
            renderedContentHeight += ret;
        }
    }


    /**
     * Returns true, if scroll is >= 70% to render more images.
     * Or of onscroll renderin is off: return always to render all the images at once
     * @param offset Add height to the client height (conent is not yet added to the dom, but calculate with it)
     * @returns {boolean}
     */
    private shouldRenderMore(offset: number = 0): boolean {
        return Config.Client.enableOnScrollRendering === false ||
            window.scrollY >= (document.body.clientHeight + offset - window.innerHeight) * 0.7
            || (document.body.clientHeight + offset) * 0.85 < window.innerHeight;

    }


    @HostListener('window:scroll')
    onScroll() {
        if (!this.onScrollFired) {
            window.requestAnimationFrame(() => {
                this.renderPhotos();

                if (Config.Client.enableOnScrollThumbnailPrioritising === true) {
                    this.gridPhotoQL.toArray().forEach((pc: GalleryPhotoComponent) => {
                        pc.onScroll();
                    });
                }
                this.onScrollFired = false;
            });
            this.onScrollFired = true;
        }
    }

    public renderARow(): number {
        if (this.renderedPhotoIndex >= this.photos.length) {
            return null;
        }


        let maxRowHeight = window.innerHeight / this.MIN_ROW_COUNT;
        let minRowHeight = window.innerHeight / this.MAX_ROW_COUNT;

        let photoRowBuilder = new GridRowBuilder(this.photos, this.renderedPhotoIndex, this.IMAGE_MARGIN, this.containerWidth - this.overlayService.getPhantomScrollbarWidth());
        photoRowBuilder.addPhotos(this.TARGET_COL_COUNT);
        photoRowBuilder.adjustRowHeightBetween(minRowHeight, maxRowHeight);

        let rowHeight = photoRowBuilder.calcRowHeight();
        let imageHeight = rowHeight - (this.IMAGE_MARGIN * 2);

        photoRowBuilder.getPhotoRow().forEach((photo) => {
            let imageWidth = imageHeight * (photo.metadata.size.width / photo.metadata.size.height);
            this.photosToRender.push(new GridPhoto(photo, imageWidth, imageHeight, this.renderedPhotoIndex));
        });

        this.renderedPhotoIndex += photoRowBuilder.getPhotoRow().length;
        return rowHeight;
    }

    private updateContainerWidth(): number {
        if (!this.gridContainer) {
            return;
        }
        this.containerWidth = this.gridContainer.nativeElement.clientWidth;
    }


}



