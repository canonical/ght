# Green House Automations
[![Get it from the Snap Store](https://snapcraft.io/static/images/badges/en/snap-store-black.svg)](https://snapcraft.io/greenhouse)

This project includes automations that are related to Greenhouse. It is a command line application that can be ran with a single line command or a simple interface. 

Here some of the automations:
- Add Job Posts: A job post can be cloned to different locations. Also the created job posts will be activated.
- Delete Job Posts: Job posts with given name, location that belongs to a job can be deleted. 

## Getting Started

### Local Development
- Clone this repository
- This project uses Node.js with TypeScript. "ts-node" should be installed globally.

```
npm install -g ts-node
```
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
### 1. add-posts
This command clones a job's job post/posts for the given regions' cities. 
Job posts will be created to the "Canonical - Jobs" board. After all of the job posts are created, they will be activated.

**Usage**:
```
greenhouse add-posts ([-i | --interactive] | <job-id> --regions=<region-name>[, <region-name-2>...] [--clone-from=<job-post-id>])
```

**Options**

**--interactive/-i** : All arguments and options will be ignored. Those will be asked to the user by the command line interface.

Example:
```
greenhouse add-posts --interactive
```

- **Selecting a job**: After the authentication part, the jobs are fetched from the Greenhouse. Those jobs are displayed to the user. For a job to be displayed on the job list: 
    - The user should be able to see it from the [Greenhouse](https://canonical.greenhouse.io/alljobs).
    - The user must be hiring lead and have "Recuiter" tag for that job.

- **Selecting a job post**: The unique job posts' names will be displayed to the user. All job posts that are going to be created
are copied from the chosen post. 
    - Job posts that are in the "Canonical" board are going to be displayed.
    - Only job posts with UNIQUE names will be displayed. For example, if there is two job post with name "Job Post - 1" in the "Canonical" board only one of them will be displayed.  

- **Selecting regions**: The user must select one or more predefined regions. The job posts will be created with the given regions' cities. 
    - To add new regions please create [an issue](https://github.com/canonical/greenhouse-automations/issues/new).
    - To select a region use space, to confirm the selections use enter key.

- **Delete option**: This prompt asks if the posts with chosen name and cities should be deleted. The default is "yes". 
    - If it is confirmed, all job posts that have same name with the chosen job post and city in one of the chosen regions except the ones in the "Canonical" and "Internal" boards.
    - If the "No" option is selected, job posts will not be deleted. In the creation process, if there is another job post that matches with the chosen options, that job post will not be created.
      
**job-id**: This argument is the ID of a job that job posts will be cloned to. It's a mandatory argument if the interactive mode is not activated. Only one job can be entered.

The user must be hiring lead and have "Recuiter" tag for that job.

To find ID of a job:
- Open the Greenhouse's [all jobs page](https://canonical.greenhouse.io/alljobs).
- Open the job's page.
- ID can be copied from the URL.

For example "Demo Job - Scenario A" job's URL is `https://canonical.greenhouse.io/sdash/1753300`. So ID of this job is "1753300".

Example: 

```
greenhouse add-posts 1753300 --regions=emea
```

**--regions/-r**: Job posts will be created for the entered regions' cities. It's a mandatory argument. Entered regions should be separated by comma.

The regions and their cities are predefined. Possible regions that can be entered are:
- americas
- us-boston
- emea
- apac

To add new regions or add cities to an existing region please create [an issue](https://github.com/canonical/greenhouse-automations/issues/new).

Example:
```
greenhouse add-posts 1753300 --regions=emea,americas
```

**--clone-from/-c**: This argument should be ID of a job post that belongs to the entered job. Also it should be in the "Canonical" board. 

If this argument is not entered, cloning operation will be done for ALL of the job posts in the "Canonical" board.

To find ID of a job post:
- Open the Greenhouse's [all jobs page](https://canonical.greenhouse.io/alljobs).
- Open the job's page.
- Open the job post that is wanted to be cloned.
- ID can be copied from the URL.

For example, to get a job post from "Demo Job - Scenario A" it's [job posts page](https://canonical.greenhouse.io/plans/1753300/jobapp) should be opened. The job post's edit page URL should be similar to https://canonical.greenhouse.io/jobapps/3958992/edit where "3958992" is ID of the job post. 

Example: 
```
greenhouse add-posts 1753300 --regions=emea --clone-from=3958992
```

### 2. delete-posts

This command deletes job posts that are not in the "Canonical" or "Internal" boards of a given job. 

Usage:
```
greenhouse delete-posts ([-i | --interactive] | <job-id> --regions=<region-name>[, <region-name-2>...] [--similar=<job-post-id>])
```

**Options**

**--interactive/-i** : All arguments and options will be ignored. Those will be asked to the user by the command line interface.

Example:
```
greenhouse delete-posts --interactive
```
- **Selecting a job**: After the authentication part, the jobs are fetched from the Greenhouse. Those jobs are displayed to the user. For a job to be displayed on the job list: 
    - The user should be able to see it from the [Greenhouse](https://canonical.greenhouse.io/alljobs).
    - The user must be hiring lead and have "Recuiter" tag for that job.

- **Selecting a job post**: The unique job posts' names will be displayed to the user. Only job posts with the selected job post's name will be deleted. 
    - Job posts that are in the "Canonical" board are going to be displayed.
    - Only job posts with UNIQUE names will be displayed. For example, if there is two job post with name "Job Post - 1" in the "Canonical" board only one of them will be displayed.  

- **Selecting regions**: A job posts will be deleted if it's locatin value is one of the entered regions' cities. Mutliple regions can be selected.
    - To add new regions or add cities to an existing region please create [an issue](https://github.com/canonical/greenhouse-automations/issues/new).
    - To select a region use space, to confirm the selections use enter key.

**job-id**: This argument is the ID of a job whose job posts will be deleted. It's a mandatory argument if the interactive mode is not activated. Only one job can be entered.

The user must be hiring lead and have "Recuiter" tag for that job.

To find ID of a job:
- Open the Greenhouse's [all jobs page](https://canonical.greenhouse.io/alljobs).
- Open the job's page.
- ID can be copied from the URL.

For example "Demo Job - Scenario A" job's URL is `https://canonical.greenhouse.io/sdash/1753300`. So ID of this job is "1753300".

Example: 

```
greenhouse delete-posts 1753300 --regions=emea
```

**--regions/-r**: Job posts will be created for the entered regions' cities. It's a mandatory argument. Entered regions should be separated by comma.

The regions and their cities are predefined. Possible regions that can be entered are:
- americas
- us-boston
- emea
- apac

To add new regions or add cities to an existing region please create [an issue](https://github.com/canonical/greenhouse-automations/issues/new).

Example:
```
greenhouse delete-posts 1753300 --regions=emea,americas
```

**--similar/-s**: This option requires ID of a job post. If it is entered, job posts whose title is the same with the entered job post will be deleted. The post should belong to the entered job and also be in the "Canonical" board.

To find ID of a job post:
- Open the Greenhouse's [all jobs page](https://canonical.greenhouse.io/alljobs).
- Open the job's page.
- Open the job post that is wanted to be cloned.
- ID can be copied from the URL.

For example, to get a job post from "Demo Job - Scenario A" it's [job posts page](https://canonical.greenhouse.io/plans/1753300/jobapp) should be opened. The job post's edit page URL should be similar to https://canonical.greenhouse.io/jobapps/3958992/edit where "3958992" is ID of the job post. 

Example: 
```
greenhouse delete-posts 1753300 --similar=3958992
```
