import { serverURL, videoFolder, hostName, ROOT_AUTH } from '../global_variables';
import { green, blue, yellow, red } from 'colors';
import { configurationCollector } from "../utils/utils.js";
import { randomUUID } from 'node:crypto';


export async function getMacrosList() {

    let body = {
        "method":"axxonsoft.bl.logic.LogicService.ListMacros",
        "data": {
            "view": "VIEW_MODE_FULL"
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });

    let macrosList = await request.json();

    if (request.ok) {
        return macrosList.items;
    } else console.log(`Error: Coudn't provide macros list. Code: ${request.status}`.red);
}


export async function createDetectorRecordingMacro(camera: { [key: string]: any }, detectorNumber: number, name = "Macro1", enabled = true, archiveName = "", timeout = 0 ) {
    let guid = randomUUID();

    let obj = {
        "guid": guid,
        "name": name,
        "mode": {
            "enabled": enabled,
            "user_role": "",
            "is_add_to_menu": false,
            "autorule": {
                "zone_ap": camera.accessPoint,
                "only_if_armed": false,
                "timezone_id": "00000000-0000-0000-0000-000000000000"
            }
        },
        "conditions": {
            "0": {
                "path": "",
                "detector": {
                    "event_type": camera.detectors[detectorNumber].events[0],
                    "source_ap": camera.detectors[detectorNumber].accessPoint,
                    "state": "BEGAN",
                    "details": []
                }
            }
        },
        "rules": {
            "0": {
                "path": "",
                "action": {
                    "timeout_ms": timeout,
                    "cancel_conditions": {
                        "0": {
                            "path": "",
                            "detector": {
                                "event_type": camera.detectors[detectorNumber].events[0],
                                "source_ap": camera.detectors[detectorNumber].accessPoint,
                                "state": "ENDED",
                                "details": []
                            }
                        }
                    },
                    "action": {
                        "write_archive": {
                            "camera": camera.accessPoint,
                            "archive": archiveName ? `hosts/${hostName}/MultimediaStorage.${archiveName}/MultimediaStorage` : "",
                            "min_prerecord_ms": 0,
                            "post_event_timeout_ms": 0,
                            "fps": 0
                        }
                    }
                }
            }
        }
    }

    let body = {
        "method": "axxonsoft.bl.logic.LogicService.ChangeMacros",
        "data": {
            "added_macros": obj
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

    if (request.ok && !response.failed?.length) {
        console.log(`Was created recording macro for detector: ${camera.detectors[detectorNumber].displayName}, camera: ${camera.accessPoint}.`.green);
    } else console.log(`Error: Coudn't create recording macro for detector: ${camera.detectors[detectorNumber].displayName}, camera: ${camera.accessPoint}. Code: ${request.status}, Failed: ${response.failed}`.red);
    
    await configurationCollector("macros");
}

export async function createDetectorAlarmingMacro(camera: { [key: string]: any }, detectorNumber: number, name = "Macro1", enabled = true, archiveName = "", mode: "RAM_Always" | "RAM_AlwaysIfNoActiveAlert" = "RAM_AlwaysIfNoActiveAlert" ) {
    let guid = randomUUID();

    let obj = {
        "guid": guid,
        "name": name,
        "mode": {
            "enabled": enabled,
            "user_role": "",
            "is_add_to_menu": false,
            "autorule": {
                "zone_ap": camera.accessPoint,
                "only_if_armed": false,
                "timezone_id": "00000000-0000-0000-0000-000000000000"
            }
        },
        "conditions": {
            "0": {
                "path": "",
                "detector": {
                    "event_type": camera.detectors[detectorNumber].events[0],
                    "source_ap": camera.detectors[detectorNumber].accessPoint,
                    "state": "BEGAN",
                    "details": []
                }
            }
        },
        "rules": {
            "0": {
                "path": "",
                "action": {
                    "timeout_ms": 0,
                    "cancel_conditions": {},
                    "action": {
                        "raise_alert": {
                            "zone": camera.accessPoint,
                            "archive": archiveName ? `hosts/${hostName}/MultimediaStorage.${archiveName}/MultimediaStorage` : "",
                            "offset_ms": 0,
                            "mode": mode,
                            "reactions": {},
                            "priority": "ALERT_PRIORITY_UNSPECIFIED",
                            "user_roles": [],
                            "pending_max_time_seconds": 0
                        }
                    }
                }
            }
        }
    }

    let body = {
        "method": "axxonsoft.bl.logic.LogicService.ChangeMacros",
        "data": {
            "added_macros": obj
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

    if (request.ok && !response.failed?.length) {
        console.log(`Was created alarming macro for detector: ${camera.detectors[detectorNumber].displayName}, camera: ${camera.accessPoint}.`.green);
    } else console.log(`Error: Coudn't create alarming macro for detector: ${camera.detectors[detectorNumber].displayName}, camera: ${camera.accessPoint}. Code: ${request.status}, Failed: ${response.failed}`.red);
    
    await configurationCollector("macros");
}

export async function createCycleAlarmingMacro(camera: { [key: string]: any }, frequency: number,  name = "Macro1", enabled = true, archiveName = "", mode: "RAM_Always" | "RAM_AlwaysIfNoActiveAlert" = "RAM_AlwaysIfNoActiveAlert", waitTimeout = 0, handleAlert = false) {
    let guid = randomUUID();

    let obj = {
        "guid": guid,
        "name": name,
        "mode": {
            "enabled": enabled,
            "user_role": "",
            "is_add_to_menu": false,
            "continuous": {
                "server": hostName,
                "timezone_id": "00000000-0000-0000-0000-000000000000",
                "heartbeat_ms": frequency,
                "random": false
            }

        },
        "conditions": {},
        "rules": {
            "0": {
                "action": {
                    "timeout_ms": 0,
                    "cancel_conditions": {},
                    "action": {
                        "raise_alert": {
                            "zone": camera.accessPoint,
                            "archive": archiveName ? `hosts/${hostName}/MultimediaStorage.${archiveName}/MultimediaStorage` : "",
                            "offset_ms": 0,
                            "mode": mode,
                            "reactions": {},
                            "priority": "ALERT_PRIORITY_UNSPECIFIED",
                            "user_roles": [],
                            "pending_max_time_seconds": 0
                        }
                    }
                }
            }
        }
    }

    if (waitTimeout) {
        obj.rules["1"] = {
            "path": "",
            "timeout": {
                "timeout_ms": waitTimeout
            }
        }
    }
    if (handleAlert) {
        obj.rules["2"] = {
            "path": "",
            "action": {
                "timeout_ms": 0,
                "cancel_conditions": {},
                "action": {
                    "close_alert": {
                        "zone": "",
                        "resolution": "AR_Alarm",
                        "close_locked": true
                    }
                }
            }
        }
    }

    let body = {
        "method": "axxonsoft.bl.logic.LogicService.ChangeMacros",
        "data": {
            "added_macros": obj
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

    if (request.ok && !response.failed?.length) {
        console.log(`Was created cycle alarming macro for ${camera.accessPoint} by ${frequency} ms frequency`.green);
    } else console.log(`Error: Coudn't create cycle alarming macro for ${camera.accessPoint}. Code: ${request.status}, Failed: ${response.failed}`.red);
    
    await configurationCollector("macros");
}

export async function deleteMacro(macrosID: string[]) {

    let body = {
        "method": "axxonsoft.bl.logic.LogicService.ChangeMacros",
        "data": {
            "removed_macros": macrosID
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
        console.log(`Macros was successfully deleted!`.green);
    } else console.log(`Error: could not delete macros. Code: ${request.status}`.red);

    await configurationCollector("macros");
};
