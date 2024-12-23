import { test, expect, type WebSocket, type Page, Locator} from '@playwright/test';
import { timeToSeconds, waitForStableState } from "../utils/utils.js";
import { Locators } from '../locators/locators.js';
import { isCloudTest, hostName } from '../global_variables.js';

export async function checkSessionRequestsStopped(page: Page, cameraID = '') {
    let telemetryEndpoint = '';
    if (cameraID != '') {
        telemetryEndpoint = `/${hostName}/DeviceIpint.${cameraID}/TelemetryControl.0`
    }

    let requestNotSent = true;
    function handler(request) {
        if (request.url().includes('/control/telemetry/session/keepalive' + telemetryEndpoint)) {
            requestNotSent = false;
        }
    }

    await page.waitForTimeout(2000);
    page.on('request', handler);
    await page.waitForTimeout(5000);

    page.removeListener('request', handler);
    expect(requestNotSent, 'Session is still updating').toBeTruthy();
}


export async function checkInitiatedStreams(page: Page, ws: WebSocket, streamsArray: string[], timeout = 5000) {
    let gotMessage = false;

    function handler(msg) {
        console.log(msg.payload);
        if (!(msg.payload.includes('stop') || msg.payload.includes('update_token'))) {
            let streamData = JSON.parse(msg.payload.toString());
            let streamEndpoint = `hosts/${streamData.endpoint}`
            expect(streamsArray.includes(streamEndpoint), `Stream endpoint ${streamEndpoint} isn't included in expected array`).toBeTruthy();
            gotMessage = true;
        }
    }

    ws.on('framesent', handler);
    await page.waitForTimeout(timeout);

    ws.removeListener('framesent', handler);
    if (streamsArray.length) {
        expect(gotMessage, 'Did not receive expected messages').toBeTruthy();
    }
}