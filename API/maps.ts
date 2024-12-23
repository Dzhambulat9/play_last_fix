import { serverURL, alloyAllPermisions, ROOT_AUTH, ROOT_LOGIN } from '../global_variables';
import { green, blue, yellow, red } from 'colors';
import { configurationCollector, getIdByRoleName, getIdByUserName } from "../utils/utils.js";
import { randomUUID } from 'node:crypto';
import { getBase64, getImageParams } from '../utils/fs.mjs';


export async function getMapsList() {
    let body = {
        "method": "axxonsoft.bl.maps.MapService.ListMaps",
        "data": {
            "view":"VIEW_MODE_FULL"
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    let mapsList = await request.json();

    if (request.ok) {
        return mapsList.items;
    } else console.log(`Error: could not pull maps list. Code: ${request.status}`.red);
};


export async function createGeoMap(mapName: string, mapCoordinates = { x: 11.2463, y: 43.7793 }, zoom = 4) {
    let mapId = randomUUID();

    let body = {
        "method": "axxonsoft.bl.maps.MapService.ChangeMaps",
        "data": {
            "created": {
                "id": mapId,
                "sharing": {
                    "owner": getIdByUserName(ROOT_LOGIN),
                    "kind": "SHARING_KIND_NOT_SHARED",
                    "shared_roles": []
                    },
                "map": {
                    "name": mapName,
                    "type": "MAP_TYPE_GEO",
                    "position": { 
                        "x": mapCoordinates.x,
                        "y": mapCoordinates.y
                    },
                    "zoom": zoom,
                    "provider_id": "9cb89d76-67e9-47cf-8137-b9ee9fc46388"
                    },
                "markers": []
            }
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    if (request.ok) {
        console.log(`The geo map "${mapName}" was successfully created! UUID: ${mapId}`.green);
    } else console.log(`Error: The map "${mapName}" was not created. Code: ${request.status}`.red);

    await configurationCollector("maps");
    return mapId;
};

export async function createRasterMap(mapName: string, imageName: string, width: number | false = false, height: number | false = false) {
    let mapId = randomUUID();
    let imageData = getImageParams(imageName);

    let body = {
        "method": "axxonsoft.bl.maps.MapService.ChangeMaps",
        "data": {
            "created": {
                    "id": mapId,
                    "sharing":{
                        "owner": getIdByUserName(ROOT_LOGIN),
                        "kind": "SHARING_KIND_NOT_SHARED",
                        "shared_roles": []
                        },
                    "map": {
                        "name": mapName,
                        "type": "MAP_TYPE_RASTER",
                        "position": {
                            "x": 0,
                            "y": 0
                        },
                        "zoom": 0,
                        "provider_id": "",
                        "image_meta": {
                            "file_name": imageName,
                            "mime_type": "",
                            "size": {
                                "height": height === false ? imageData.height : height,
                                "width": width === false ? imageData.width : width
                            },
                            "name": imageName.replace(/\.\w{2, 5}/, ''),
                            "size_bytes": imageData.size
                            }
                        },
                    "image_data": getBase64(imageName),
                    "markers":[]
                }
            }
        };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    if (request.ok) {
        console.log(`The raster map "${mapName}" was successfully created! UUID: ${mapId}`.green);
    } else console.log(`Error: The raster map "${mapName}" was not created. Code: ${request.status}`.red);

    await configurationCollector("maps");
    return mapId;
};

export async function deleteMaps(mapIDs: string[]) {

    let body = {
            "method": "axxonsoft.bl.maps.MapService.ChangeMaps",
            "data": {
                "removed": mapIDs
            }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    if (request.ok) {
        console.log(`Maps ${mapIDs.toString()} was successfully deleted!`.green);
    } else console.log(`Error: could not delete maps. Code: ${request.status}`.red);

    await configurationCollector("maps");
};

export async function getMarkerList(mapID: string) {
    let body = {
        "method": "axxonsoft.bl.maps.MapService.GetMarkers",
        "data": {
            "map_id": mapID
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    let markersList = await request.json();

    if (request.ok) {
        return markersList.items;
    } else console.log(`Error: could not pull markers list. Code: ${request.status}`.red);
};

export async function createTransitionMarker(sourceMapID: string, targetMapID: string, coordinates: { x: number, y: number }) {

    let body = {
        "method": "axxonsoft.bl.maps.MapService.UpdateMarkers",
        "data": {
            "changed": {
                "map_id": sourceMapID,
                "updated": {
                    "position":{
                        "x": coordinates.x,
                        "y": coordinates.y
                    },
                    "component_name": "transition",
                    "display_title": true,
                    "transition_marker": {
                        "linked_map_id": targetMapID
                    }
                }
            }
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    if (request.ok) {
        console.log(`The transition marker was created on map "${sourceMapID}" in coordinates (${coordinates.x}, ${coordinates.y})!`.green);
    } else console.log(`Error: The transition marker was not created. Code: ${request.status}`.red);
};

export async function createCameraMarker(sourceMapID: string, cameraEndpoint: string, coordinates: { x: number, y: number }) {

    let body = {
        "method": "axxonsoft.bl.maps.MapService.UpdateMarkers",
        "data": {
            "changed": {
                "map_id": sourceMapID,
                "updated": {
                    "position":{
                        "x": coordinates.x,
                        "y": coordinates.y
                    },
                    "component_name": cameraEndpoint,
                    "display_title": true,
                    "camera_marker": {
                        "field_of_view": {
                            "angle": 60,
                            "direction": {
                                "x": 0,
                                "y": -10
                            }
                        },
                        "video_frame_arrangement": {
                            "incline": 0,
                            "distance": 0,
                            "angle": 0
                        }
                    }
                }
            }
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    if (request.ok) {
        console.log(`The camera marker was created on map "${sourceMapID}" in coordinates (${coordinates.x}, ${coordinates.y})!`.green);
    } else console.log(`Error: The camera marker was not created. Code: ${request.status}`.red);
};

export async function deleteMarkers(mapID: string, markerEndpoints: string[]) {

    let body = {
        "method": "axxonsoft.bl.maps.MapService.UpdateMarkers",
        "data": {
            "map_id": mapID,
            "removed": markerEndpoints, // ["hosts/DESKTOP-GNBQ9FS/DeviceIpint.2/SourceEndpoint.video:0:0", "67694d9b-f2d3-4c3b-8968-49c93d9657e5"]
        }
    }
    
    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    if (request.ok) {
        console.log(`Markers ${markerEndpoints.toString()} was successfully deleted from map ${mapID}!`.green);
    } else console.log(`Error: could not delete markers. Code: ${request.status}`.red);
};