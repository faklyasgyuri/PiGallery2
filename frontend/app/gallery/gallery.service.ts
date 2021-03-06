import {Injectable} from "@angular/core";
import {NetworkService} from "../model/network/network.service";
import {Message} from "../../../common/entities/Message";
import {ContentWrapper} from "../../../common/entities/ConentWrapper";
import {PhotoDTO} from "../../../common/entities/PhotoDTO";
import {DirectoryDTO} from "../../../common/entities/DirectoryDTO";
import {SearchTypes} from "../../../common/entities/AutoCompleteItem";
import {GalleryCacheService} from "./cache.gallery.service";

@Injectable()
export class GalleryService {

    public content: ContentWrapper;
    private lastDirectory: DirectoryDTO;
    private searchId: any;

    constructor(private networkService: NetworkService, private galleryCacheService: GalleryCacheService) {
        this.content = new ContentWrapper();
    }

    lastRequest: {directory: string} = {
        directory: null
    };

    public getDirectory(directoryName: string): Promise<Message<ContentWrapper>> {
        this.content = new ContentWrapper();

        this.content.directory = this.galleryCacheService.getDirectory(directoryName);
        this.content.searchResult = null;
        this.lastRequest.directory = directoryName;
        return this.networkService.getJson("/gallery/content/" + directoryName).then(
            (message: Message<ContentWrapper>) => {
                if (!message.error && message.result) {

                    this.galleryCacheService.setDirectory(message.result.directory); //save it before adding references 

                    if (this.lastRequest.directory != directoryName) {
                        return;
                    }

                    //Add references
                    let addDir = (dir: DirectoryDTO) => {
                        dir.photos.forEach((photo: PhotoDTO) => {
                            photo.directory = dir;
                        });

                        dir.directories.forEach((directory: DirectoryDTO) => {
                            addDir(directory);
                            directory.parent = dir;
                        });


                    };
                    addDir(message.result.directory);


                    this.lastDirectory = message.result.directory;
                    this.content = message.result;
                }
                return message;
            });
    }

    //TODO: cache
    public search(text: string, type?: SearchTypes): Promise<Message<ContentWrapper>> {
        clearTimeout(this.searchId);
        if (text === null || text === '') {
            return Promise.resolve(new Message(null, null));
        }

        let queryString = "/search/" + text;
        if (type) {
            queryString += "?type=" + type;
        }

        return this.networkService.getJson(queryString).then(
            (message: Message<ContentWrapper>) => {
                if (!message.error && message.result) {
                    this.content = message.result;
                }
                return message;
            });
    }

    //TODO: cache (together with normal search)
    public instantSearch(text: string): Promise<Message<ContentWrapper>> {
        if (text === null || text === '') {
            this.content.directory = this.lastDirectory;
            this.content.searchResult = null;
            clearTimeout(this.searchId);
            return Promise.resolve(new Message(null, null));
        }

        if (this.searchId != null) {
            clearTimeout(this.searchId);

        }
        this.searchId = setTimeout(() => {
            this.search(text);
            this.searchId = null;
        }, 3000); //TODO: set timeout to config

        return this.networkService.getJson("/instant-search/" + text).then(
            (message: Message<ContentWrapper>) => {
                if (!message.error && message.result) {
                    this.content = message.result;
                }
                return message;
            });

    }

}
