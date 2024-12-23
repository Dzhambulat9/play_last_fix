import { serverURL, videoFolder, hostName, ROOT_AUTH } from '../global_variables';
import { green, blue, yellow, red } from 'colors';
import { configurationCollector } from "../utils/utils.js";
import { randomUUID } from 'node:crypto';


export async function createAVDetector(camera: { [key: string]: any, videochannelID: string }, type: "MotionDetection"|"SceneDescription"|"TvaFaceDetector"|"LprDetector_Vit"|"LprDetector_Roadar"|"QueueDetector"|"PeopleCounter"|"SelfMaskSegmentDetector"|"FireDetector"|"SmokeDetector"|"NeuroCounter"|"NeuroTracker"|"PoseDetector", displayName = "") {
    const uid = randomUUID();

    let body = {
        "method": "axxonsoft.bl.config.ConfigurationService.ChangeConfig",
        "data": {
            "added": [
                {
                    "uid": camera.videochannelID,
                    "type": "VideoChannel",
                    "units": [
                        {
                            "uid": uid,
                            "type": "AVDetector",
                            "properties": [
                                {
                                    "id": "display_name",
                                    "readonly": false,
                                    "properties": [],
                                    "value_string": displayName
                                },
                                {
                                    "id": "detector",
                                    "readonly": false,
                                    "properties": [],
                                    "value_string": type
                                },
                                {
                                    "id": "onlyKeyFrames",
                                    "readonly": false,
                                    "properties": [],
                                    "value_bool": false
                                },
                                {
                                    "id": "streaming_id",
                                    "readonly": false,
                                    "properties": [],
                                    "value_string": ""
                                },
                            ],
                        }
                    ]
                }
            ]
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

    if (request.ok && !response.failed.length) {
        console.log(`Was created ${type} detector for camera ${camera.displayId}.${camera.displayName}.`.green);
        await configurationCollector("detectors");
        await configurationCollector("cameras");
        return response?.added[0];
    } else console.log(`Error: Coudn't create ${type} detector for camera ${camera.displayId}.${camera.displayName}. Code: ${request.status}, Failed: ${response.failed}`.red);
}

export async function createAppDataDetector(AVDetectorEndpoint: string, type: "CrossOneLine"|"LongInZone"|"StopInZone"|"MoveInZone"|"LostObject"|"ComeInZone"|"OutOfZone"|"LotsObjects"|"FaceEvasionDetector"|"SitDownDetector"|"RecumbentDetector"|"HandsUpDetector"|"ActiveShooterDetector"|
"HandRailDetector"|"PeopleCountDetectorBySkeleton"|"PeopleDistanceDetector", displayName = "") {

    const uid = randomUUID();

    let body = {
        "method": "axxonsoft.bl.config.ConfigurationService.ChangeConfig",
        "data": {
            "added": [
                {
                    "uid": AVDetectorEndpoint, //hosts/DESKTOP-0OFNEM9/AVDetector.12
                    "type": "AVDetector",
                    "units": [
                        {
                            "uid": uid,
                            "type": "AppDataDetector",
                            "properties": [
                                {
                                    "id": "display_name",
                                    "readonly": false,
                                    "properties": [],
                                    "value_string": displayName
                                },
                                {
                                    "id": "detector",
                                    "readonly": false,
                                    "properties": [],
                                    "value_string": type
                                },
                            ],
                        }
                    ]
                }
            ]
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

    if (request.ok && !response.failed.length) {
        console.log(`Was created ${type} subdetector for detector ${AVDetectorEndpoint}.`.green);
        await configurationCollector("cameras");
        return response?.added[0];
    } else console.log(`Error: Coudn't create ${type} subdetector for detector ${AVDetectorEndpoint}. Code: ${request.status}, Failed: ${response.failed}`.red);
}

export async function getDetectorsList() {

    let body = {
        "method":"axxonsoft.bl.config.ConfigurationService.ListUnits",
        "data":{
            "unit_uids": [`hosts/${hostName}`]
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

    let output: any[] = [];
    if (request.ok) {
        
        for (let unit of response.units[0].units) {
            if (unit.type == "AVDetector") {
                output.push(unit);
            }
        }

    } else console.log(`Error: Coudn't pull detectors list. Code: ${request.status}, Failed: ${response.failed}`.red);

    return output;
};


export async function deleteDetectors(detectorsEndpoints: string[]) {
    let deleteArr: object[] = [];
    for (let detector of detectorsEndpoints) {
        deleteArr.push({ "uid": detector });
    }

    let body = {
        "method": "axxonsoft.bl.config.ConfigurationService.ChangeConfig",
        "data": {
            "removed": deleteArr
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
        console.log(`Detectors ${detectorsEndpoints.toString()} was successfully deleted!`.green);
    } else console.log(`Error: could not delete detectors ${detectorsEndpoints.toString()}. Code: ${request.status}`.red);

    
    await configurationCollector("detectors");
    await configurationCollector("cameras");
};

export async function changeAVDetector(AVDetectorEndpoint: string, props: { id: string, [key: string]: any }[],) {

    let body = {
        "method": "axxonsoft.bl.config.ConfigurationService.ChangeConfig",
        "data": {
            "changed": [
                {
                    "uid": AVDetectorEndpoint,
                    "type": AVDetectorEndpoint.includes("AVDetector") ? "AVDetector" : "AppDataDetector",
                    "properties": props,
                    "opaque_params": []
                }
            ]
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

    let propString = '';
    for (let prop of props) {
        propString += `id: ${prop.id} - ${prop.value_bool || prop.value_int32 || prop.value_string}; `
    }

    if (request.ok && !response.failed.length) {
        console.log(`Settings for detector ${AVDetectorEndpoint} have changed to ${propString}`.green);
    } else console.log(`Error: Settings for detector ${AVDetectorEndpoint} coudn't change to ${propString}. Code: ${request.status}, Failed: ${response.failed}`.red);

    await configurationCollector('detectors');
};

export async function getDetectorEvents(camera: { [key: string]: any, 'accessPointChanged': string }, endTime: string, startTime: string, detectorId = 0, archiveName = "") {
    let url = `${serverURL}/archive/events/detectors/${camera.accessPointChanged}/${endTime}/${startTime}?detector=${camera.detectors[detectorId].accessPoint}&limit=1024`
    if (archiveName) {
        url = url + `&archive=hosts/${hostName}/MultimediaStorage.${archiveName}/MultimediaStorage`;
    }

    let request = await fetch(url, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        
    });

    console.log(url);
    let eventsList = await request.json();

    if (request.ok) {
        // console.log(eventsList.events);
        return eventsList.events;
        
    } else console.log(`Error: could not pull events list for detector ${camera.detectors[detectorId].accessPoint}. Code: ${request.status}`.red);
};

export async function getDetectorsVisualElement(detectorEndpoint: string) {
    let url = `${serverURL}/v1/configurator/list?unit_uids=${detectorEndpoint}`

    let request = await fetch(url, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        
    });

    console.log(url);
    let response = await request.json();

    if (request.ok) {
        let visualElements: any[] = [];
        for (let unit of response?.units[0]?.units) {
            if (unit.type == "VisualElement") {
                visualElements.push(unit);
            }   
        }
        console.log(`Visual elements of ${detectorEndpoint}`, visualElements);
        return visualElements; 
    } else console.log(`Error: could not pull visual elements list for detector ${detectorEndpoint}. Code: ${request.status}`.red);
};

export async function changeDetectorsSimpleVisualElement(elementUID: string,  targetCoordinates: number[][], direction: "Left" | "Right" | "Bidirectional" | "" = "") {
    let shape =  direction ? "value_line_string_with_normal" : "value_simple_polygon";

    let points: { x: number, y: number }[] = [];
    for (let coordinates of targetCoordinates) {
        points.push({ x: coordinates[0], y: coordinates[1] });
    }

    let shapeObject = {
        "points": points
    }
    if (direction) {
        shapeObject['normal_direction'] = direction;
    }

    let body = {
        "method": "axxonsoft.bl.config.ConfigurationService.ChangeConfig",
        "data": {
            "changed": [
                {
                    "uid": elementUID,
                    "type": "VisualElement",
                    "properties": {
                        "id": "polyline",
                        [shape]: {
                            "points": points
                        },
                    },
                }
            ]
        }
    };

    console.dir(body, { depth: null });

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    let response = await request.json();

    if (request.ok && !response.failed.length) {
        console.log(`Settings for detector  have changed to {propString}`.green);
    } else console.log(`Error: Settings for detector  coudn't change to {propString}. Code: ${request.status}, Failed: ${response.failed}`.red);

    await configurationCollector('detectors');
};