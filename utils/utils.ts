import { test, expect, type Page, Locator} from '@playwright/test';
import { getCamerasEndpoints, deleteCameras } from "../API/cameras";
import { getLayoutList, deleteLayouts } from "../API/layouts";
import { getRolesAndUsers, deleteRoles } from "../API/roles";
import { deleteUsers } from "../API/users";
import { Configuration, cloudAccessToken, hostName, isCloudTest, serverURL } from "../global_variables";
import { deleteGroup, getGroups } from "../API/groups";
import { getArchiveList } from "../API/archives";
import { deleteMacro, getMacrosList } from '../API/macro';
import { deleteDetectors, getDetectorsList } from '../API/detectors';
import { deleteBookmark, getBookmarks } from '../API/bookmarks';
import { deleteMaps, getMapsList } from '../API/maps';
import { Locators } from '../locators/locators';


export async function authorization(page: Page, userName: string, userPassword: string) {
    const locators = new Locators(page);

    if (isCloudTest) {
        await page.evaluate((cloudAccessToken) => {
            localStorage.accessToken = cloudAccessToken;
        }, cloudAccessToken);

        await page.reload();
        await locators.nextLogo.waitFor({ state: 'visible', timeout: 40000 });
        //console.log('------------------CONTENT IS LOADED------------------');

        return 'Cloud test';
    }

    await locators.loginField.fill(userName);
    await locators.passwordField.fill(userPassword);
    await locators.passwordField.press('Enter');
};

export async function goToBookmarkModeIfNeeded(page: Page) {
    const locators = new Locators(page);

    if (isCloudTest) {
        await locators.topMenuButton.click({ timeout: 30000 });
        await locators.bookmarkMode.click();
    }
};

export async function logout(page: Page) {
    const locators = new Locators(page);

    await locators.topMenuButton.click();
    await locators.changeUser.click();
};

export async function isCameraListOpen(page: Page) {
    const locators = new Locators(page);

    await page.waitForTimeout(500); //list close/open animation timeout
    let isVisible = await locators.sortByFavoriteButton.isVisible(); //favorite button is visible
    return isVisible;
};

export async function openCameraList(page: Page) {
    const locators = new Locators(page);

    if (isCloudTest) {
        await locators.webpage.locator('.splash--mini.hidden').waitFor({ state: 'attached' });
    }
    await waitAnimationEnds(page, locators.cameraPanelButton);
    const isOpen = await locators.cameraPanel.getAttribute('data-expanded');

    if (isOpen === 'false') {
        await locators.cameraPanelButton.click();
        await page.waitForTimeout(1000);
    };
    
};

export async function closeCameraList(page: Page) {
    const locators = new Locators(page);

    if (isCloudTest) {
        await locators.webpage.locator('.splash--mini.hidden').waitFor({ state: 'attached' });
    }
    await waitAnimationEnds(page, locators.cameraPanelButton);
    const isOpen = await locators.cameraPanel.getAttribute('data-expanded');

    if (isOpen === 'true') {
        await locators.cameraPanelButton.click();
        await page.waitForTimeout(1000);
    };
    
};

export async function getCameraList() {
    let cameras = await getCamerasEndpoints();
    let newArr: { [key: string]: any, 'videochannelID': string, 'cameraBinding': string, 'accessPointChanged': string,  "isIpServer": boolean }[] = [];
    for (let camera of cameras) {
        let cameraVideochannel = camera.accessPoint.replace("SourceEndpoint.video:", "VideoChannel.").replace(/:\w*/, "");
        let cameraBinding = camera.accessPoint.replace(/\/SourceEndpoint.video:.*/, "");
        let accessPointChanged = camera.accessPoint.replace("hosts/", "");
        let isIpServer = false;
        if (camera.displayId.includes('.')) {
            isIpServer = true;
        };

        camera['videochannelID'] = cameraVideochannel;
        camera['cameraBinding'] = cameraBinding;
        camera['accessPointChanged'] = accessPointChanged;
        camera['isIpServer'] = isIpServer;
        
        newArr.push(camera);
    }
    return(newArr);
};

export async function cameraAnnihilator(cameras: 'all' | { [key: string]: any, cameraBinding: string }[]) {
    let cameraList: { [key: string]: any, cameraBinding: string }[];

    if (cameras == "all") {
        cameraList = await getCameraList();
    } else cameraList = cameras;

    let cameraEndpoints: string[] = [];
    for (let camera of cameraList) {
        if (!cameraEndpoints.includes(camera.cameraBinding)) {
            cameraEndpoints.push(camera.cameraBinding);
        }
    }

    if (cameraEndpoints.length != 0) {
        await deleteCameras(cameraEndpoints);
    }    
};

