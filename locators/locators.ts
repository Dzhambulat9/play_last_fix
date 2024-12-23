import { test, expect, type WebSocket, type Page, Locator, FrameLocator, Frame} from '@playwright/test';
import { isCloudTest } from '../global_variables';



export class Locators {
    webpage: Page | FrameLocator;

    // Header locators
    readonly liveMode: Locator;
    readonly singleArchiveMode: Locator;
    readonly multiArchiveMode: Locator;
    readonly searchMode: Locator;
    readonly topMenuButton: Locator;
    readonly preferences: Locator;
    readonly search: Locator;
    readonly groupList: Locator;
    readonly changeUser: Locator;
    readonly changePassword: Locator;
    readonly layoutMenu: Locator;
    readonly x1Layout: Locator;
    readonly x4Layout: Locator;
    readonly x9Layout: Locator;
    readonly x16Layout: Locator;
    readonly firstLayout: Locator;
    readonly secondLayout: Locator;
    readonly thirdLayout: Locator;
    readonly fourthLayout: Locator;
    readonly fifthLayout: Locator;
    readonly expandLayoutList: Locator;
    readonly layoutItems: Locator;
    readonly layoutItemsList: Locator;
    readonly nextLogo: Locator;

    // Video cell locators
    readonly cellTitle: Locator;
    readonly cellTimer: Locator;
    readonly cellInfoContainer: Locator;
    readonly cellContainerSVG: Locator;
    readonly canvasElement: Locator;
    readonly cellImage: Locator;
    readonly videoCellWrapper: Locator;
    readonly gridcell: Locator;
    readonly videoCell: Locator;
    readonly videoCellDebug: Locator;
    readonly videoCellMicro: Locator;
    readonly videoCellExport: Locator;
    readonly videoElement: Locator;
    readonly cellArchiveMenu: Locator;
    readonly cellStreamMenu: Locator;
    readonly streamsList: Locator;
    readonly cellPointerSetterHours: Locator;
    readonly cellPointerSetterMinutes: Locator;
    readonly cellPointerSetterSeconds: Locator;
    readonly alertReviewIcon: Locator;
    readonly alertGroupReviewIcon: Locator; // Добавил
    readonly alertNotificationsBtn: Locator; // Добавил 
    readonly alertNotificationImportantBtn: Locator; // Добавил 
    readonly alertNotificationsOffBtn: Locator; // Добавил 
    readonly playerTimestamps: Locator;
    readonly playerPointer: Locator;
    readonly playerAlerts: Locator;
    readonly highStream: Locator;
    readonly autoStream: Locator;
    readonly lowStream: Locator;
    readonly secondsDecrease: Locator;
    readonly secondsIncrease: Locator;
    readonly videoCellBox: Locator
    readonly fastSearchButton: Locator;
    readonly fastSearchCanvas: Locator;
    readonly fastSearchProceedButton: Locator;
    readonly nextIntervalButtonInVideocell: Locator;
    readonly previousIntervalButtonInVideocell: Locator;
    readonly noSignalBanner: Locator;
    readonly videoCellIcons: Locator;
    readonly videoCellSoundBar: Locator;
    readonly cellArchive: Locator;
    readonly cellArchiveIntervals: Locator;

    // Camera list panel locators
    readonly cameraPanel: Locator;
    readonly cameraPanelButton: Locator;
    readonly cameraListItem: Locator;
    readonly cameraPanelDragline: Locator;
    readonly cameraListInnerSpace: Locator;
    readonly cameraCheckBox: Locator;
    readonly sortByIdButton: Locator;
    readonly sortByNameButton: Locator;
    readonly sortByFavoriteButton: Locator;
    readonly importCamerasListButton: Locator;
    readonly progressbar: Locator;
    readonly snapshotPreview: Locator;

    // PTZ panel locators
    readonly telemetryPanel: Locator;
    readonly telemetryPanelButton: Locator;
    readonly telemetryPanelLeftButton: Locator;
    readonly telemetryPanelTopButton: Locator;
    readonly telemetryPanelRightButton: Locator;
    readonly telemetryPanelBottomButton: Locator;
    readonly telemetryPanelTopLeftButton: Locator;
    readonly telemetryPanelTopRightButton: Locator;
    readonly telemetryPanelBottomRightButton: Locator;
    readonly telemetryPanelBottomLeftButton: Locator;
    readonly telemetrySliderMark: Locator;
    readonly telemetryZoomIn: Locator;
    readonly telemetryZoomOut: Locator;
    readonly telemetryPreset: Locator;

    // Common locators
    readonly popUpMessage: Locator;
    readonly externalBackground: Locator;
    readonly dialogBackground: Locator;
    readonly body: Locator;
    readonly rightSidePanel: Locator;
    
    // Archive panel locators
    readonly archiveBlock: Locator;
    readonly archivePanelButton: Locator;
    readonly archiveBlockScaleBox: Locator;
    readonly archiveBlockDataBar: Locator;
    readonly archivePointer: Locator;
    readonly archiveIntervals: Locator;
    readonly lastInterval: Locator;
    readonly pointerTime: Locator;
    readonly playButton: Locator;
    readonly x1Speed: Locator;
    readonly x2Speed: Locator;
    readonly x4Speed: Locator;
    readonly x1SpeedReversed: Locator;
    readonly x2SpeedReversed: Locator;
    readonly x4SpeedReversed: Locator;
    readonly speedSlider: Locator;
    readonly speedNotch: Locator;
    readonly nextFrameButton: Locator;
    readonly prevFrameButton: Locator;
    readonly nextIntervalButton: Locator;
    readonly prevIntervalButton: Locator;
    readonly alertFlag: Locator;
    readonly alertInfoCard: Locator;
    readonly intervalStartButton: Locator;
    readonly intervalEndButton: Locator;
    readonly cancelIntervalButton: Locator;
    readonly scaleExportMenuButton: Locator;
    readonly archiveTimestamps: Locator;
    readonly exportInterval: Locator;
    readonly exportLengthBlock: Locator;
    readonly archivePointerTab: Locator;
    readonly eventsOnArchive: Locator;
    readonly eventMark: Locator;
    readonly archiveScaleTextAnchors: Locator;
    readonly archiveBlockDateSelector: Locator;

