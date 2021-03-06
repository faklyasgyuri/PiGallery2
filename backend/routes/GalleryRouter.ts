import {AuthenticationMWs} from "../middlewares/user/AuthenticationMWs";
import {GalleryMWs} from "../middlewares/GalleryMWs";
import {RenderingMWs} from "../middlewares/RenderingMWs";
import {ThumbnailGeneratorMWs} from "../middlewares/ThumbnailGeneratorMWs";

export class GalleryRouter {
    constructor(private app: any) {

        this.addGetImageIcon();
        this.addGetImageThumbnail();
        this.addGetImage();
        this.addDirectoryList();

        this.addSearch();
        this.addInstantSearch();
        this.addAutoComplete();
    }

    private addDirectoryList() {
        this.app.get(["/api/gallery/content/:directory(*)", "/api/gallery/", "/api/gallery//"],
            AuthenticationMWs.authenticate,
            GalleryMWs.listDirectory,
            ThumbnailGeneratorMWs.addThumbnailInformation,
            GalleryMWs.removeCyclicDirectoryReferences,
            RenderingMWs.renderResult
        );
    };


    private addGetImage() {
        this.app.get(["/api/gallery/content/:imagePath(*\.(jpg|bmp|png|gif|jpeg))"],
            AuthenticationMWs.authenticate,
            GalleryMWs.loadImage,
            RenderingMWs.renderFile
        );
    };

    private addGetImageThumbnail() {
        this.app.get("/api/gallery/content/:imagePath(*\.(jpg|bmp|png|gif|jpeg))/thumbnail/:size?",
            AuthenticationMWs.authenticate,
            GalleryMWs.loadImage,
            ThumbnailGeneratorMWs.generateThumbnail,
            RenderingMWs.renderFile
        );
    };

    private addGetImageIcon() {
        this.app.get("/api/gallery/content/:imagePath(*\.(jpg|bmp|png|gif|jpeg))/icon",
            AuthenticationMWs.authenticate,
            GalleryMWs.loadImage,
            ThumbnailGeneratorMWs.generateIcon,
            RenderingMWs.renderFile
        );
    };

    private addSearch() {
        this.app.get("/api/search/:text",
            AuthenticationMWs.authenticate,
            GalleryMWs.search,
            ThumbnailGeneratorMWs.addThumbnailInformation,
            GalleryMWs.removeCyclicDirectoryReferences,
            RenderingMWs.renderResult
        );
    };

    private addInstantSearch() {
        this.app.get("/api/instant-search/:text",
            AuthenticationMWs.authenticate,
            GalleryMWs.instantSearch,
            ThumbnailGeneratorMWs.addThumbnailInformation,
            GalleryMWs.removeCyclicDirectoryReferences,
            RenderingMWs.renderResult
        );
    };

    private addAutoComplete() {
        this.app.get("/api/autocomplete/:text",
            AuthenticationMWs.authenticate,
            GalleryMWs.autocomplete,
            RenderingMWs.renderResult
        );
    };


}