export async function layoutAnnihilator(layouts: 'all' | { [key: string]: any }[]) {
    let layoutList: { [key: string]: any }[] = [];
    
    if (layouts == "all") {
        layoutList = await getLayoutList();
    } else layoutList = layouts;
    
    let layoutIDs: string[] = [];
    for (let layout of layoutList) {
        if (!layoutIDs.includes(layout?.meta?.layout_id)) {
            layoutIDs.push(layout.meta.layout_id);
        }
    }

    if (layoutIDs.length != 0) {
        await deleteLayouts(layoutIDs);
    } 
};

export async function userAnnihilator(users: 'all' | { [key: string]: any, index: string }[]) {
    let userList: { [key: string]: any, index: string }[] = [];
    
    if (users == "all") {
        let rolesAndUsers = await getRolesAndUsers();
        userList = rolesAndUsers.users;
    } else userList = users;
    
    let userIDs: string[] = [];
    for (let user of userList) {
        if (!userIDs.includes(user?.index) && user.login.includes('_test')) {
            userIDs.push(user.index);
        }
    }

    if (userIDs.length != 0) {
        await deleteUsers(userIDs);
    }  
};

export async function roleAnnihilator(roles: 'all' | { [key: string]: any, index: string }[]) {
    let roleList: { [key: string]: any, index: string }[] = [];
    
    if (roles == "all") {
        let rolesAndUsers = await getRolesAndUsers();
        roleList = rolesAndUsers.roles;
    } else roleList = roles;
    
    let roleIDs: string[] = [];
    for (let role of roleList) {
        if (!roleIDs.includes(role?.index) && role.name != "admin") {
            roleIDs.push(role.index);
        }
    }

    if (roleIDs.length != 0) {
        await deleteRoles(roleIDs);
    }  
};

export async function groupAnnihilator(groups: 'all' | { [key: string]: any, group_id: string }[]) {
    let groupList: { [key: string]: any, group_id: string }[] = [];
    
    if (groups == "all"){
        groupList = await getGroups();
    } else groupList = groups;
    
    let groupIDs: string[] = [];
    for (let group of groupList) {
        if (!groupIDs.includes(group?.group_id) && group.name != "Default") {
            groupIDs.push(group.group_id);
        }
    }

    if (groupIDs.length != 0) {
        await deleteGroup(groupIDs);
    }  
};

export async function macroAnnihilator(macros: 'all' | { [key: string]: any, guid: string }[]) {
    let macroList: { [key: string]: any, guid: string }[] = [];
    
    if (macros == "all"){
        macroList = await getMacrosList();
    } else macroList = macros;
    
    let macroIDs: string[] = [];
    for (let macro of macroList) {
        if (!macroIDs.includes(macro?.guid)) {
            macroIDs.push(macro.guid);
        }
    }

    if (macroIDs.length != 0) {
        await deleteMacro(macroIDs);
    }  
};

export async function detectorAnnihilator(detectors: 'all' | { [key: string]: any, uid: string }[]) {
    let detectorsList: { [key: string]: any, uid: string }[];

    if (detectors == "all") {
        detectorsList = await getDetectorsList();
    } else detectorsList = detectors;

    let detectorsEndpoints: string[] = [];
    for (let detector of detectorsList) {
        if (!detectorsEndpoints.includes(detector.uid)) {
            detectorsEndpoints.push(detector.uid);
        }
    }

    if (detectorsEndpoints.length != 0) {
        await deleteDetectors(detectorsEndpoints);
    }    
};

export async function bookmarkAnnihilator(bookmarks: 'all' | { [key: string]: any, id: string }[]) {
    let bookmarksList: { [key: string]: any, id: string }[];

    if (bookmarks == "all") {
        bookmarksList = await getBookmarks();
    } else bookmarksList = bookmarks;

    let bookmarksEndpoints: string[] = [];
    for (let bookmark of bookmarksList) {
        if (!bookmarksEndpoints.includes(bookmark.id)) {
            bookmarksEndpoints.push(bookmark.id);
        }
    }

    if (bookmarksEndpoints.length != 0) {
        await deleteBookmark(bookmarksEndpoints);
    }    
};

export async function mapAnnihilator(maps: 'all' | { meta: {[key: string]: any, id: string}, data: {[key: string]: any} }[]) {
    let mapList: { meta: {[key: string]: any, id: string}, data: {[key: string]: any} }[] = [];
    
    if (maps == "all"){
        mapList = await getMapsList();
    } else mapList = maps;
    
    let mapIDs: string[] = [];
    for (let map of mapList) {
        if (!mapIDs.includes(map?.meta.id)) {
            mapIDs.push(map.meta.id);
        }
    }

    if (mapIDs.length != 0) {
        await deleteMaps(mapIDs);
    }  
};

