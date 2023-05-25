const { app, BrowserWindow, ipcMain, Tray, Menu} = require('electron')
const path = require('path')
const {loadFiles, getMods, listenForMinecraft} = require("./js/launch-util");
const {fadeWindowIn, fadeWindowOut} = require("./js/window-util");
const {startup, checkUpdates, retrieveWeaveLoaderFile, extractVersion, downloadWeave, doesWeaveDirExist, openModFolder } = require('./js/file-util')

app.setLoginItemSettings({
    openAtLogin: true
})

const eventActions = {
    getModList: () => {
        win.webContents.send('fromMain', ['getModList', getMods()])
    },
    closeWindow: () => {
        fadeWindowOut(win, 0.1, 10, true)
    },
    minimizeWindow: () => {
        fadeWindowOut(win, 0.1, 10)
    },
    checkUpdates: () => {
        // ignore checkUpdates event if .weave dir doesn't exist
        const weaveDirExists = doesWeaveDirExist()
        if (weaveDirExists) {
            const weaveLoaderFile = retrieveWeaveLoaderFile()
            const version = extractVersion(weaveLoaderFile)
            checkUpdates(win, version)
        }
    },
    update: (args) => {
        const json = args[0]
        downloadWeave(win, json.download, json.version, false)
    },
    install: (args) => {
        const json = args[0]
        downloadWeave(win, json.download, json.version, true)
    },
    openModFolder: () => {
        openModFolder()
    }
}

ipcMain.on("toMain", (event, args) => {
    const action = eventActions[args[0]]
    if (action)
        action(args.slice(1))
})

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        fullscreenable: false,
        maximizable: false,
        resizable: false,
        transparent: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        }
    })

    win.once('ready-to-show', () => {
        win.show()
    })

    win.setIcon('public/icon.png')
    win.loadFile('public/index.html')

    return win
}

const createTray = () => {
    const tray = new Tray('public/icon.ico')
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open', click: () => win.show() },
        { label: 'Quit', click: () => app.quit() }
    ])
    tray.setToolTip('Weave Manager')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
        win.show()
    })

    return tray
}

let win
let tray
app.whenReady().then(() => {
    loadFiles()
    win = createWindow()
    tray = createTray()

    win.on('ready-to-show', () => {
        startup(win)
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            win = createWindow()
            win.openDevTools()
        }
    })

    win.on('focus', () => {
        fadeWindowIn(win, 0.1, 10)
    })

    listenForMinecraft(win)
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

