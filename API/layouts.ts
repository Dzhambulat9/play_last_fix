import { serverURL, videoFolder, hostName, ROOT_AUTH, Configuration } from '../global_variables';
import { green, blue, yellow, red } from 'colors';
import { randomUUID } from 'node:crypto';
import { configurationCollector, getIdByRoleName } from "../utils/utils.js";


export async function createLayout(camerasEndpoints: { [key: string]: any, "accessPoint": string }[], width = 2, height = 2, layoutName = "New Layout", 
shareWithRole = '', streamResolution: { [key: number]: "AUTO" | "HIGH" | "LOW" } = {}) {
    let cellMatrix: { [key: string]: any }[] = [];
    let index = 0;
    for (let i = 0; i < height; i++) {

        for (let j = 0; j < width; j++) {
  
            let left = j - 1;
            left >= 0 ? left = left + i * width : left = -1;
  
            let right = j + 1;
            right < width ? right = right + i * width : right = -1;
  
            let top = j - width + i * width;
            top >= 0 ? top : top = -1;
  
            let bottom = j + width + i * width;
            bottom < width * height ? bottom : bottom = -1;
  
            let obj = {
                "position": index,
                "dimensions": {
                    "width": 1 / width,
                    "height": 1 / height
                },
                "left_sibling_position": left,
                "top_sibling_position": top,
                "right_sibling_position": right,
                "bottom_sibling_position": bottom,
                "camera_ap": camerasEndpoints[index].accessPoint,
                "video_parameters": {
                    "microphone": "",
                    "audio_volume": 0,
                    "show_tracking": false,
                    "auto_tracking": false,
                    "auto_fit": false,
                    "video_filter": "EVideoFilterType_UNSPECIFIED",
                    "rotate_angle": 0,
                    "show_text_source_flags": {},
                    "stream_resolution": streamResolution[index] ? `CAMERA_STREAM_RESOLUTION_${streamResolution[index]}` : "CAMERA_STREAM_RESOLUTION_AUTO",
                    "default_zoom_info": {
                        "is_panomorph_on": false,
                        "panomorph_position": "PANOMORPH_CAMERAPOSITION_WALL",
                        "zoom_parameters": {
                            "zoom_point": {
                                "x": 0.5,
                                "y": 0.5
                            },
                            "zoom_value": 1
                        }
                    },
                    "equipment_info": {
                        "relays_position": {
                            "visible": false,
                            "positions": {
                                "component_ap": "",
                                "position": {}
                            }
                        },
                        "sensors_position": {}
                    },
                    "should_connect_to_archive": false
                }
            };
            index++;
            cellMatrix.push(obj);
        }

    }
  
    let cellsObject = Object();
    for (let cell of cellMatrix) {
        cellsObject[cell.position] = cell;
    };

    let layoutUUID = randomUUID();
    let body = {
        "method": "axxonsoft.bl.layout.LayoutManager.Update",
        "data": {
            "created": [
                {
                    "alarm_mode": false,
                    "cells": cellsObject,
                    "display_name": layoutName,
                    "id": layoutUUID,
                    "is_for_alarm": false,
                    "is_user_defined": true,
                    "map_view_mode": "MAP_VIEW_MODE_LAYOUT_ONLY"
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

    if (request.ok && !response.failed?.length) {
        console.log(`Layout "${layoutName}" (${width}x${height}) was successfully created! UUID: ${layoutUUID}`.green);
    } else console.log(`Error: Layout "${layoutName}" (${width}x${height}) was not created. Code: ${request.status}, Failed: ${response.failed}`.red);
    
    await configurationCollector("layouts");
    if (shareWithRole) {
        console.log(Configuration.layouts);
        console.log(Configuration.roles);
        console.log(Configuration.users);
        console.log(Configuration.layouts.filter(item => item.meta.layout_id == layoutUUID)[0]);
        await shareLayout(Configuration.layouts.filter(item => item.meta.layout_id == layoutUUID)[0], shareWithRole);
    }
    return layoutUUID;
};


export async function shareLayout(layoutObject: { [key: string]: any, meta: { [key: string]: any, etag: string, layout_id: string } }, roleName: string) {

    let body = {
        "method": "axxonsoft.bl.layout.LayoutManager.Update",
        "data": {
            "sharing": [
                {
                    "layout_id": layoutObject.meta.layout_id,
                    "role_ids": [
                        getIdByRoleName(roleName)
                    ],
                    "etag": layoutObject.meta.etag
                }
            ]
        }
    }

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });

    let response = await request.json();

    if (request.ok && !response.failed?.length) {
        console.log(`Layout "${layoutObject.meta.layout_id}" was successfully shared to role ${roleName}!`.green);
    } else console.log(`Error: Layout "${layoutObject.meta.layout_id}" wasn't shared to role ${roleName}!, Failed: ${response.failed}`.red);
};


export async function deleteLayouts(layoutsID: string[]) {

    let body = {
        "method": "axxonsoft.bl.layout.LayoutManager.Update",
        "data": {
            "removed": layoutsID
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
        console.log(`Layots ${layoutsID.toString()} was successfully deleted!`.green);
    } else console.log(`Error: could not delete layouts ${layoutsID.toString()}. Code: ${request.status}`.red);

    await configurationCollector("layouts");
};

export async function getLayoutList() {
    let request = await fetch(`${serverURL}/v1/layouts`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        }
    });

    let layoutList = await request.json();
    
    if (request.ok) {
        return layoutList.items;
    } else console.log(`Error: could not pull layouts list. Code: ${request.status}`.red);
};

export async function createLayoutWithSpecialCell(camerasEndpoints: { [key: string]: any, "accessPoint": string }[], specialCells: { [cellNumber: number]: "web-panel" | 'event-board' | 'statistics-panel' }, width = 2, height = 2, layoutName = "New Layout") {
    let cellMatrix: { [key: string]: any }[] = [];
    let index = 0;
    for (let i = 0; i < height; i++) {

        for (let j=0; j < width; j++) {
  
            let left = j - 1;
            left >= 0 ? left = left + i * width : left = -1;
  
            let right = j + 1;
            right < width ? right = right + i * width : right = -1;
  
            let top = j - width + i * width;
            top >= 0 ? top : top = -1;
  
            let bottom = j + width + i * width;
            bottom < width * height ? bottom : bottom = -1;
  
            let obj = {
                "position": index,
                "dimensions": {
                    "width": 1 / width,
                    "height": 1 / height
                },
                "left_sibling_position": left,
                "top_sibling_position": top,
                "right_sibling_position": right,
                "bottom_sibling_position": bottom,
                "camera_ap": index in specialCells ? "" : camerasEndpoints[index].accessPoint,
                "video_parameters": {
                    "microphone": "",
                    "audio_volume": 0,
                    "show_tracking": false,
                    "auto_tracking": false,
                    "auto_fit": false,
                    "video_filter": "EVideoFilterType_UNSPECIFIED",
                    "rotate_angle": 0,
                    "show_text_source_flags": {},
                    "stream_resolution": "CAMERA_STREAM_RESOLUTION_AUTO",
                    "default_zoom_info": {
                        "is_panomorph_on": false,
                        "panomorph_position": "PANOMORPH_CAMERAPOSITION_WALL",
                        "zoom_parameters": {
                            "zoom_point": {
                                "x": 0.5,
                                "y": 0.5
                            },
                            "zoom_value": 1
                        }
                    },
                    "equipment_info": {
                        "relays_position": {
                            "visible": false,
                            "positions": {
                                "component_ap": "",
                                "position": {}
                            }
                        },
                        "sensors_position": {}
                    },
                    "should_connect_to_archive": false
                }
            };
            if (index in specialCells && specialCells[index] == 'web-panel') {
                obj["board_settings"] = {
                    "params": {
                        "hide_panel": false,
                        "open_layout_on_event": false,
                        "selected_filters": [],
                        "name": "quasar",
                        "web_board_type": {
                            "url_address": "https://ru.wikipedia.org/wiki/Квазар",
                            "web_engine": "CEF",
                            "script_path": ""
                        }
                    },
                    "default_view_state": "BOARD_VIEW_STATE_IMAGE_ONLY"
                }
            }
            if (index in specialCells && specialCells[index] == 'event-board') {
                obj["board_settings"] = {
                    "params": {
                        "hide_panel": false,
                        "open_layout_on_event": false,
                        "selected_filters": [
                            "{\"Version\":1,\"QueryString\":\"\"}"
                        ],
                        "name": "",
                        "event_board_type": {
                            "strict_filtering": false
                        }
                    },
                    "default_view_state": "BOARD_VIEW_STATE_IMAGE_ONLY"
                }
            }
            if (index in specialCells && specialCells[index] == 'statistics-panel') {
                obj["board_settings"] = {
                    "params": {
                        "hide_panel": false,
                        "open_layout_on_event": false,
                        "selected_filters": [
                            "{\"Version\":1,\"QueryString\":\"\"}"
                        ],
                        "name": "",
                        "counter_board_type": {
                            "factor": 1,
                            "averaging_interval_type": "MINUTES"
                        }
                    },
                    "default_view_state": "BOARD_VIEW_STATE_IMAGE_ONLY"
                }
            }
            index++;
            cellMatrix.push(obj);
        }
    }
  
    let cellsObject = Object();
    for (let cell of cellMatrix) {
        cellsObject[cell.position] = cell;
    };

    let layoutUUID = randomUUID();
    let body = {
        "method": "axxonsoft.bl.layout.LayoutManager.Update",
        "data": {
            "created": [
                {
                    "alarm_mode": false,
                    "cells": cellsObject,
                    "display_name": layoutName,
                    "id": layoutUUID,
                    "is_for_alarm": false,
                    "is_user_defined": true,
                    "map_view_mode": "MAP_VIEW_MODE_LAYOUT_ONLY"
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

    if (request.ok && !response.failed?.length) {
        console.log(`Layout "${layoutName}" (${width}x${height}) was successfully created! UUID: ${layoutUUID}`.green);
    } else console.log(`Error: Layout "${layoutName}" (${width}x${height}) was not created. Code: ${request.status}, Failed: ${response.failed}`.red);
    
    await configurationCollector("layouts");
    return layoutUUID;
};