export async function configurationCollector(type: "all" | "base" | "cameras" | "layouts" | "users" | "roles" | "groups" | "archives" | "macros" | "detectors" | "maps"  = "all") {
    if (type == "all" || type  == "cameras" || type  == "base") {
        let cameraList = await getCameraList();
        Configuration.cameras = cameraList;
    }

    if (type == "all" || type == "layouts"  || type  == "base") {
        let layoutList = await getLayoutList();
        Configuration.layouts = layoutList;
    }

    if (type == "all" || type == "users" || type == "roles") {

        let usersRoles = await getRolesAndUsers();

        // let users = usersRoles.users.filter(element => {
        //     return element.name != "root";
        // });
        Configuration.users = usersRoles.users;

        // let roles = usersRoles.roles.filter(element => {
        //     return element.name != "admin";
        // });
        Configuration.roles = usersRoles.roles;

    }

    if (type == "all" || type == "groups") {
        let groupList = await getGroups();
        Configuration.groups = groupList;
    }

    if (type == "all" || type == "archives" || type  == "base") {
        let archiveList = await getArchiveList();
        Configuration.archives = archiveList;
    }

    if (type == "all" || type == "macros") {
        let macrosList = await getMacrosList();
        Configuration.macros = macrosList;
    }

    if (type == "all" || type == "detectors") {
        let detectorList = await getDetectorsList();
        Configuration.detectors = detectorList;
    }

    if (type == "all" || type == "maps") {
        let mapList = await getMapsList();
        Configuration.maps = mapList;
    }
}

export function getIdByUserName(userName: string) {
    for (let user of Configuration.users) {
        if (userName === user.login) { 
            return user.index;
        }
    }
};

export function getIdByRoleName(roleName: string) {
    for (let role of Configuration.roles) {
        if (roleName === role.name) { 
            return role.index;
        }
    }
};

export async function waitAnimationEnds(page: Page, locator: Locator) {
    // await locator.evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(animation => animation.finished)));
    let anime = await locator.evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(animation => animation.playState)));
    let i = 0;
    while (anime.length != 0) {
        i++;
        await page.waitForTimeout(100);
        anime = await locator.evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(animation => animation.playState)));
        console.log(`${anime.length} animations is processing`);

        if (i > 50) {
            //роняем тест
            expect(false).toBeTruthy();
        }
    }
}

export async function waitForStableState(locator: Locator) {
    const elem = await locator.elementHandle();
    await elem?.waitForElementState('stable', { timeout: 10000 });
}

export function timeToSeconds(time: string, accurancy = 0) {
    let timeArr = time.split(':');
    return (Number(timeArr[0])*60*60 + Number(timeArr[1])*60 + Number(timeArr[2]) + Number(accurancy));
}

export async function clientNotFall(page: Page) {
    const locators = new Locators(page);

    await expect(locators.body).not.toHaveClass(/.*error.*/);
}

export function compareTwoNumbers(firstNumber: number, secondNumber: number, imprecision = 0) {
    let lowerLimit = secondNumber - imprecision;
    let upperLimit = secondNumber + imprecision;
    console.log(`Impessision is ${imprecision}, so acceptable interval for first number ${firstNumber} is [${lowerLimit}, ${upperLimit}]`);
    expect(firstNumber).toBeGreaterThanOrEqual(lowerLimit);
    expect(firstNumber).toBeLessThanOrEqual(upperLimit);
}

export async function emulateServerTimezone(page: Page, timezoneMinutes: number) {
    await page.route(`**/hosts/${hostName}*`, async route => {
        let response = await route.fetch();
        let responseBody = await response.json();
        responseBody.timeZone = timezoneMinutes;
        route.fulfill({ body: JSON.stringify(responseBody), contentType: 'application/json; charset=utf-8' });
    });
}

export function extractMonthInterval(date: Date) {
    let time = new Date(date);
    let year = time.getFullYear();
    let month = (`0${time.getMonth() + 1}`).slice(-2);
    time.setMonth(time.getMonth() + 1, 0);
    let lastDay = time.getDate();
    return `${year}${month}01T000000.000/${year}${month}${lastDay}T235959.999`
}

export async function getSoundStatusFromCell(page: Page, cellNumber: number) {
    const locators = new Locators(page);
    
    const videoStarted = locators.videoCellWrapper.nth(cellNumber).locator('.VideoCell--playing');
    await videoStarted.waitFor({ state: 'attached' });

    let isSoundOn = await locators.videoCell.nth(cellNumber).evaluate((item) => {
        const videoCell = item.querySelector('video');
        return !(videoCell!.muted);
    });

    return isSoundOn;
}

export function getTimeStringsFromDateObject(date: Date) {
    let obj = { 
        seconds: "0",
        minutes: "0",
        hours: "0",
        fullTime: "00:00:00",
    }
    
    obj.seconds = (`0${date.getSeconds()}`).slice(-2);
    obj.minutes = (`0${date.getMinutes()}`).slice(-2);
    obj.hours = (`0${date.getHours()}`).slice(-2);
    obj.fullTime = `${obj.hours}:${obj.minutes}:${obj.seconds}`;

    return obj;
}