    // Alert panel locators
    readonly alertPanelButton: Locator;
    readonly alertContainer: Locator;
    readonly alertPanel: Locator;
    readonly alertPanelDragline: Locator;
    readonly alertEmptyPreviewStub: Locator;

    // Alert handle modal window locators
    readonly modalWindow: Locator;
    readonly modalWindowTextArea: Locator;
    readonly modalWindowAcceptButton: Locator;
    readonly modalWindowRejectButton: Locator;

    // Client preferences menu locators
    readonly openCameraOnLayoutPreference: Locator;
    readonly showOnlyLiveCamerasPreference: Locator;
    readonly manuallyOpenAndClosePreference: Locator;
    readonly showDeviceIDsPreference: Locator;
    readonly showAllFramesPreference: Locator;
    readonly showMarkerNames: Locator;
    readonly scrollResultToCenterPreference: Locator;
    readonly keepAspectRatio: Locator;
    readonly preferencesAccept: Locator;

    // Authorization & password change form locators
    readonly authorizationForm: Locator;
    readonly loginField: Locator;
    readonly passwordField: Locator;
    readonly logInButton: Locator;
    readonly errorMessage: Locator;
    readonly newPassword: Locator;
    readonly newPasswordConfirm: Locator;
    readonly cancelPasswordChange: Locator;
    readonly acceptPasswordChange: Locator;
    readonly passwordEye: Locator;
    readonly passwordChangeErrorMessage: Locator;
    readonly dialogProgressbar: Locator;
    readonly splash: Locator;

    // Layout edit mode locators
    readonly saveChangesButton: Locator;
    readonly cancelChangesButton: Locator;
    readonly leftIncrease: Locator;
    readonly leftDecrease: Locator;
    readonly topIncrease: Locator;
    readonly topDecrease: Locator;
    readonly rightIncrease: Locator;
    readonly rightDecrease: Locator;
    readonly bottomIncrease: Locator;
    readonly bottomDecrease: Locator;
    readonly expandLayoutButton: Locator;
    readonly layoutField: Locator;
    readonly cleanUpButton: Locator;
    readonly undoButton: Locator;
    readonly redoButton: Locator;
    readonly streamCounter: Locator;
    readonly allStreamsChanger: Locator;
    readonly streamGroup: Locator;

    // Layout menu locators
    readonly layoutMenuItem: Locator;
    readonly menuUseByDefault: Locator;
    readonly menuNotUseByDefault: Locator;
    readonly menuCopyLayout: Locator;
    readonly menuEditLayout: Locator;
    readonly menuDeleteOrReorder: Locator;
    readonly menuShareLayout: Locator;

    // Export menu locators
    readonly formatPicker: Locator;
    readonly localExportButton: Locator;
    readonly commentField: Locator;
    readonly optionAVI: Locator;
    readonly optionEXE: Locator;
    readonly optionMKV: Locator;
    readonly optionMP4: Locator;
    readonly optionJPG: Locator;
    readonly compressionPicker: Locator;
    readonly optionLow: Locator;
    readonly optionMedium: Locator;
    readonly optionHigh: Locator;
    readonly exportWindowCancelButton: Locator;
    readonly exportDatePickerButton: Locator;
    readonly exportDatePickerHours: Locator;
    readonly exportDatePickerMinutes: Locator;
    readonly exportDatePickerSeconds: Locator;
    readonly exportDatePickerSaveButton: Locator;
    readonly exportDatePickerCancelButton: Locator;
    readonly exportStartInput: Locator;
    readonly exportEndInput: Locator;

    // Export panel progress locators
    readonly exportFile: Locator;
    readonly exportName: Locator;
    readonly exportProgress: Locator;

    // Datepicker menu locators
    readonly datePickerMenu: Locator;
    readonly dateTab: Locator;
    readonly timeTab: Locator;
    readonly acceptButtonInDatapicker: Locator;
    readonly cancelButtonInDatapicker: Locator;
    readonly datesTable: Locator;
    readonly previousMonthSwitcher: Locator;
    readonly nextMonthSwitcher: Locator;
    readonly previousTimeBlockSwitcher: Locator;
    readonly nextTimeBlockSwitcher: Locator;
    readonly hoursBlock: Locator;
    readonly minutesBlock: Locator;
    readonly secondsBlock: Locator;

    // Searching settings field locators
    readonly setSearchType: Locator;
    readonly intervalStartInput: Locator;
    readonly intervalEndInput: Locator;
    readonly intervalStartDatapicker: Locator;
    readonly intervalEndDatapicker: Locator;
    readonly templateTimePicker: Locator;
    readonly eventSearchOption: Locator;
    readonly thumbnailSearchOption: Locator;
    readonly heatmapSearchOption: Locator;
    readonly lineCrossingOption: Locator;
    readonly loiteringOption: Locator;
    readonly multipleObjectOption: Locator;
    readonly moveBetweenZonesOption: Locator;
    readonly motionInAreaOption: Locator;
    readonly faceSearchOption: Locator;
    readonly LPSearchOption: Locator;
    readonly eventTypeInput: Locator;
    readonly initiatorInput: Locator;
    readonly searchButton: Locator;
    readonly LPSearchField: Locator;
    readonly faceSearchField: Locator;
    readonly faceSearchImage: Locator;
    readonly removeSearchFace: Locator;
    readonly faceSimilarityThreshold: Locator;
    readonly faceSortingMenu: Locator;
    readonly sortingOptionSimilarity: Locator;
    readonly sortingOptionTime: Locator;
    readonly objectsCountInput: Locator;
    readonly objectLoiteringDuration: Locator;
    readonly metaDataInput: Locator;
    readonly resizeControl: Locator;
    readonly dividerControl: Locator;
    readonly playerWindowIncrease: Locator;
    readonly playerWindowDecrease: Locator;

