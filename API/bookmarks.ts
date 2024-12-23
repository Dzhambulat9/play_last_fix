import { serverURL, alloyAllPermisions, ROOT_AUTH, hostName } from '../global_variables';
import { green, blue, yellow, red } from 'colors';
import { configurationCollector, getIdByRoleName } from "../utils/utils.js";
import { randomUUID } from 'node:crypto';

export async function getBookmarks() {

    let request = await fetch(`${serverURL}/archive/contents/bookmarks/${hostName}/future/past`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        }
    });

    let bookmarkList = await request.json();

    if (request.ok) {
        return bookmarkList.events;
    } else console.log(`Error: could not pull bookmarks list. Code: ${request.status}`.red);
    return [];
};

export async function createBookmark(cameraEndpoint: string, archiveName: string, startTime: string, endTime: string, message = "Bookmark", isProtected = false) {

    let body = {
        "method": "axxonsoft.bl.archive.ArchiveService.ChangeBookmarks",
        "data": {
            "added": [{
                "bookmark_internal": {
                    "node_name": hostName,
                    "is_protected": isProtected,
                    "camera_ap": cameraEndpoint,
                    "archive_ap": `hosts/${hostName}/MultimediaStorage.${archiveName}/MultimediaStorage`,
                    "group_id": randomUUID(),
                    "boundary":{
                        "x": 0.5,
                        "y": 0.5,
                        "w": 75,
                        "h": 14,
                        "index": 1
                    },
                    "geometry":{
                        "type": "PT_NONE",
                        "guid": randomUUID(),
                        "alpha": 150
                    },
                    "range": {
                        "begin_time": startTime,
                        "end_time": endTime
                    },
                    "message": message
                } 
            }]
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    let response = await request.json();

    if (request.ok) {
        console.log(`Bookmark was added to archive ${archiveName} for camera ${cameraEndpoint}.`.green);
    } else console.log(`Error: Coudn't create bookmark in archive ${archiveName} for camera ${cameraEndpoint}. Code: ${request.status}, Failed: ${response.failed}`.red);
};

export async function deleteBookmark(bookmarkID: string[]) {
    let deleteArr: object[] = [];
    for (let bookmark of bookmarkID) {
        deleteArr.push({
            "bookmark_internal": {
                "camera_ap": "",
                "archive_ap": ""
            },
            "book_mark_guid": bookmark
        })
    }

    let body = {
        "method": "axxonsoft.bl.archive.ArchiveService.ChangeBookmarks",
        "data": {
            "changed": deleteArr
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    let response = await request.json();

    if (request.ok) {
        console.log(`Was deleted bookmarks ${bookmarkID.toString()}.`.green);
    } else console.log(`Error: Coudn't delete bookmarks ${bookmarkID.toString()}. Code: ${request.status}, Failed: ${response.failed}`.red);
};

export async function deleteArchiveInterval(cameraEndpoint: string, archiveName: string, startTime: string, endTime: string) {
    console.log(`${serverURL}/archive/contents/bookmarks?begins_at=${startTime}&ends_at=${endTime}&endpoint=${cameraEndpoint}&storage_id=hosts/${hostName}/MultimediaStorage.${archiveName}/MultimediaStorage`);
    let request = await fetch(`${serverURL}/archive/contents/bookmarks?begins_at=${startTime}&ends_at=${endTime}&endpoint=${cameraEndpoint}&storage_id=hosts/${hostName}/MultimediaStorage.${archiveName}/MultimediaStorage`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "DELETE",
    });

    if (request.ok) {
        console.log(`Was deleted interval ${startTime}/${endTime} for ${cameraEndpoint}.`.green);
    } else console.log(`Error: Coudn't delete interval ${startTime}/${endTime} for ${cameraEndpoint}. Code: ${request.status}`.red);
};