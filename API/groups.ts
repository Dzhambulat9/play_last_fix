import { serverURL, alloyAllPermisions, ROOT_AUTH } from '../global_variables';
import { green, blue, yellow, red } from 'colors';
import { configurationCollector, getIdByRoleName } from "../utils/utils.js";
import { randomUUID } from 'node:crypto';


export async function getGroups() {
    let body = {
        "method": "axxonsoft.bl.groups.GroupManager.ListGroups",
        "data": {
            "view": "VIEW_MODE_DEFAULT"
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    let groupsList = await request.json();

    if (request.ok) {
        return groupsList.groups;
    } else console.log(`Error: could not pull groups list. Code: ${request.status}`.red);
};


export async function createGroup(groupName = 'Group', parentID = "") {
    let groupId = randomUUID();

    let body = {
        "method": "axxonsoft.bl.groups.GroupManager.ChangeGroups",
        "data": {
            "added_groups": {
                "group_id": groupId,
                "name": groupName,
                "parent": parentID,
                "description": ""
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
        console.log(`The group (${groupName}) was successfully created! UUID: ${groupId}`.green);
    } else console.log(`Error: The group (${groupName}) was not created. Code: ${request.status}`.red);

    await configurationCollector("groups");
    return groupId;
};

export async function setGroup(currentGroupID: string, parentGroupID: string) {

    let body = {
        "method": "axxonsoft.bl.groups.GroupManager.ChangeGroups",
        "data": {
            "changed_groups_info": {
                "group_id": currentGroupID,
                "parent": parentGroupID
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
        console.log(`Group "${currentGroupID}" was assigned to parent "${parentGroupID}"!`.green);
    } else console.log(`Error: could not assigned "${currentGroupID}" to "${parentGroupID}". Code: ${request.status}`.red);
};

export async function deleteGroup(groupsID: string[]) {

    let body = {
        "method": "axxonsoft.bl.groups.GroupManager.ChangeGroups",
        "data": {
            "removed_groups": groupsID
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
        console.log(`Groups was successfully deleted!`.green);
    } else console.log(`Error: could not delete groups. Code: ${request.status}`.red);

    await configurationCollector("groups");
};

export async function addCameraToGroup(groupID: string, camerasList: { [key: string]: any, "videochannelID": string }[]) {
    let itemsArr: object[] = [];
    for (let camera of camerasList) {
        itemsArr.push({
            "group_id": groupID,
            "object": camera.accessPoint
        });
    };

    let body = {
        "method": "axxonsoft.bl.groups.GroupManager.SetObjectsMembership",
        "data": {
            "added_objects": itemsArr
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    let nameList = camerasList.map(item => `${item.displayId}.${item.displayName}`);
    if (request.ok) {
        console.log(`Camera ${nameList.toString()} was successfully added to group "${groupID}"!`.green);
    } else console.log(`Error: could not add ${nameList.toString()} to group "${groupID}". Code: ${request.status}`.red);
};


export async function setGroupPermissions(currentGroupID: string, roleName: string, accessLevel: "CAMERA_ACCESS_FORBID" | "CAMERA_ACCESS_ONLY_ARCHIVE" | "CAMERA_ACCESS_MONITORING_ON_PROTECTION" | "CAMERA_ACCESS_MONITORING" | "CAMERA_ACCESS_ARCHIVE" | "CAMERA_ACCESS_MONITORING_ARCHIVE_MANAGE" | "CAMERA_ACCESS_FULL") {

    let body = {
        "method": "axxonsoft.bl.security.SecurityService.SetGroupsPermissions",
        "data": {
            "permissions": {
                "role_id": getIdByRoleName(roleName),
                "groups_permissions": {
                    [currentGroupID]: {
                        "camera_access": accessLevel
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
        console.log(`Group "${currentGroupID}" cameras permissions for role "${roleName}" was changed to level "${accessLevel}"!`.green);
    } else console.log(`Error: could not changed permissions to "${currentGroupID}" group for role "${roleName}". Code: ${request.status}`.red);
};