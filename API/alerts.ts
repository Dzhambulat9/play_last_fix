import { serverURL, videoFolder, hostName, ROOT_AUTH } from '../global_variables';
import { green, blue, yellow, red } from 'colors';

export async function getActiveAlerts(cameraEndpoint: string) {
    let body = {
        "method": "axxonsoft.bl.logic.LogicService.GetActiveAlerts",
        "data": {
            "camera_ap" : cameraEndpoint
        }
    };

    let request = await fetch(`${serverURL}/grpc`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    
    
    let activeAlerts = await request.json();

    let activeAlertsList: { camera_ap: string, alert_id: string }[] = [];
    for (let alert of activeAlerts.alerts) {
        activeAlertsList.push({ camera_ap: cameraEndpoint, alert_id: alert.guid });
    }

    if (request.ok) {
        return activeAlertsList;
    } else console.log(`Error: could not pull alerts list. Code: ${request.status}`.red);

    return activeAlertsList;
};

export async function startAlertHandle( activeAlert: { camera_ap: string, alert_id: string, } ) {
    
    let request = await fetch(`${serverURL}/v1/logic_service/beginalert`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(activeAlert)
    });

    let alertHandleStart = await request.json();

    if (request.ok && alertHandleStart.result) {
        console.log(`Alert ${activeAlert.alert_id} handling is started.`);
        return true;
    } else console.log(`Error: could not start alert handling: ${activeAlert.camera_ap}/${activeAlert.alert_id}. Code: ${request.status}`);
};

export async function handleAlert( activeAlert: { [key: string]: any, camera_ap: string, alert_id: string } ) {
    activeAlert.severity = "SV_FALSE";

    let request = await fetch(`${serverURL}/v1/logic_service/completealert`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(activeAlert)
    });

    let alertHandle = await request.json();

    if (request.ok && alertHandle.result) {
        console.log(`Alert ${activeAlert.alert_id} has been handled.`);
        return true;
    } else console.log(`Error: could not handle alert: ${activeAlert.camera_ap}/${activeAlert.alert_id}. Code: ${request.status}`);
};

export async function initiateAlert( cameraRef: string ) {
    let refObject = { camera_ap: cameraRef };
    let request = await fetch(`${serverURL}/v1/logic_service/raisealert`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(refObject)
    });

    let alertHandle = await request.json();

    if (request.ok && alertHandle.result) {
        console.log(`Alert ${alertHandle.alert_id} has been initiated.`);
        return ({ camera_ap: cameraRef, alert_id: alertHandle.alert_id });
    } else console.log(`Error: could not initiate alert. Code: ${request.status}`);
};

export async function cancelAlertHandle( activeAlert: { camera_ap: string, alert_id: string, } ) {
    
    let request = await fetch(`${serverURL}/v1/logic_service/cancelalert`, {
        headers: {
            "Authorization": `Basic ${ROOT_AUTH}`,
        },
        method: "POST",
        body: JSON.stringify(activeAlert)
    });

    let cancelAlertHandling = await request.json();

    if (request.ok && cancelAlertHandling.result) {
        console.log(`Alert ${activeAlert.alert_id} handling is canceled.`);
        return true;
    } else console.log(`Error: could not cancel alert handling: ${activeAlert.camera_ap}/${activeAlert.alert_id}. Code: ${request.status}`);
};

export async function alarmFullProcessing( activeAlert: { camera_ap: string, alert_id: string, } ) {
    await startAlertHandle(activeAlert)
    if (await handleAlert(activeAlert)) {
        return true;
    };
};