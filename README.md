# Green House Automations
[![Get it from the Snap Store](https://snapcraft.io/static/images/badges/en/snap-store-black.svg)](https://snapcraft.io/greenhouse)

This project includes automations that are related to Greenhouse. It is a command line application that can be ran with a single line command or a simple interface. 

Here some of the automations:
- Add Job Posts: A job post can be cloned to different locations. Also the created job posts will be activated.
- Delete Job Posts: Job posts with given name, location that belongs to a job can be deleted. 

## Getting Started
- This project uses Node.js with TypeScript. "ts-node" should be installed globally.

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
ts-node ./src/index.ts <command-name> <options>
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
```
snap install --dangerous greenhouse_1.0.0_amd64.snap
```

Now the program can be ran with:
```
greenhouse <command-name> <arguments>
```

## Authorization

The CLI will manage authentication. To avoid entering credentials every time the command runs, the authorization cookie created by Greenhouse and SSO will be stored in the file:  `~/.canonical-greenhouse.json`.

Every time the authentication requires a refresh, the authentication prompt will be displayed to the user.


## Commands
### add-posts
This command clones a job's job post that must exist on "Canonical" board for the given regions' cities.

Usage:
```
greenhouse add-posts ([-i | --interactive] | <job-id> --regions=<region-name>[, <region-name-2>...] [--clone-from=<job-post-id>])
```

#### Options
**--interactive/-i** : All arguments and options will be ignored. Those will be asked to the user by the command line interface.

- **Selecting a job**: After the authentication part, the jobs are fetched from the Greenhouse. Those jobs are displayed to the user. For a job to be displayed on the job list: 
    - The user should be able to see it from the [Greenhouse](https://canonical.greenhouse.io/alljobs).
    - The user must have "Recuiter" tag for that job.

- **Selecting a job post**: The unique job posts' names will be displayed to the user. All job posts that are going to be created
are copied from the chosen post. 
    - Job posts that are in the "Canonical" board are going to be displayed.
    - Only job posts with UNIQUE names will be displayed. For example, if there is two job post with name "Job Post - 1" in the "Canonical" board only one of them will be displayed, regrdless of the content or other fields.  

- **Selecting regions**: The user must select one or more predefined regions. The job posts will be created with the given regions' cities. 
    - To add new regions please create [an issue](https://github.com/canonical/greenhouse-automations/issues/new).
    - To select a region use space, to confirm the selections use enter key.

- **Delete option**: This prompt asks if the posts with chosen name and cities should be deleted. The default is "yes". 
    - If it is confirmed, all job posts that have same name with the chosen job post and city in one of the chosen regions except the ones in the "Canonical" and "Internal" boards.
    - If the "No" option is selected, job posts will not be deleted. In the creation process, if there is another job post that matches with the chosen options, that job post will not be created regardless of the content or other fields.
      

