import {IGalleryManager} from "../interfaces/IGalleryManager";
import {DirectoryDTO} from "../../../common/entities/DirectoryDTO";
import * as path from "path";
import {DirectoryEntity} from "./enitites/DirectoryEntity";
import {MySQLConnection} from "./MySQLConnection";
import {DiskManager} from "../DiskManger";
import {PhotoEntity} from "./enitites/PhotoEntity";
import {Utils} from "../../../common/Utils";
import {ProjectPath} from "../../ProjectPath";

export class GalleryManager implements IGalleryManager {


    public listDirectory(relativeDirectoryName, cb: (error: any, result: DirectoryDTO) => void) {
        relativeDirectoryName = path.normalize(path.join("." + path.sep, relativeDirectoryName));
        let directoryName = path.basename(relativeDirectoryName);
        let directoryParent = path.join(path.dirname(relativeDirectoryName), path.sep);
        console.log("GalleryManager:listDirectory");
        console.log(directoryName, directoryParent, path.dirname(relativeDirectoryName), ProjectPath.normalizeRelative(path.dirname(relativeDirectoryName)));
        MySQLConnection.getConnection().then(async connection => {

            let dir = await connection
                .getRepository(DirectoryEntity)
                .createQueryBuilder("directory")
                .where("directory.name = :name AND directory.path = :path", {
                    name: directoryName,
                    path: directoryParent
                })
                .leftJoinAndSelect("directory.directories", "directories")
                .leftJoinAndSelect("directory.photos", "photos")
                .getOne();

            if (dir && dir.scanned == true) {
                if (dir.photos) {
                    for (let i = 0; i < dir.photos.length; i++) {
                        dir.photos[i].directory = dir;
                        dir.photos[i].metadata.keywords = <any>JSON.parse(<any>dir.photos[i].metadata.keywords);
                        dir.photos[i].metadata.cameraData = <any>JSON.parse(<any>dir.photos[i].metadata.cameraData);
                        dir.photos[i].metadata.positionData = <any>JSON.parse(<any>dir.photos[i].metadata.positionData);
                        dir.photos[i].metadata.size = <any>JSON.parse(<any>dir.photos[i].metadata.size);
                        dir.photos[i].readyThumbnails = [];
                        dir.photos[i].readyIcon = false;
                    }
                }

                cb(null, dir); //WARNING: only on the fly indexing should happen after this point

                //on the fly updating
                return this.indexDirectory(relativeDirectoryName, (err, res) => {
                    if (!!err || !res) {
                        console.error(err);
                    }
                });
            }
            return this.indexDirectory(relativeDirectoryName, cb);


        }).catch((error) => {
            return cb(error, null);
        });


    }

    public indexDirectory(relativeDirectoryName, cb: (error: any, result: DirectoryDTO) => void) {
        DiskManager.scanDirectory(relativeDirectoryName, (err, scannedDirectory) => {
            if (!!err || !scannedDirectory) {
                return cb(err, null);
            }

            MySQLConnection.getConnection().then(async connection => {

                //returning with the result
                scannedDirectory.photos.forEach(p => p.readyThumbnails = []);
                cb(null, scannedDirectory);

                //saving to db
                let directoryRepository = connection.getRepository(DirectoryEntity);
                let photosRepository = connection.getRepository(PhotoEntity);


                let parentDir = await directoryRepository.createQueryBuilder("directory")
                    .where("directory.name = :name AND directory.path = :path", {
                        name: scannedDirectory.name,
                        path: scannedDirectory.path
                    }).getOne();

                if (!!parentDir) {
                    parentDir.scanned = true;
                    parentDir.lastUpdate = Date.now();
                    parentDir = await directoryRepository.persist(parentDir);
                } else {
                    (<DirectoryEntity>scannedDirectory).scanned = true;
                    parentDir = await directoryRepository.persist(<DirectoryEntity>scannedDirectory);
                }


                for (let i = 0; i < scannedDirectory.directories.length; i++) {
                    //TODO: simplify algorithm
                    let dir = await directoryRepository.createQueryBuilder("directory")
                        .where("directory.name = :name AND directory.path = :path", {
                            name: scannedDirectory.directories[i].name,
                            path: scannedDirectory.directories[i].path
                        }).getOne();

                    if (dir) {
                        dir.parent = parentDir;
                        await directoryRepository.persist(dir);
                    } else {
                        scannedDirectory.directories[i].parent = parentDir;
                        (<DirectoryEntity>scannedDirectory.directories[i]).scanned = false;
                        await directoryRepository.persist(<DirectoryEntity>scannedDirectory.directories[i]);
                    }
                }


                let indexedPhotos = await photosRepository.createQueryBuilder("photo")
                    .where("photo.directory = :dir", {
                        dir: parentDir.id
                    }).getMany();


                let photosToSave = [];
                for (let i = 0; i < scannedDirectory.photos.length; i++) {
                    let photo = null;
                    for (let j = 0; j < indexedPhotos.length; j++) {
                        if (indexedPhotos[j].name == scannedDirectory.photos[i].name) {
                            photo = indexedPhotos[j];
                            indexedPhotos.splice(j, 1);
                            break;
                        }
                    }
                    if (photo == null) {
                        scannedDirectory.photos[i].directory = null;
                        photo = Utils.clone(scannedDirectory.photos[i]);
                        scannedDirectory.photos[i].directory = scannedDirectory;
                        photo.directory = parentDir;
                    }

                    //typeorm not supports recursive embended: TODO:fix it
                    let keyStr = <any>JSON.stringify(scannedDirectory.photos[i].metadata.keywords);
                    let camStr = <any>JSON.stringify(scannedDirectory.photos[i].metadata.cameraData);
                    let posStr = <any>JSON.stringify(scannedDirectory.photos[i].metadata.positionData);
                    let sizeStr = <any>JSON.stringify(scannedDirectory.photos[i].metadata.size);

                    if (photo.metadata.keywords != keyStr ||
                        photo.metadata.cameraData != camStr ||
                        photo.metadata.positionData != posStr ||
                        photo.metadata.size != sizeStr) {

                        photo.metadata.keywords = keyStr;
                        photo.metadata.cameraData = camStr;
                        photo.metadata.positionData = posStr;
                        photo.metadata.size = sizeStr;
                        photosToSave.push(photo);
                    }
                }
                await photosRepository.persist(photosToSave);
                await photosRepository.remove(indexedPhotos);


            }).catch((error) => {
                return cb(error, null);
            });
        });
    }

}