    // Searching results field locators
    readonly eventsField: Locator;
    readonly foundEvent: Locator;
    readonly scrolledRows: Locator;
    readonly activeEvent: Locator;
    readonly eventsCounter: Locator;
    readonly noResultBanner: Locator;
    readonly heatmapBackgroundImage: Locator;
    readonly heatmapImage: Locator;
    readonly heatmapOpacityBar: Locator;
    readonly resultSliderDot: Locator;
    readonly resultSliderLeftArrow: Locator;
    readonly resultSliderRightArrow: Locator;
    readonly resultSortingIcon: Locator;

    // Bookmark locators
    readonly bookmarkMode: Locator;
    readonly bookmark: Locator;
    readonly bookmarkCheckbox: Locator;
    readonly bookmarkBegin: Locator;
    readonly bookmarkEnd: Locator;
    readonly bookmarkCreated: Locator;
    readonly bookmarkAuthor: Locator;
    readonly bookmarkProtection: Locator;
    readonly bookmarkCamera: Locator;
    readonly bookmarkComment: Locator;
    readonly bookmarkVideo: Locator;
    readonly tableHeaderBegins: Locator;
    readonly tableHeaderEnds: Locator;
    readonly tableHeaderName: Locator;
    readonly tableHeaderComment: Locator;
    readonly editBookmarkButton: Locator;
    readonly deleteRecordButton: Locator;
    readonly deleteOneBookmarkButton: Locator;
    readonly deleteBookmarksButton: Locator;
    readonly backToLiveButton: Locator;
    readonly backToBookmarksButton: Locator;
    readonly searchField: Locator;
    readonly windowBeginsAt: Locator;
    readonly windowEndsAt: Locator;
    readonly windowComment: Locator;
    readonly windowSave: Locator;
    readonly windowCancel: Locator;
    readonly windowErrorMessage: Locator;
    readonly removeAccept: Locator;
    readonly removeReject: Locator;
    readonly modalWindowBackground: Locator;
    readonly cellTitleInFrame: Locator;
    readonly cellTimerInFrame: Locator;
    readonly cellArchiveMenuInFrame: Locator;
    readonly cellImageInFrame: Locator;
    readonly playButtonInFrame: Locator;
    readonly frameVideoElement: Locator;
    readonly pointerTimeInFrame: Locator;
    readonly lastIntervalInFrame: Locator;

    // Events panel locators
    readonly eventPanelButton: Locator;
    
    // Map panel locators
    readonly mapPanelButton: Locator;
    readonly mapPanelExpandButton: Locator;
    readonly mapPanelCollapseButton: Locator;
    readonly mapBoxCanvas: Locator;
    readonly mapBoxLogo: Locator;
    readonly rightSlider: Locator;
    readonly leftSlider: Locator;
    readonly mapBoxMarker: Locator;
    readonly mapBoxPopup: Locator;
    readonly mapBoxPopupVideo: Locator;
    readonly mapBoxDebugPanel: Locator;
    


