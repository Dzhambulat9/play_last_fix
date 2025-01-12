import { test, expect, Page, } from '@playwright/test';
import { clientURL, Configuration, ROOT_LOGIN, virtualVendor, ROOT_PASSWORD, alloyAllPermisions, isCloudTest } from '../global_variables';
import { createRole, setRolePermissions } from '../API/roles';
import { createUser, setUserPassword, assignUserRole } from '../API/users';
import { createArchive, createArchiveVolume, createArchiveContext, deleteArchive, getArchiveIntervals } from '../API/archives';
import { createCamera, addVirtualVideo, changeSingleCameraName } from '../API/cameras';
import { createLayout } from '../API/layouts';
import { Locators } from '../locators/locators';
import { getHostName } from '../API/host';
import { comparePointerPositions, isTimeEquals, timeToISO, transformISOtime } from '../utils/archive_helpers';
import { cameraAnnihilator, layoutAnnihilator, configurationCollector, userAnnihilator, roleAnnihilator, authorization, clientNotFall, bookmarkAnnihilator, logout, goToBookmarkModeIfNeeded } from "../utils/utils.js";
import { createBookmark, getBookmarks } from '../API/bookmarks';
let bookmarks: {
    startTime: string,
    endTime: string,
    comment: string,
    cameraRef: string,
    isProtected: boolean,
    author: string
    createdTime: any
}[] = [];


