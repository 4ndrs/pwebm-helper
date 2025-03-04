# pwebm-helper

This is a small mpv script to aid the conversion of videos with [PureMPV](https://github.com/4ndrs/PureMPV) and [pwebm](https://github.com/4ndrs/pwebm). 

## Installation

The automatically built script can be downloaded from [here](https://github.com/4ndrs/pwebm-helper/releases/download/bleeding-edge/pwebm-helper.js), or if you prefer building it manually:

```console
git clone https://github.com/4ndrs/pwebm-helper.git
cd pwebm-helper
npm i
npm run build
```

The built script will be available under the newly created `dist` folder.

After this you can put the script in the mpv scripts folder (`~/.config/mpv/scripts`) for it to run whenever mpv is executed.
## Usage

The cropping coordinates and timestamps from PureMPV are used and passed to pwebm to either make size limited webms without audio (pressing <kbd>ctrl</kbd> + <kbd>o</kbd>), or mkvs (pressing <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>o</kbd>) with all streams copied (fonts, subtitles, etc.) except video to keep timestamps accurate. There is an option to burn the subtitles as well when encoding webms that can be toggled pressing <kbd>ctrl</kbd> + <kbd>v</kbd>.

## Configuration file

The following configurations are available when using the `~/.config/mpv/script-opts/pwebm-helper.conf` file:

|Option key|Details|
|----------|------|
|executable| Specifies which program to execute with PureMPV's parameters. Default is **pwebm**.
|params1| Specifies which params to append when using the keybinding 1. Default is **empty**.
|params1| Specifies which params to append when using the keybinding 2. Default is **-c:v libx264 -crf 18**.
|keybinding1| Specifies which keybinding to use to execute pwebm with params 1. Default is **ctrl+o**.
|keybinding2| Specifies which keybinding to use to execute pwebm with params 2. Default is **ctrl+shift+o**.

An example of the content of a configuration file could be the following:

```bash
# ~/.config/mpv/script-opts/pwebm-helper.conf
params1=--size-limit 6 --extra-params -map 0:a -c:a libopus -b:a 128k
```
