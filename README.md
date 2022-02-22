# Green House Automations
[![Get it from the Snap Store](https://snapcraft.io/static/images/badges/en/snap-store-black.svg)](https://snapcraft.io/greenhouse)

This project includes automations that are related to Greenhouse. It is a command line application that can be ran with a single line command or a simple interface. 

Here some of the automations:
- Add Job Posts: A job posts can be cloned to different locations. Also the created job posts will be activated.
- Delete Job Posts: Job posts with given name, location that belongs to a job can be deleted. 

## Getting Started
This project uses Node.js with TypeScript. "ts-node" should be installed globally.

```
npm install -g ts-node
```

### Local Development
- Clone this repository
- Install dependencies with:
```
yarn
``` 
- Run command with the given format:
```
ts-node ./src/index.ts <command-name> <arguments>
```

### Using Snapcraft
- Install snapcraft
```
snap install --classic snapcraft
```
- Build the snap (the first time will be long, and install's multipass)
```
snapcraft
```
Make sure there is no error and a file called `greenhouse_1.0.0_amd64.snap` is generated.

- Install the snap: 
```snap install --dangerous greenhouse_1.0.0_amd64.snap```

Now the program can be ran with:
```
greenhouse <command-name> <arguments>
```