test.describe("Bookmarks. Common block", () => {

    test.beforeAll(async () => {
        await getHostName();
        await configurationCollector();
        await bookmarkAnnihilator("all");
        await cameraAnnihilator("all");
        await layoutAnnihilator("all");
        await deleteArchive('Black');
        await createCamera(3, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", 0);
        await changeSingleCameraName(Configuration.cameras[0].cameraBinding, "First Camera");
        await changeSingleCameraName(Configuration.cameras[1].cameraBinding, "Second Camera");
        await changeSingleCameraName(Configuration.cameras[2].cameraBinding, "Third Camera");
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await createArchive("Black");
        await createArchiveVolume("Black", 10);
        await createArchiveContext("Black", Configuration.cameras, true, "High");
        bookmarkAnnihilator("all");
        let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        await wait(30000);
        const currentTime = new Date();
        let startTime = new Date();
        let endTime = new Date();
        
        startTime.setSeconds(currentTime.getSeconds());
        await createBookmark(Configuration.cameras[2].accessPoint, 'Black', timeToISO(startTime), timeToISO(startTime), "Bookmark Frame");
        bookmarks.push({
            startTime: `${startTime.getHours()}:${startTime.getMinutes()}:${startTime.getSeconds()}`,
            endTime: `${startTime.getHours()}:${startTime.getMinutes()}:${startTime.getSeconds()}`,
            comment: "Bookmark Frame",
            cameraRef: `${Configuration.cameras[2].displayId}.${Configuration.cameras[2].displayName}`,
            isProtected: false,
            author: ROOT_LOGIN, // !Exchange
            createdTime: new Date()
        });

        startTime.setSeconds(currentTime.getSeconds() - 10);
        endTime.setSeconds(currentTime.getSeconds() - 5);
        await createBookmark(Configuration.cameras[1].accessPoint, 'Black', timeToISO(startTime), timeToISO(endTime), "Bookmark Video");
        bookmarks.push({
            startTime: `${startTime.getHours()}:${startTime.getMinutes()}:${startTime.getSeconds()}`,
            endTime: `${endTime.getHours()}:${endTime.getMinutes()}:${endTime.getSeconds()}`,
            comment: "Bookmark Video",
            cameraRef: `${Configuration.cameras[1].displayId}.${Configuration.cameras[1].displayName}`,
            isProtected: false,
            author: ROOT_LOGIN,
            createdTime: new Date()
        });

        startTime.setSeconds(startTime.getSeconds() - 10);
        endTime.setSeconds(endTime.getSeconds() - 5);
        await createBookmark(Configuration.cameras[0].accessPoint, 'Black', timeToISO(startTime), timeToISO(endTime), "Bookmark Protected", true);
        bookmarks.push({
            startTime: `${startTime.getHours()}:${startTime.getMinutes()}:${startTime.getSeconds()}`,
            endTime: `${endTime.getHours()}:${endTime.getMinutes()}:${endTime.getSeconds()}`,
            comment: "Bookmark Protected",
            cameraRef: `${Configuration.cameras[0].displayId}.${Configuration.cameras[0].displayName}`,
            isProtected: true,
            author: ROOT_LOGIN,
            createdTime: new Date()
        });
    });
    
    test.beforeEach(async ({ page }) => {
        const locators = new Locators(page);
        await removeExcessBookmarks(page);
        await page.goto(clientURL);
        await authorization(page, ROOT_LOGIN, ROOT_PASSWORD);
        await locators.topMenuButton.click();
        await locators.bookmarkMode.click();
    });
    
    test('Bookmarks presentation (CLOUD-T189)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        for (let i = 0; i < 3; i++) {
            const startTime = (await locators.bookmarkBegin.nth(i).innerText()).slice(0, 8);
            isTimeEquals(bookmarks[i].startTime, startTime);
            const endTime = (await locators.bookmarkEnd.nth(i).innerText()).slice(0, 8);
            isTimeEquals(bookmarks[i].endTime, endTime);
            const createdTime = (await locators.bookmarkCreated.nth(i).innerText()).slice(0, 8);
            const createdTimeReal = `${bookmarks[i].createdTime.getHours()}:${bookmarks[i].createdTime.getMinutes()}:${bookmarks[i].createdTime.getSeconds()}`;
            isTimeEquals(createdTimeReal, createdTime, 5);
            await expect(locators.bookmarkAuthor.nth(i)).toHaveText(bookmarks[i].author);
            await expect(locators.bookmarkCamera.nth(i)).toHaveText(bookmarks[i].cameraRef);
            await expect(locators.bookmarkComment.nth(i)).toHaveText(bookmarks[i].comment);
            expect(await locators.bookmarkProtection.nth(i).isChecked()).toEqual(bookmarks[i].isProtected);

        }

        await clientNotFall(page);
    });

    test('Picking bookmarks (CLOUD-T190)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        await expect(locators.editBookmarkButton).toBeHidden();
        await expect(locators.deleteRecordButton).toBeHidden();
        await expect(locators.deleteOneBookmarkButton).toBeHidden();
        await locators.bookmark.nth(0).click();
        await expect(locators.bookmark.nth(0)).toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(1)).not.toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(2)).not.toHaveClass(/.*Mui-selected.*/);
        expect(await locators.bookmarkCheckbox.nth(0).isChecked()).toBeTruthy();
        expect(await locators.bookmarkCheckbox.nth(1).isChecked()).toBeFalsy();
        expect(await locators.bookmarkCheckbox.nth(2).isChecked()).toBeFalsy();
        await expect(locators.editBookmarkButton).toBeVisible();
        await expect(locators.deleteRecordButton).toBeVisible();
        await expect(locators.deleteOneBookmarkButton).toBeVisible();

        await locators.bookmark.nth(1).click();
        await expect(locators.bookmark.nth(0)).not.toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(1)).toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(2)).not.toHaveClass(/.*Mui-selected.*/);
        expect(await locators.bookmarkCheckbox.nth(0).isChecked()).toBeFalsy();
        expect(await locators.bookmarkCheckbox.nth(1).isChecked()).toBeTruthy();
        expect(await locators.bookmarkCheckbox.nth(2).isChecked()).toBeFalsy();
        await expect(locators.editBookmarkButton).toBeVisible();
        await expect(locators.deleteRecordButton).toBeVisible();
        await expect(locators.deleteOneBookmarkButton).toBeVisible();

        await locators.bookmarkCheckbox.nth(1).uncheck();
        await expect(locators.bookmark.nth(0)).not.toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(1)).not.toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(2)).not.toHaveClass(/.*Mui-selected.*/);
        expect(await locators.bookmarkCheckbox.nth(0).isChecked()).toBeFalsy();
        expect(await locators.bookmarkCheckbox.nth(1).isChecked()).toBeFalsy();
        expect(await locators.bookmarkCheckbox.nth(2).isChecked()).toBeFalsy();
        await expect(locators.editBookmarkButton).toBeHidden();
        await expect(locators.deleteRecordButton).toBeHidden();
        await expect(locators.deleteOneBookmarkButton).toBeHidden();

        await locators.bookmarkCheckbox.nth(0).check();
        await locators.bookmarkCheckbox.nth(1).check();
        await locators.bookmarkCheckbox.nth(2).check();
        await expect(locators.bookmark.nth(0)).toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(1)).toHaveClass(/.*Mui-selected.*/);
        await expect(locators.bookmark.nth(2)).toHaveClass(/.*Mui-selected.*/);
        expect(await locators.bookmarkCheckbox.nth(0).isChecked()).toBeTruthy();
        expect(await locators.bookmarkCheckbox.nth(1).isChecked()).toBeTruthy();
        expect(await locators.bookmarkCheckbox.nth(2).isChecked()).toBeTruthy();
        await expect(locators.editBookmarkButton).toBeHidden();
        await expect(locators.deleteRecordButton).toBeHidden();
        await expect(locators.deleteOneBookmarkButton).toBeHidden();
        await expect(locators.deleteBookmarksButton).toBeVisible();

        await clientNotFall(page);
    });

    test('Bookmark search by comment (CLOUD-T191)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["Frame", "pro", "Bookmark Video", "bookmark protected"];
    
        await expect(locators.bookmark).toHaveCount(3);
    
        for (let input of searchList) {
            await locators.searchField.fill(input);
            await expect(locators.bookmark).toHaveCount(1);
        }

        await clientNotFall(page);
    });

    test('Bookmark search by camera name (CLOUD-T192)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["Sec", "cam", "3.Third Camera", "first camera"];
    
        await expect(locators.bookmark).toHaveCount(3);
    
        for (let input of searchList) {
            await locators.searchField.fill(input);
            if (input === "cam") {
                await expect(locators.bookmark).toHaveCount(3);
            } else {
                await expect(locators.bookmark).toHaveCount(1);
            }   
        }
        
        await clientNotFall(page);
    });

    test('Bookmark search by nonexistent name (CLOUD-T193)', async ({ page }) => {
        const locators = new Locators(page);
        const searchList = ["999", "null", "undefined", "nihill"];
    
        await expect(locators.bookmark).toHaveCount(3);
    
        for (let input of searchList) {
            await locators.searchField.fill(input);
            await expect(locators.bookmark).toHaveCount(0);
        }
        
        await clientNotFall(page);
    });

    test('Bookmark sorting (CLOUD-T194)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Frame');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Protected');
        await locators.tableHeaderBegins.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Protected');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Frame');

        await locators.tableHeaderEnds.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Protected');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Frame');
        await locators.tableHeaderEnds.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Frame');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Protected');

        await locators.tableHeaderName.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Frame');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Protected');
        await locators.tableHeaderName.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Protected');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Frame');

        await locators.tableHeaderComment.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Frame');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Protected');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Video');
        await locators.tableHeaderComment.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Protected');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Frame');

        await clientNotFall(page);
    });

    test('Bookmark sorting with active checkbox (CLOUD-T213)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Frame');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Protected');
        await locators.bookmark.nth(0).click();
        expect(await locators.bookmarkCheckbox.nth(0).isChecked()).toBeTruthy();
        await locators.tableHeaderBegins.click();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Protected');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Frame');
        expect(await locators.bookmarkCheckbox.nth(2).isChecked()).toBeTruthy();

        await locators.bookmarkCheckbox.nth(1).check();
        expect(await locators.bookmarkCheckbox.nth(1).isChecked()).toBeTruthy();
        expect(await locators.bookmarkCheckbox.nth(2).isChecked()).toBeTruthy();
        await locators.tableHeaderEnds.dblclick();
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Bookmark Frame');
        await expect(locators.bookmarkComment.nth(1)).toHaveText('Bookmark Video');
        await expect(locators.bookmarkComment.nth(2)).toHaveText('Bookmark Protected');
        expect(await locators.bookmarkCheckbox.nth(0).isChecked()).toBeTruthy();
        expect(await locators.bookmarkCheckbox.nth(1).isChecked()).toBeTruthy();

        await clientNotFall(page);
    });

    test('Transition into archive bookmark (CLOUD-T195)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        let bookmarkStartTime = (await locators.bookmarkBegin.nth(0).innerText()).slice(0, 8);
        await locators.bookmarkVideo.nth(0).click();
        await expect(locators.cellImageInFrame).toBeVisible();
        await expect(locators.lastIntervalInFrame).toBeVisible();
        await page.waitForTimeout(3000);
        let pointerTime = await locators.pointerTimeInFrame.innerText();
        isTimeEquals(bookmarkStartTime, pointerTime, 1);
        let cameraTime = await locators.cellTimerInFrame.innerText();
        isTimeEquals(pointerTime, cameraTime, 1);
        await locators.playButtonInFrame.click();
        await locators.frameVideoElement.waitFor({ state: 'attached' });
        await page.waitForTimeout(5000);
        let lastPointerTime = await locators.pointerTimeInFrame.innerText();
        await comparePointerPositions(pointerTime, lastPointerTime);
        await locators.backToBookmarksButton.click();

        bookmarkStartTime = (await locators.bookmarkBegin.nth(1).innerText()).slice(0, 8);
        await locators.bookmarkVideo.nth(1).click();
        await expect(locators.cellImageInFrame).toBeVisible();
        await expect(locators.lastIntervalInFrame).toBeVisible();
        await page.waitForTimeout(3000);
        pointerTime = await locators.pointerTimeInFrame.innerText();
        isTimeEquals(bookmarkStartTime, pointerTime, 1);
        cameraTime = await locators.cellTimerInFrame.innerText();
        isTimeEquals(pointerTime, cameraTime, 1);
        await locators.playButtonInFrame.click();
        await locators.frameVideoElement.waitFor({ state: 'attached' });
        await page.waitForTimeout(5000);
        lastPointerTime = await locators.pointerTimeInFrame.innerText();
        await comparePointerPositions(pointerTime, lastPointerTime);
        await locators.backToBookmarksButton.click();

        bookmarkStartTime = (await locators.bookmarkBegin.nth(2).innerText()).slice(0, 8);
        await locators.bookmarkVideo.nth(2).click();
        await expect(locators.cellImageInFrame).toBeVisible();
        await expect(locators.lastIntervalInFrame).toBeVisible();
        await page.waitForTimeout(3000);
        pointerTime = await locators.pointerTimeInFrame.innerText();
        isTimeEquals(bookmarkStartTime, pointerTime, 1);
        cameraTime = await locators.cellTimerInFrame.innerText();
        isTimeEquals(pointerTime, cameraTime, 1);
        await locators.playButtonInFrame.click();
        await locators.frameVideoElement.waitFor({ state: 'attached' });
        await page.waitForTimeout(5000);
        await locators.playButtonInFrame.click();
        await locators.frameVideoElement.waitFor({ state: 'detached' });
        lastPointerTime = await locators.pointerTimeInFrame.innerText();
        await comparePointerPositions(pointerTime, lastPointerTime);
        await locators.backToBookmarksButton.click();

        await clientNotFall(page);
    });

    test('Exchange bookmark time to invalid value (CLOUD-T196)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        const secondCameraIntervals = transformISOtime(await getArchiveIntervals("Black", Configuration.cameras[1], "future", "past"));
        await locators.bookmark.nth(1).click();
        await locators.editBookmarkButton.click();
        await locators.windowBeginsAt.waitFor({ state: 'attached' });
        const beginTime = await locators.windowBeginsAt.inputValue();
        const endTime = await locators.windowEndsAt.inputValue();
        const currentDate = beginTime.slice(9, 19);
        await locators.windowBeginsAt.fill(`${secondCameraIntervals[0].end.hours}:${secondCameraIntervals[0].end.minutes}:${secondCameraIntervals[0].end.seconds} ${currentDate}`);
        await expect(locators.windowErrorMessage).toBeVisible();
        await expect(locators.windowErrorMessage).toContainText('Start date cannot be later than end date');
        await expect(locators.windowErrorMessage).toHaveCSS("color", "rgb(244, 67, 54)");
        await expect(locators.windowSave).toBeDisabled();
        await locators.windowBeginsAt.fill(beginTime);
        await expect(locators.windowErrorMessage).toBeHidden();
        await expect(locators.windowSave).toBeEnabled();

        let hours = secondCameraIntervals[0].begin.minutes < 10 ? secondCameraIntervals[0].begin.hours - 1 : secondCameraIntervals[0].begin.hours;
        let minutes = (secondCameraIntervals[0].begin.minutes - 10) < 0 ? (secondCameraIntervals[0].begin.minutes - 10) + 60 : secondCameraIntervals[0].begin.minutes - 10;
        let seconds = secondCameraIntervals[0].begin.seconds;
        await locators.windowBeginsAt.fill(`${hours}:${minutes}:${seconds} ${currentDate}`);
        await expect(locators.windowErrorMessage).toBeVisible();
        await expect(locators.windowErrorMessage).toContainText('Date should be after');
        await expect(locators.windowErrorMessage).toHaveCSS("color", "rgb(244, 67, 54)");
        await expect(locators.windowSave).toBeDisabled();
        await locators.windowBeginsAt.fill(beginTime);
        await expect(locators.windowErrorMessage).toBeHidden();
        await expect(locators.windowSave).toBeEnabled();

        hours = secondCameraIntervals[0].end.minutes > 49 ? secondCameraIntervals[0].end.hours + 1 : secondCameraIntervals[0].end.hours;
        minutes = (secondCameraIntervals[0].end.minutes + 10) > 59 ? (secondCameraIntervals[0].end.minutes + 10) - 60 : secondCameraIntervals[0].end.minutes + 10;
        seconds = secondCameraIntervals[0].end.seconds;
        await locators.windowEndsAt.fill(`${hours}:${minutes}:${seconds} ${currentDate}`);
        await expect(locators.windowErrorMessage).toBeVisible();
        await expect(locators.windowErrorMessage).toContainText('Date should be before');
        await expect(locators.windowErrorMessage).toHaveCSS("color", "rgb(244, 67, 54)");
        await expect(locators.windowSave).toBeDisabled();

        await locators.windowCancel.click();
        await page.waitForTimeout(3000);
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmarkBegin.nth(1)).toHaveText(beginTime);
        await expect(locators.bookmarkEnd.nth(1)).toHaveText(endTime);

        await clientNotFall(page);
    });

    test('Exchange bookmark time to valid value (CLOUD-T197)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        const secondCameraIntervals = transformISOtime(await getArchiveIntervals("Black", Configuration.cameras[2], "future", "past"));
        await locators.bookmark.nth(2).click();
        await locators.editBookmarkButton.click();
        await locators.windowBeginsAt.waitFor({ state: 'attached' });
        const currentDate = (await locators.windowBeginsAt.inputValue()).slice(9, 19);

        let hours = secondCameraIntervals[0].begin.hours;
        let minutes = secondCameraIntervals[0].begin.seconds > 54 ? secondCameraIntervals[0].begin.minutes + 1 : secondCameraIntervals[0].begin.minutes;
        let seconds = (secondCameraIntervals[0].begin.seconds + 5) > 59 ? (secondCameraIntervals[0].begin.seconds + 5) - 60 : secondCameraIntervals[0].begin.seconds + 5;
        await locators.windowBeginsAt.fill(`${hours}:${minutes}:${seconds} ${currentDate}`);

        hours = secondCameraIntervals[0].begin.hours;
        minutes = secondCameraIntervals[0].begin.seconds > 49 ? secondCameraIntervals[0].begin.minutes + 1 : secondCameraIntervals[0].begin.minutes;
        seconds = (secondCameraIntervals[0].begin.seconds + 10) > 59 ? (secondCameraIntervals[0].begin.seconds + 10) - 60 : secondCameraIntervals[0].begin.seconds + 10;
        await locators.windowEndsAt.fill(`${hours}:${minutes}:${seconds} ${currentDate}`);
        const beginTimeNew = await locators.windowBeginsAt.inputValue();
        const endTimeNew = await locators.windowEndsAt.inputValue();

        await locators.windowSave.click();
        await page.waitForTimeout(3000);
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmarkBegin.nth(2)).toHaveText(beginTimeNew);
        await expect(locators.bookmarkEnd.nth(2)).toHaveText(endTimeNew);

        await clientNotFall(page);
    });

    test('Setting empty bookmark comment (CLOUD-T866)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        await locators.bookmark.nth(0).click();
        await locators.editBookmarkButton.click();
        await locators.windowComment.fill("");
        await expect(locators.windowErrorMessage).toBeVisible();
        await expect(locators.windowErrorMessage).toContainText('The comment cannot be empty');
        await expect(locators.windowErrorMessage).toHaveCSS("color", "rgb(244, 67, 54)");
        await expect(locators.windowSave).toBeDisabled();

        await clientNotFall(page);
    });

    test('Back to live mode (CLOUD-T212)', async ({ page }) => {
        const locators = new Locators(page);

        await layoutAnnihilator('all');
        await locators.backToLiveButton.click();
        await expect(locators.videoElement).toHaveCount(2);  // так как для каждого элемента раскладки есть теперь два элемента с --VideoCell --playing пришлось удвоить количество элементов 
        await createLayout(Configuration.cameras, 2, 1, "Bookmark Layout");
        await page.reload();
        await expect(locators.videoElement).toHaveCount(4); // по аналогии с предыдущем комментарием
        await locators.topMenuButton.click();
        await locators.bookmarkMode.click();
        await expect(locators.bookmark).toHaveCount(3);
        await locators.backToLiveButton.click();
        await expect(locators.videoElement).toHaveCount(4);

        await clientNotFall(page);
    });

    test('Access to record deleting (CLOUD-T502)', async ({ page }) => {
        test.skip(isCloudTest, "Test is skipped for cloud");

        const locators = new Locators(page);
        const recordDeletingForbid = { feature_access: alloyAllPermisions.feature_access.filter(permission => permission != "FEATURE_ACCESS_ALLOW_DELETE_RECORDS") };
        const roleName = "Bookmarks";
        const testUserLogin = "book_test";
        const testUserPassword = "Book1234";

        await roleAnnihilator('all');
        await userAnnihilator('all');
        await createRole(roleName);
        await setRolePermissions(roleName);
        await createUser(testUserLogin);
        await assignUserRole(roleName, testUserLogin);
        await setUserPassword(testUserLogin, testUserPassword);
        await setRolePermissions(roleName, recordDeletingForbid);

        await locators.backToLiveButton.click();
        await logout(page);
        await authorization(page, testUserLogin, testUserPassword);
        await locators.topMenuButton.click();
        await locators.bookmarkMode.click();
        await expect(locators.bookmark).toHaveCount(3);

        await locators.bookmark.nth(1).click();
        await expect(locators.editBookmarkButton).toBeVisible();
        await expect(locators.deleteRecordButton).toBeHidden();
        await expect(locators.deleteOneBookmarkButton).toBeVisible();

        await clientNotFall(page);
    });

    test('Changing bookmark comment (CLOUD-T205)', async ({ page }) => {
        const locators = new Locators(page);
        const testBookmarkName = "Temporary Bookmark 1";
        const startTime = new Date();
        await page.waitForTimeout(5000);
        const endTime = new Date();
        await createBookmark(Configuration.cameras[0].accessPoint, 'Black', timeToISO(startTime), timeToISO(endTime), testBookmarkName);
        await page.waitForTimeout(3000);

        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(4);
        await expect(locators.bookmarkComment.nth(0)).toHaveText(testBookmarkName);
        await locators.bookmark.nth(0).click();
        await locators.editBookmarkButton.click();
        await locators.windowComment.fill(testBookmarkName + " Changed");
        await locators.windowSave.click();
        await page.waitForTimeout(3000);
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmarkComment.nth(0)).toHaveText(testBookmarkName + " Changed");

        await clientNotFall(page);
    });

    test('Removing bookmark protection (CLOUD-T206)', async ({ page }) => {
        const locators = new Locators(page);
        const testBookmarkName = "Temporary Bookmark 2";
        const startTime = new Date();
        await page.waitForTimeout(5000);
        const endTime = new Date();
        await createBookmark(Configuration.cameras[1].accessPoint, 'Black', timeToISO(startTime), timeToISO(endTime), testBookmarkName, true);
        await page.waitForTimeout(3000);

        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(4);
        await expect(locators.bookmarkComment.nth(0)).toHaveText(testBookmarkName);
        expect(await locators.bookmarkProtection.nth(0).isChecked()).toBeTruthy();
        await locators.bookmarkProtection.nth(0).click();
        await page.waitForTimeout(3000);
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmarkComment.nth(0)).toHaveText(testBookmarkName);
        expect(await locators.bookmarkProtection.nth(0).isChecked()).toBeFalsy();

        await clientNotFall(page);
    });

    test('Removing bookmark record (CLOUD-T207)', async ({ page }) => {
        const locators = new Locators(page);
        const testBookmarkName = "Temporary Bookmark 3";
        await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
        await addVirtualVideo(Configuration.cameras, "tracker", "tracker");
        await removeExcessBookmarks(page);
        await createArchiveContext("Black", [Configuration.cameras[3]], true, "High");
        await page.waitForTimeout(3000);
        const startTime = new Date();
        await page.waitForTimeout(10000);
        const endTime = new Date();
        await createBookmark(Configuration.cameras[3].accessPoint, 'Black', timeToISO(startTime), timeToISO(endTime), testBookmarkName);
        await page.waitForTimeout(3000);
        const bookmarkNew = (await getBookmarks()).filter(element => element.comment == "Temporary Bookmark 3");
        
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(4);
        await expect(locators.bookmarkComment.nth(0)).toHaveText(testBookmarkName);
        await locators.bookmark.nth(0).click();
        await locators.deleteRecordButton.click();
        await locators.removeAccept.click();
        await expect(locators.removeAccept).toBeHidden();
        await expect(locators.modalWindowBackground).toBeHidden();
        await page.waitForTimeout(3000);

        const newCameraIntervals = await getArchiveIntervals("Black", Configuration.cameras[3], "future", "past");
        expect(newCameraIntervals.length).toEqual(2);
        expect(newCameraIntervals[0].end).toEqual(bookmarkNew[0].begins_at + '000');
        expect(newCameraIntervals[1].begin).toEqual(bookmarkNew[0].ends_at + '000');

        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(4);
        const bookmarkEndTime = (await locators.bookmarkEnd.nth(0).innerText()).slice(0, 8);
        await locators.bookmarkVideo.nth(0).click();
        await expect(locators.cellImageInFrame).toBeVisible();
        const pointerTime = await locators.pointerTimeInFrame.innerText();
        isTimeEquals(bookmarkEndTime, pointerTime, 1);

        await clientNotFall(page);
    });

    test('Cancel removing bookmark record (CLOUD-T1014)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        await locators.bookmark.nth(1).click();
        await locators.deleteRecordButton.click();

        page.on("request", request => {
            if (request.url().includes(`bookmarks`)) {
                expect(false, "Bookmark request was sent").toBeTruthy();
            }
        });

        await locators.removeReject.click();
        await expect(locators.removeReject).toBeHidden();
        await expect(locators.modalWindowBackground).toBeHidden();
        await page.waitForTimeout(3000);

        await clientNotFall(page);
    });

    test('Removing camera with bookmarks (CLOUD-T210)', async ({ page }) => {
        const locators = new Locators(page);
        if (Configuration.cameras.length < 4) {
            await createCamera(1, virtualVendor, "Virtual several streams", "admin123", "admin", "0.0.0.0", "80", "", "Camera", -1);
            await addVirtualVideo([Configuration.cameras[3]], "tracker", "tracker");
            await removeExcessBookmarks(page);
            await createArchiveContext("Black", [Configuration.cameras[3]], true, "High");
        }
        await page.waitForTimeout(3000);
        const startTime = new Date();
        await page.waitForTimeout(5000);
        const endTime = new Date();
        await createBookmark(Configuration.cameras[3].accessPoint, 'Black', timeToISO(startTime), timeToISO(endTime), "Temp 1");
        await createBookmark(Configuration.cameras[3].accessPoint, 'Black', timeToISO(endTime), timeToISO(endTime), "Temp 2");
        await page.waitForTimeout(3000);
        const newBookmarks = (await getBookmarks()).filter(item => item.comment.includes("Temp"));
        console.log(newBookmarks);

        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect.soft(locators.bookmark).toHaveCount(5);
        await expect.soft(locators.bookmarkComment.nth(0)).toHaveText("Temp 2");
        await cameraAnnihilator([Configuration.cameras[3]]);
        await page.waitForTimeout(3000);
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect.soft(locators.bookmark).toHaveCount(3);
        for (let bookmarkComment of await locators.bookmarkComment.all()) {
           await expect.soft(bookmarkComment).not.toHaveText("Temp 1");
           await expect.soft(bookmarkComment).not.toHaveText("Temp 2");
        }
        await bookmarkAnnihilator(newBookmarks);

        await clientNotFall(page);
    });

    test('Cancel removing bookmark (CLOUD-T1015)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        await locators.bookmark.nth(1).click();
        await locators.deleteOneBookmarkButton.click();
        
        page.on("request", request => {
            if (request.url().includes(`bookmarks`)) {
                expect(false, "Bookmark request was sent").toBeTruthy();
            }
        });

        await locators.removeReject.click();
        await expect(locators.removeAccept).toBeHidden();
        await expect(locators.modalWindowBackground).toBeHidden();
        await expect(locators.bookmark).toHaveCount(3);
        await page.waitForTimeout(3000);
        await locators.bookmarkCheckbox.nth(0).check();
        await locators.bookmarkCheckbox.nth(2).check();
        await locators.deleteBookmarksButton.click();
        await locators.removeReject.click();
        await page.waitForTimeout(3000);

        await clientNotFall(page);
    });

    test('Removing bookmark (CLOUD-T211)', async ({ page }) => {
        const locators = new Locators(page);

        await expect(locators.bookmark).toHaveCount(3);
        await locators.bookmark.nth(1).click();
        await locators.deleteOneBookmarkButton.click();
        await locators.removeAccept.click();
        await expect(locators.removeAccept).toBeHidden();
        await expect(locators.modalWindowBackground).toBeHidden();
        await page.waitForTimeout(3000);
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(2);
        for (let bookmarkComment of await locators.bookmarkComment.all()) {
            await expect(bookmarkComment).not.toHaveText("Bookmark Video");
        }
        await locators.bookmarkCheckbox.nth(0).check();
        await locators.bookmarkCheckbox.nth(1).check();
        await locators.deleteBookmarksButton.click();
        await locators.removeAccept.click();
        await page.waitForTimeout(3000);
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(0);
        await expect(locators.editBookmarkButton).toBeHidden();
        await expect(locators.deleteRecordButton).toBeHidden();
        await expect(locators.deleteOneBookmarkButton).toBeHidden();

        await clientNotFall(page);
    });

    test('Bookmarks not created (CLOUD-T188)', async ({ page }) => {
        const locators = new Locators(page);

        const deleteBookmarks = await getBookmarks();
        await bookmarkAnnihilator(deleteBookmarks);
        await page.waitForTimeout(3000);

        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(0);
        await expect(locators.editBookmarkButton).toBeHidden();
        await expect(locators.deleteRecordButton).toBeHidden();
        await expect(locators.deleteOneBookmarkButton).toBeHidden();

        await clientNotFall(page);
    });

    test('Bookmarks creating by alert (CLOUD-T975)', async ({ page }) => {
        const locators = new Locators(page);
        const alertLocators = new Locators(page);

        const deleteBookmarks = await getBookmarks();
        await bookmarkAnnihilator(deleteBookmarks);
        await page.waitForTimeout(3000);

        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(0);
        await locators.backToLiveButton.click();

        await alertLocators.alertReviewIcon.nth(0).click();
        await expect(alertLocators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);
        await alertLocators.alertPanelButton.click();
        await expect(alertLocators.alertContainer).toHaveCount(1);
        let alertTime = await alertLocators.alertContainer.nth(0).locator('p').last().innerHTML();
        await alertLocators.alertPanelButton.click();
        await alertLocators.alertReviewIcon.nth(0).click();
        await expect(alertLocators.alertGroupReviewIcon.locator('button')).toHaveCount(3);   //сменил локатор alertReviewIcon
        await alertLocators.alertGroupReviewIcon.locator('button').nth(1).click();           //сменил локатор alertReviewIcon
        await alertLocators.modalWindowTextArea.fill('Alert Bookmark 1');
        await alertLocators.modalWindowAcceptButton.click();
        await expect(alertLocators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);
        await page.waitForTimeout(3000);
        await locators.topMenuButton.click();
        await locators.bookmarkMode.click();
        await expect(locators.bookmark).toHaveCount(1);
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Alert Bookmark 1');
        let bookmarkStartTime = (await locators.bookmarkBegin.nth(0).innerText()).slice(0, 8);
        isTimeEquals(alertTime, bookmarkStartTime, 1);

        await locators.backToLiveButton.click();
        await alertLocators.alertReviewIcon.nth(0).click();
        await expect(alertLocators.videoElement.nth(0)).toHaveClass(/.*VideoCell--alert.*/);    //Поменял локатор videoCell
        await alertLocators.alertPanelButton.click();
        await expect(alertLocators.alertContainer).toHaveCount(1);
        alertTime = await alertLocators.alertContainer.nth(0).locator('p').last().innerHTML();
        await alertLocators.alertPanelButton.click();
        await alertLocators.alertReviewIcon.nth(0).click();
        await expect(alertLocators.alertGroupReviewIcon.locator('button')).toHaveCount(3);   //Поменял локатор alertReviewIcon
        await alertLocators.alertGroupReviewIcon.locator('button').nth(1).click();
        await alertLocators.modalWindowTextArea.fill('Alert Bookmark 2');
        await alertLocators.modalWindowAcceptButton.click();
        await expect(alertLocators.videoCell.nth(0)).not.toHaveClass(/.*VideoCell--alert.*/);
        await page.waitForTimeout(3000);
        await locators.topMenuButton.click();
        await locators.bookmarkMode.click();
        await expect(locators.bookmark).toHaveCount(2);
        await expect(locators.bookmarkComment.nth(0)).toHaveText('Alert Bookmark 2');
        bookmarkStartTime = (await locators.bookmarkBegin.nth(0).innerText()).slice(0, 8);
        isTimeEquals(alertTime, bookmarkStartTime, 1);

        await clientNotFall(page);
    });

    test('Bookmark intervals check (CLOUD-T500)', async ({ page }) => {
        const locators = new Locators(page);
        const deleteBookmarks = await getBookmarks();
        await bookmarkAnnihilator(deleteBookmarks);

        await createArchive("White");
        await createArchiveVolume("White", 1);
        await createArchiveContext("White", [Configuration.cameras[0]], true, "High");
        await page.waitForTimeout(3000);
        const startTime = new Date();
        await page.waitForTimeout(10000);
        const endTime = new Date();
        await createBookmark(Configuration.cameras[0].accessPoint, 'Black', timeToISO(startTime), timeToISO(endTime), 'Black');
        await createBookmark(Configuration.cameras[0].accessPoint, 'White', timeToISO(startTime), timeToISO(endTime), 'White');
        await page.waitForTimeout(3000);
        
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(2);
        const firstBookmarkArchive = await locators.bookmarkComment.nth(0).innerText();
        const secondBookmarkArchive = await locators.bookmarkComment.nth(1).innerText();

        await locators.bookmark.nth(0).click();
        let responsePromise = page.waitForResponse(request => request.url().includes(`MultimediaStorage.${firstBookmarkArchive}/MultimediaStorage&limit=1&scale=31536000`));
        await locators.editBookmarkButton.click();
        await responsePromise;
        await expect(locators.windowSave).toBeEnabled();
        await locators.windowCancel.click();

        await locators.bookmark.nth(1).click();
        responsePromise = page.waitForResponse(request => request.url().includes(`MultimediaStorage.${secondBookmarkArchive}/MultimediaStorage&limit=1&scale=31536000`));
        await locators.editBookmarkButton.click();
        await responsePromise;
        await expect(locators.windowSave).toBeEnabled();
        await locators.windowCancel.click();

        await clientNotFall(page);
    });

    test('Transition into different archives by bookmark (CLOUD-T501)', async ({ page }) => {
        const locators = new Locators(page);
        const deleteBookmarks = await getBookmarks();
        await bookmarkAnnihilator(deleteBookmarks);

        if (Configuration.archives.length < 2) {
            await createArchive("White");
            await createArchiveVolume("White", 1);
            await createArchiveContext("White", [Configuration.cameras[0]], true, "High");
        }
        await page.waitForTimeout(3000);
        const firstBookmarkStartTime = new Date();
        await page.waitForTimeout(5000);
        const firstBookmarkEndTime = new Date();
        await page.waitForTimeout(5000);
        const secondBookmarkEndTime = new Date();
        await createBookmark(Configuration.cameras[0].accessPoint, 'Black', timeToISO(firstBookmarkStartTime), timeToISO(firstBookmarkEndTime), 'Black');
        await createBookmark(Configuration.cameras[0].accessPoint, 'White', timeToISO(firstBookmarkEndTime), timeToISO(secondBookmarkEndTime), 'White');
        await page.waitForTimeout(3000);
        
        await page.reload();
        await goToBookmarkModeIfNeeded(page);
        await expect(locators.bookmark).toHaveCount(2);
        const firstBookmarkArchive = await locators.bookmarkComment.nth(0).innerText();
        const secondBookmarkArchive = await locators.bookmarkComment.nth(1).innerText();

        let bookmarkStartTime = (await locators.bookmarkBegin.nth(0).innerText()).slice(0, 8);
        let responsePromise = page.waitForResponse(request => request.url().includes(`MultimediaStorage.${firstBookmarkArchive}/MultimediaStorage&limit=10&scale=31536000`));
        await locators.bookmarkVideo.nth(0).click();
        await responsePromise;
        await expect(locators.cellImageInFrame).toBeVisible();
        await expect(locators.cellArchiveMenuInFrame).toHaveText(`${firstBookmarkArchive}`);
        await expect(locators.lastIntervalInFrame).toBeVisible();
        let pointerTime = await locators.pointerTimeInFrame.innerText();
        isTimeEquals(bookmarkStartTime, pointerTime, 1);
        await locators.playButtonInFrame.click();
        await locators.frameVideoElement.waitFor({ state: 'attached' });
        await page.waitForTimeout(5000);
        let lastPointerTime = await locators.pointerTimeInFrame.innerText();
        await comparePointerPositions(pointerTime, lastPointerTime);
        await locators.backToBookmarksButton.click();

        bookmarkStartTime = (await locators.bookmarkBegin.nth(1).innerText()).slice(0, 8);
        responsePromise = page.waitForResponse(request => request.url().includes(`MultimediaStorage.${secondBookmarkArchive}/MultimediaStorage&limit=10&scale=31536000`));
        await locators.bookmarkVideo.nth(1).click();
        await responsePromise;
        await expect(locators.cellImageInFrame).toBeVisible();
        await expect(locators.cellArchiveMenuInFrame).toHaveText(`${secondBookmarkArchive}`);
        await expect(locators.lastIntervalInFrame).toBeVisible();
        pointerTime = await locators.pointerTimeInFrame.innerText();
        isTimeEquals(bookmarkStartTime, pointerTime, 1);
        await locators.playButtonInFrame.click();
        await locators.frameVideoElement.waitFor({ state: 'attached' });
        await page.waitForTimeout(5000);
        lastPointerTime = await locators.pointerTimeInFrame.innerText();
        await comparePointerPositions(pointerTime, lastPointerTime);
        await locators.playButtonInFrame.click();
        await locators.frameVideoElement.waitFor({ state: 'detached' });
        await locators.backToBookmarksButton.click();

        await clientNotFall(page);
    });

});


async function removeExcessBookmarks(page: Page) {
    const deleteBookmarks = await getBookmarks();
    if (deleteBookmarks.length > 3) {
        await bookmarkAnnihilator(deleteBookmarks.filter(element => !(['Bookmark Protected', 'Bookmark Video', 'Bookmark Frame'].includes(element.comment))));
        await page.waitForTimeout(3000);
    }
}