    constructor(page: Page) {
        this.webpage = page;
        if (isCloudTest) {
            this.webpage = page.frameLocator('iframe');
        }

        // this.pageBody = page.locator('body');
        // if (isCloudTest) {
        //     this.pageBody = page.frameLocator('iframe').locator('body');
        // }
        
        // Header locators
        this.liveMode = this.webpage.getByTestId('wc_top_panel-live_button');
        this.singleArchiveMode = this.webpage.getByTestId('wc_top_panel-archive_single_camera_button');
        this.multiArchiveMode = this.webpage.getByTestId('wc_top_panel-archive_multi_camera_button');
        this.searchMode = this.webpage.getByTestId('wc_top_panel-search_button');
        this.topMenuButton = this.webpage.locator('#at-top-menu-btn');
        this.preferences = this.webpage.getByRole('menuitem', { name: 'Preferences' });
        this.search = this.webpage.locator('input[type="search"]');
        this.groupList = this.webpage.locator('#at-groups-list');
        this.changeUser = this.webpage.getByRole('menuitem', { name: 'Change user' });
        this.changePassword = this.webpage.locator('[role="menuitem"] button');
        this.layoutMenu = this.webpage.locator('#at-layout-menu');
        this.x1Layout = this.webpage.locator('[title="1\u00D71"]');
        this.x4Layout = this.webpage.locator('[title="2\u00D72"]');
        this.x9Layout = this.webpage.locator('[title="3\u00D73"]');
        this.x16Layout = this.webpage.locator('[title="4\u00D74"]');
        this.firstLayout = this.webpage.locator('#at-layout-item-0');
        this.secondLayout = this.webpage.locator('#at-layout-item-1');
        this.thirdLayout = this.webpage.locator('#at-layout-item-2');
        this.fourthLayout = this.webpage.locator('#at-layout-item-3');
        this.fifthLayout = this.webpage.locator('#at-layout-item-4');
        this.expandLayoutList = this.webpage.locator('#at-layout-expand');
        this.layoutItems = this.webpage.locator('#at-layout-items');
        this.layoutItemsList = this.webpage.locator('#at-layout-items li');
        this.nextLogo = this.webpage.getByTestId('wc_top_panel-logo');

        // Video cell locators
        this.cellTitle = this.webpage.locator('[data-testid="at-camera-title"]');
        this.cellTimer = this.webpage.locator('[data-testid="at-camera-time"]');
        this.cellInfoContainer = this.webpage.locator('.VideoCell__info-container');
        this.cellContainerSVG = this.webpage.locator('.VideoCell__info-container svg');
        this.canvasElement = this.webpage.locator('canvas.VideoCell__video-canvas');
        this.cellImage = this.webpage.locator('[role="gridcell"] img');
        this.videoCellWrapper = this.webpage.getByTestId('wc_layout_cells_panel-cell_item');
        this.gridcell = this.webpage.locator('[role="gridcell"]');
        this.videoCell = this.webpage.locator('.VideoCell__video-canvas');
        this.videoCellDebug = this.webpage.locator('.VideoCell__debug');
        this.videoCellMicro = this.webpage.locator('[title="Microphone"]');
        this.videoCellExport = this.webpage.getByTestId('wc_layout_cells_panel-cell_item_export_button');
        this.videoElement = this.webpage.locator('.VideoCell--playing');
        this.cellArchiveMenu = this.webpage.getByTestId('at-select-camera-archive');
        this.cellStreamMenu = this.webpage.getByTestId('at-select-camera-resolution');
        this.streamsList = this.webpage.locator('[role="menu"]');
        this.cellPointerSetterHours = this.webpage.locator('input[type="text"]').nth(0);
        this.cellPointerSetterMinutes = this.webpage.locator('input[type="text"]').nth(1);
        this.cellPointerSetterSeconds = this.webpage.locator('input[type="text"]').nth(2);
        this.alertReviewIcon = this.webpage.getByTestId('wc_layout_cells_panel-cell_item_alert_button');
        this.alertGroupReviewIcon = this.webpage.locator('[role="group"]');
        this.alertNotificationsBtn = this.webpage.getByTestId('NotificationsIcon'); // Добавил
        this.alertNotificationImportantBtn = this.webpage.getByTestId('NotificationImportantIcon'); // Добавил
        this.alertNotificationsOffBtn = this.webpage.getByTestId('NotificationsOffIcon'); // Добавил
        this.playerTimestamps = this.webpage.locator('.tick');
        this.playerPointer = this.webpage.locator('#timeLine_center');
        this.playerAlerts = this.webpage.locator('.alerts').first();
        this.highStream = this.webpage.locator('[role="menu"] [data-testid="at-camera-resolution-CAMERA_STREAM_RESOLUTION_HIGH"]');
        this.autoStream = this.webpage.locator('[role="menu"] [data-testid="at-camera-resolution-CAMERA_STREAM_RESOLUTION_AUTO"]');
        this.lowStream = this.webpage.locator('[role="menu"] [data-testid="at-camera-resolution-CAMERA_STREAM_RESOLUTION_LOW"]');
        this.secondsDecrease = this.webpage.getByTestId('ForwardIcon').nth(4);
        this.secondsIncrease = this.webpage.getByTestId('ForwardIcon').nth(5);
        this.videoCellBox = this.webpage.locator('.VideoCell__box');
        this.fastSearchButton = this.webpage.getByRole('button', { name: 'Fast search' });
        this.fastSearchCanvas = this.webpage.locator('.VideoCell__box div canvas'); //Поменять локатор
        this.fastSearchProceedButton = this.webpage.locator('canvas ~ div button'); //Поменять локатор
        this.nextIntervalButtonInVideocell = this.webpage.getByTestId('FastForwardIcon').nth(0);
        this.previousIntervalButtonInVideocell = this.webpage.getByTestId('FastRewindIcon').nth(0);
        this.noSignalBanner = page.getByTestId('wc_layout_cells_panel-cell_item_no_signal');
        this.videoCellIcons = page.locator('.VideoCell__front-layer button');
        this.videoCellSoundBar = this.webpage.locator('[title="Microphone"] ~ span');
        this.cellArchive = this.webpage.getByTestId('at-select-camera-archive');
        this.cellArchiveIntervals = this.webpage.locator('[role="gridcell"] .intervals rect');
        
        // Camera list panel locators
        this.cameraPanel = this.webpage.getByTestId('wc_hardware_panel');
        this.cameraPanelButton = this.webpage.getByRole('button', { name: 'Hardware' });
        this.cameraListItem = this.webpage.locator('[data-testid="at-camera-list-item"]');
        this.cameraPanelDragline = this.webpage.locator('[data-testid="wc_hardware_panel"] [role=none]');
        this.cameraListInnerSpace = this.webpage.locator('[data-testid="wc_hardware_panel"]>div');
        this.cameraCheckBox = this.webpage.locator('[data-testid="wc_hardware_panel"] [type="checkbox"]');
        this.sortByIdButton = this.webpage.locator('[data-testid="at-sort-by-id"]');
        this.sortByNameButton = this.webpage.locator('[data-testid="at-sort-by-name"]');
        this.sortByFavoriteButton = this.webpage.locator('[data-testid="at-favorites-checkbox"]');
        this.importCamerasListButton = this.webpage.locator('#import-search-camlist-btn');
        this.progressbar = this.webpage.getByRole('progressbar');
        this.snapshotPreview = this.webpage.getByTestId('at-preview-snapshot');

        // PTZ panel locators
        this.telemetryPanel = this.webpage.getByTestId('wc_ptz_panel');
        this.telemetryPanelButton = this.webpage.getByTestId('wc_ptz_panel-expand_button');
        this.telemetryPanelLeftButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(0);
        this.telemetryPanelTopButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(1);
        this.telemetryPanelRightButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(2);
        this.telemetryPanelBottomButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(3);
        this.telemetryPanelTopLeftButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(4);
        this.telemetryPanelTopRightButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(5);
        this.telemetryPanelBottomRightButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(6);
        this.telemetryPanelBottomLeftButton = this.webpage.getByTestId('wc_ptz_panel').locator('#rose_arrow').nth(7);
        this.telemetrySliderMark = this.webpage.getByTestId('wc_ptz_panel').locator('.MuiSlider-mark');
        this.telemetryZoomIn = this.webpage.getByTestId('wc_ptz_panel').getByRole('button', { name: '+' });
        this.telemetryZoomOut = this.webpage.getByTestId('wc_ptz_panel').getByRole('button', { name: '—' });
        this.telemetryPreset = this.webpage.getByTestId('wc_ptz_panel').locator('h6');

        // Common locators
        this.popUpMessage = this.webpage.locator('.MuiAlert-message');
        this.externalBackground = this.webpage.locator('#menu-');
        this.dialogBackground = this.webpage.locator('.MuiDialog-root');
        this.body = this.webpage.locator('body');
        this.rightSidePanel = this.webpage.getByTestId('wc_side_panel');

        // Archive panel locators
        this.archiveBlock = this.webpage.getByTestId('wc_archive_panel');
        this.archivePanelButton = this.webpage.getByTestId('wc_archive_panel-expand_button');
        this.archiveBlockScaleBox = this.webpage.getByTestId('wc_archive_panel').locator('.scale-box');
        this.archiveBlockDataBar = this.webpage.locator('.data').last();
        this.archivePointer = this.webpage.locator('.control [role="none"] span').first();
        this.archiveIntervals = this.webpage.locator('[data-testid="wc_archive_panel"] .intervals rect');
        this.lastInterval = this.webpage.locator('.intervals').last().locator('rect').last(); //ПОМЕТИТЬ СЕЛЕКТОРАМИ ИНТЕРВАЛЫ АРХИВА СПРАВА
        this.pointerTime = this.webpage.locator('.control [role="none"] span').first();
        this.playButton = this.webpage.locator('#at-archive-control-play-pause');
        this.x1Speed = this.webpage.locator('#at-archive-controls-slider .MuiSlider-markLabel').nth(3);
        this.x2Speed = this.webpage.locator('#at-archive-controls-slider .MuiSlider-markLabel').nth(4);
        this.x4Speed = this.webpage.locator('#at-archive-controls-slider .MuiSlider-markLabel').nth(5);
        this.x1SpeedReversed = this.webpage.locator('#at-archive-controls-slider .MuiSlider-markLabel').nth(2);
        this.x2SpeedReversed = this.webpage.locator('#at-archive-controls-slider .MuiSlider-markLabel').nth(1);
        this.x4SpeedReversed = this.webpage.locator('#at-archive-controls-slider .MuiSlider-markLabel').nth(0);
        this.speedSlider = this.webpage.locator('#at-archive-controls-slider .MuiSlider-thumb');
        this.speedNotch = this.webpage.locator('#at-archive-controls-slider .MuiSlider-mark');
        this.nextFrameButton = this.webpage.locator('#at-archive-control-next-frame');
        this.prevFrameButton = this.webpage.locator('#at-archive-control-prev-frame');
        this.nextIntervalButton = this.webpage.locator('#at-archive-control-next-int');
        this.prevIntervalButton = this.webpage.locator('#at-archive-control-prev-int');
        this.alertFlag = this.webpage.locator('.flag');
        this.alertInfoCard = this.webpage.locator('.alertInfoCard');
        this.intervalStartButton = this.webpage.getByTestId('export-pin_button-begin'); //this.webpage.locator('#periodTop-Normal');
        this.intervalEndButton = this.webpage.getByTestId('export-pin_button-end'); //this.webpage.locator('#periodBottom-Normal');
        this.cancelIntervalButton = this.webpage.locator('#cancel-Normal');
        this.scaleExportMenuButton = this.webpage.getByTestId('timeline-export_export_button');
        this.archiveTimestamps = this.webpage.locator('[data-testid="wc_archive_panel"] .tick');
        this.exportInterval = this.webpage.getByTestId('timeline-export_interval');
        this.exportLengthBlock = this.webpage.getByTestId('export-duration');
        this.archivePointerTab = this.webpage.locator('.control [role="none"]');
        this.eventsOnArchive = this.webpage.locator('.detectors rect');
        this.eventMark = this.webpage.locator('circle[r="5"]');
        this.archiveScaleTextAnchors = this.webpage.locator('[text-anchor="start"]');
        this.archiveBlockDateSelector = this.webpage.getByTitle('Select date');
    
        // Alert panel locators
        this.alertPanelButton = this.webpage.getByRole('button', { name: 'Alarm panel' });
        this.alertContainer = this.webpage.locator('.MuiGrid-direction-xs-column .MuiGrid-item'); //Временный локатор
        this.alertPanel = this.webpage.locator('.MuiGrid-direction-xs-column'); //Временный локатор
        this.alertPanelDragline = this.webpage.locator('.MuiGrid-direction-xs-column [role="none"]'); //Временный локатор
        this.alertEmptyPreviewStub = this.webpage.locator('#noArchive');

        // Alert handle modal window locators
        this.modalWindow = this.webpage.getByRole("dialog");
        this.modalWindowTextArea = this.webpage.getByRole("dialog").locator('textarea').first();
        this.modalWindowAcceptButton = this.webpage.getByRole("dialog").locator('button').first();
        this.modalWindowRejectButton = this.webpage.getByRole("dialog").locator('button').last();

        // Client preferences menu locators
        this.openCameraOnLayoutPreference = this.webpage.getByLabel('Open selected camera on layout');
        this.showOnlyLiveCamerasPreference = this.webpage.getByLabel('Show only live cameras');
        this.manuallyOpenAndClosePreference = this.webpage.getByLabel('Manually open and close');
        this.showDeviceIDsPreference = this.webpage.getByLabel('Show device IDs');
        this.showAllFramesPreference = this.webpage.getByLabel('Show all frames');
        this.showMarkerNames = this.webpage.getByLabel('Show marker names');
        this.scrollResultToCenterPreference = this.webpage.getByLabel('Scroll selected search result to the center');
        this.keepAspectRatio = this.webpage.getByLabel('Keep aspect ratio');
        this.preferencesAccept = this.webpage.getByTestId("wc_preferences_panel-apply_button");

        // Authorization & password change form locators
        this.authorizationForm = this.webpage.getByTestId('wc_load_page-login_panel');
        this.loginField = this.webpage.getByLabel('Login');
        this.passwordField = this.webpage.getByLabel('Password');
        this.logInButton = this.webpage.getByRole('button', { name: 'Log in' });
        this.errorMessage = this.webpage.locator('#password-helper-text');
        this.newPassword = this.webpage.getByLabel('New password');
        this.newPasswordConfirm = this.webpage.getByLabel('Confirm password');
        this.cancelPasswordChange = this.webpage.getByRole('button', { name: 'Cancel' });
        this.acceptPasswordChange = this.webpage.getByRole('button', { name: 'Change' });
        this.passwordEye = this.webpage.locator('[role = "dialog"] button').nth(0);
        this.passwordChangeErrorMessage = this.webpage.locator('[role = "dialog"] p');
        this.dialogProgressbar = this.webpage.getByRole('dialog').getByRole('progressbar');
        this.splash = this.webpage.locator('.splash');

        // Layout edit mode locators
        this.saveChangesButton = this.webpage.getByRole('button', { name: 'Save', exact: true });
        this.cancelChangesButton = this.webpage.getByRole('button', { name: 'Cancel', exact: true });
        this.leftIncrease = page.getByTestId('wc_layout_cells_edge_left_sibling_position').getByTestId('wc_layout_cells_edge_grow');
        this.leftDecrease = page.getByTestId('wc_layout_cells_edge_left_sibling_position').getByTestId('wc_layout_cells_edge_shrink');
        this.topIncrease = page.getByTestId('wc_layout_cells_edge_top_sibling_position').getByTestId('wc_layout_cells_edge_grow');
        this.topDecrease = page.getByTestId('wc_layout_cells_edge_top_sibling_position').getByTestId('wc_layout_cells_edge_shrink');
        this.rightIncrease = page.getByTestId('wc_layout_cells_edge_right_sibling_position').getByTestId('wc_layout_cells_edge_grow');
        this.rightDecrease = page.getByTestId('wc_layout_cells_edge_right_sibling_position').getByTestId('wc_layout_cells_edge_shrink');
        this.bottomIncrease = page.getByTestId('wc_layout_cells_edge_bottom_sibling_position').getByTestId('wc_layout_cells_edge_grow');
        this.bottomDecrease = page.getByTestId('wc_layout_cells_edge_bottom_sibling_position').getByTestId('wc_layout_cells_edge_shrink');
        this.expandLayoutButton = this.webpage.locator('.layout > div:last-child > button');
        this.layoutField = this.webpage.locator('.layout');
        this.cleanUpButton = this.webpage.getByTestId('wc_layout_clean_up_button');
        this.undoButton = this.webpage.getByTestId('wc_layout_return_left_button');
        this.redoButton = this.webpage.getByTestId('wc_layout_return_right_button');
        this.streamCounter = this.webpage.getByTestId('wc_top_panel-save_layout_panel-resolution_cells_count');
        this.allStreamsChanger = this.webpage.getByTestId('wc_top_panel-save_layout_panel-resolutions_block_item');
        this.streamGroup = this.webpage.locator('header [role="group"]');

        // Layout menu locators
        this.layoutMenuItem = this.webpage.getByTestId('wc_layout_menu_item');
        this.menuUseByDefault = this.webpage.getByRole('menuitem', { name: 'Use by default', exact: true });
        this.menuNotUseByDefault = this.webpage.getByRole('menuitem', { name: 'Do not use by default', exact: true });
        this.menuCopyLayout = this.webpage.getByRole('menuitem', { name: 'Copy layout', exact: true });
        this.menuEditLayout = this.webpage.getByRole('menuitem', { name: 'Edit layout', exact: true });
        this.menuDeleteOrReorder = this.webpage.getByRole('menuitem', { name: 'Delete/Reorder layouts', exact: true });
        this.menuShareLayout = this.webpage.getByRole('menuitem', { name: 'Share with', exact: true });

        // Export menu locators
        this.formatPicker = this.webpage.locator('[aria-haspopup="listbox"]').first(); //this.webpage.getByTestId('video_export-format_input');
        this.localExportButton = this.webpage.getByRole('button', { name: 'Local export', exact: true }).last().or(this.webpage.getByRole('button', { name: 'Export', exact: true }).last()); //!!!
        this.commentField = this.webpage.getByTestId('video_export-comment-input');
        this.optionAVI = this.webpage.locator('[data-value="avi"]');
        this.optionEXE = this.webpage.locator('[data-value="exe"]');
        this.optionMKV = this.webpage.locator('[data-value="mkv"]');
        this.optionMP4 = this.webpage.locator('[data-value="mp4"]');
        this.optionJPG = this.webpage.locator('[data-value="jpg"]');
        this.compressionPicker = this.webpage.locator('[aria-haspopup="listbox"]').last(); //this.webpage.getByTestId('video_export-comperssion_input');
        this.optionLow = this.webpage.locator('[data-value="low"]');
        this.optionMedium = this.webpage.locator('[data-value="medium"]');
        this.optionHigh = this.webpage.locator('[data-value="high"]');
        this.exportWindowCancelButton = this.webpage.getByRole('button', { name: 'Cancel', exact: true }).last();
        this.exportDatePickerButton = this.webpage.getByTestId('picker-clock');
        this.exportDatePickerHours = this.webpage.locator('[role=dialog] [type="text"]').nth(0);
        this.exportDatePickerMinutes = this.webpage.locator('[role=dialog] [type="text"]').nth(1);
        this.exportDatePickerSeconds = this.webpage.locator('[role=dialog] [type="text"]').nth(2);
        this.exportDatePickerSaveButton = this.webpage.getByRole('dialog').getByRole('button', { name: 'Save', exact: true });
        this.exportDatePickerCancelButton = this.webpage.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true });
        this.exportStartInput = this.webpage.getByTestId('export_menu-picker_input-begin');
        this.exportEndInput = this.webpage.getByTestId('export_menu-picker_input-end');

        // Export panel progress locators
        this.exportFile = this.webpage.locator('li>button');
        this.exportName = this.webpage.getByTestId('wc_export_proccess_panel-device_name_and_time_label');
        this.exportProgress = this.webpage.getByTestId('wc_export_proccess_panel-progressbar');

        // Datepicker menu locators
        this.datePickerMenu = this.webpage.locator('[role="dialog"]');
        this.dateTab = this.webpage.locator('[aria-label="pick date"]');
        this.timeTab = this.webpage.locator('[aria-label="pick time"]');
        this.acceptButtonInDatapicker = this.webpage.getByRole('button', { name: 'OK' });
        this.cancelButtonInDatapicker = this.webpage.getByRole('button', { name: 'Cancel' });
        this.datesTable = this.webpage.getByRole('rowgroup');
        this.previousMonthSwitcher = this.webpage.getByTitle('Previous month');
        this.nextMonthSwitcher = this.webpage.getByTitle('Next month');
        this.previousTimeBlockSwitcher = this.webpage.getByTitle('open previous view');
        this.nextTimeBlockSwitcher = this.webpage.getByTitle('open next view');
        this.hoursBlock = this.webpage.locator('.MuiPickersToolbar-content button[tabindex="0"]').nth(0).locator('span').first();
        this.minutesBlock = this.webpage.locator('.MuiPickersToolbar-content button[tabindex="0"]').nth(1).locator('span').first();
        this.secondsBlock = this.webpage.locator('.MuiPickersToolbar-content button[tabindex="0"]').nth(2).locator('span').first();

        // Searching settings field locators
        this.setSearchType = this.webpage.locator('[aria-haspopup="listbox"] button');
        this.intervalStartInput = this.webpage.locator('input[type="text"]').nth(0);   
        this.intervalEndInput = this.webpage.locator('input[type="text"]').nth(1);
        this.intervalStartDatapicker = this.webpage.locator('input[type="text"] ~ div>button').nth(0);
        this.intervalEndDatapicker = this.webpage.locator('input[type="text"] ~ div>button').nth(1);
        this.templateTimePicker = this.webpage.getByTestId('wc_search_mode-search_time_range_input');
        this.eventSearchOption = this.webpage.getByRole('option', { name: 'Event search' });
        this.thumbnailSearchOption = this.webpage.getByRole('option', { name: 'Thumbnail search' });
        this.heatmapSearchOption = this.webpage.getByRole('option', { name: 'Heatmap' });
        this.lineCrossingOption = this.webpage.getByRole('option', { name: 'Line crossing' });
        this.loiteringOption = this.webpage.getByRole('option', { name: 'Loitering' });
        this.multipleObjectOption = this.webpage.getByRole('option', { name: 'Multiple objects' });
        this.moveBetweenZonesOption = this.webpage.getByRole('option', { name: 'Move from area to area' });
        this.motionInAreaOption = this.webpage.getByRole('option', { name: 'Motion in area' });
        this.faceSearchOption = this.webpage.getByRole('option', { name: 'Face search' });
        this.LPSearchOption = this.webpage.getByRole('option', { name: 'LP search' });
        this.eventTypeInput = this.webpage.locator('#event-type');
        this.initiatorInput = this.webpage.locator('#initiator-type');
        this.searchButton = this.webpage.getByText('Search', { exact: true });
        this.LPSearchField = this.webpage.getByTestId('wc_search_configurator-search_plates');
        this.faceSearchField = this.webpage.locator('[data-testid="AddAPhotoIcon"] ~ input[type=file]');
        this.faceSearchImage = this.webpage.locator('.MuiPaper-elevation1 img'); //Поменять локатор
        this.removeSearchFace = this.webpage.getByTestId('CloseIcon');
        this.faceSimilarityThreshold = this.webpage.getByTestId('wc_search_configurator-search_faces_similarity');
        this.faceSortingMenu = this.webpage.getByTestId('wc_search_configurator-search_count_form');
        this.sortingOptionSimilarity = this.webpage.getByRole('option', { name: 'Similarity' });
        this.sortingOptionTime = this.webpage.getByRole('option', { name: 'Time' });
        this.objectsCountInput = this.webpage.getByTestId('wc_search_configurator-search_count_form');
        this.objectLoiteringDuration = this.webpage.getByTestId('wc_search_configurator-search_duration_form');
        this.metaDataInput = this.webpage.getByTestId('wc_search_configurator-source_form');
        this.resizeControl = this.webpage.locator('#resizer ~ rect'); //Поменять локатор
        this.dividerControl = this.webpage.locator('#divider ~ circle'); //Поменять локатор
        this.playerWindowIncrease = this.webpage.getByTitle('Zoom in', { exact: true });
        this.playerWindowDecrease = this.webpage.getByTitle('Zoom out', { exact: true });
        
        // Searching results field locators
        this.eventsField = this.webpage.getByTestId('wc_search_mode-search_container') //this.webpage.locator('.MuiBox-root.css-x9v0eq'); 
        this.foundEvent = this.webpage.getByTestId('wc_search_mode-search_list').getByTestId('wc_search_mode-search_item'); //this.webpage.locator('.css-10klw3m .css-1oai5st');
        this.scrolledRows = this.webpage.locator('[data-testid="wc_search_mode-search_list"]>div:nth-child(1)');
        this.activeEvent = this.webpage.getByTestId('wc_search_mode-search_list').locator('[data-selected="true"]'); //this.webpage.locator('.MuiBox-root.css-40stil');
        this.eventsCounter = this.webpage.getByText("Found:");
        this.noResultBanner = this.webpage.getByText('No results');
        this.heatmapBackgroundImage = this.webpage.locator('[data-testid="wc_search_mode-search_item"] img');
        this.heatmapImage = this.webpage.locator('[data-testid="wc_search_mode-search_item"] img ~ div');
        this.heatmapOpacityBar = this.webpage.locator('h6 ~ span');
        this.resultSliderDot = this.webpage.locator('.MuiMobileStepper-dot');
        this.resultSliderLeftArrow = this.webpage.getByTestId('KeyboardArrowLeftIcon');
        this.resultSliderRightArrow = this.webpage.getByTestId('KeyboardArrowRightIcon');
        this.resultSortingIcon = this.webpage.getByRole('button', { name: 'Sort by time' });

        // Bookmark locators
        this.bookmarkMode = this.webpage.getByRole('menuitem', { name: 'Archive Bookmarks' });
        this.bookmark = this.webpage.locator('tbody tr');
        this.bookmarkCheckbox = this.webpage.locator('tbody tr td:nth-child(1)').locator('input');
        this.bookmarkBegin = this.webpage.locator('tbody tr td:nth-child(2)');
        this.bookmarkEnd = this.webpage.locator('tbody tr td:nth-child(3)');
        this.bookmarkCreated = this.webpage.locator('tbody tr td:nth-child(4)');
        this.bookmarkAuthor = this.webpage.locator('tbody tr td:nth-child(5)');
        this.bookmarkProtection = this.webpage.locator('tbody tr td:nth-child(6)').locator('input');
        this.bookmarkCamera = this.webpage.locator('tbody tr td:nth-child(7)');
        this.bookmarkComment = this.webpage.locator('tbody tr td:nth-child(8)');
        this.bookmarkVideo = this.webpage.locator('tbody tr td:nth-child(9)');
        this.tableHeaderBegins = this.webpage.locator('thead').getByText('Begins');
        this.tableHeaderEnds = this.webpage.locator('thead').getByText('Ends');
        this.tableHeaderName = this.webpage.locator('thead').getByText('Name');
        this.tableHeaderComment = this.webpage.locator('thead').getByText('Comment');
        this.editBookmarkButton = this.webpage.getByRole('button', { name: 'Edit bookmark', exact: true });
        this.deleteRecordButton = this.webpage.getByRole('button', { name: 'Delete record', exact: true });
        this.deleteOneBookmarkButton = this.webpage.getByRole('button', { name: 'Delete bookmark', exact: true });
        this.deleteBookmarksButton = this.webpage.getByRole('button', { name: 'Delete bookmarks', exact: true });
        this.backToLiveButton = this.webpage.getByRole('button', { name: 'Back', exact: true });
        this.backToBookmarksButton = this.webpage.getByTestId('MenuIcon');
        this.searchField = this.webpage.locator('input[type="text"]');
        this.windowBeginsAt = this.webpage.locator('#bookmark-begins-at');
        this.windowEndsAt = this.webpage.locator('#bookmark-ends-at');
        this.windowComment = this.webpage.locator('#bookmark-comment');
        this.windowSave = this.webpage.getByRole('button', { name: 'Save bookmark', exact: true });
        this.windowCancel = this.webpage.getByRole('button', { name: 'Cancel', exact: true });
        this.windowErrorMessage = this.webpage.locator('[role="dialog"] p');
        this.removeAccept = this.webpage.getByRole('button', { name: 'yes' });
        this.removeReject = this.webpage.getByRole('button', { name: 'no' });
        this.modalWindowBackground = this.webpage.locator('[role="presentation"]');
        this.cellTitleInFrame = this.webpage.frameLocator('iframe').locator('[data-testid="at-camera-title"]');
        this.cellTimerInFrame = this.webpage.frameLocator('iframe').locator('[data-testid="at-camera-time"]');
        this.cellArchiveMenuInFrame = this.webpage.frameLocator('iframe').getByTestId('at-select-camera-archive');
        this.cellImageInFrame = this.webpage.frameLocator('iframe').locator('[role="gridcell"] img');
        this.playButtonInFrame = this.webpage.frameLocator('iframe').locator('#at-archive-control-play-pause');
        this.frameVideoElement = this.webpage.frameLocator('iframe').locator('.VideoCell--playing video');
        this.pointerTimeInFrame = this.webpage.frameLocator('iframe').locator('.control [role="none"] span').first();
        this.lastIntervalInFrame = this.webpage.frameLocator('iframe').locator('.intervals').last().locator('rect').last();

        // Events panel locators
        this.eventPanelButton = this.webpage.getByTestId('wc_events_panel-expand_button');

        // Map panel locators
        this.mapPanelButton = this.webpage.getByRole('button', { name: 'Maps' });
        this.mapPanelExpandButton = this.webpage.getByTestId('ExpandLessIcon');
        this.mapPanelCollapseButton = this.webpage.getByTestId('ExpandMoreIcon');
        this.mapBoxCanvas = this.webpage.locator('.mapboxgl-canvas');
        this.mapBoxLogo = this.webpage.locator('a.mapboxgl-ctrl-logo');
        this.rightSlider = this.webpage.getByTestId('KeyboardArrowRightIcon');
        this.leftSlider = this.webpage.getByTestId('KeyboardArrowLeftIcon').last(); //поменять локатор
        this.mapBoxMarker = this.webpage.locator('.mapboxgl-marker');
        this.mapBoxPopup = this.webpage.locator('.mapboxgl-popup');
        this.mapBoxPopupVideo = this.webpage.locator('.mapboxgl-popup .VideoCell--playing video');
        this.mapBoxDebugPanel = this.webpage.locator('.css-1kvsp5u'); //поменять локатор  
    }

    getCellLocator(page: Page, index: number) {
        return this.webpage.locator(`[role="gridcell"][tabindex="${index}"]`);
    }

    getCameraListItemLocator(cameraName: string, isStrict = true) {
        return this.webpage.getByRole('button', { name: cameraName, exact: isStrict });
    }
}