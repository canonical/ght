# Greenhouse Tooling

[![Get it from the Snap Store](https://snapcraft.io/static/images/badges/en/snap-store-black.svg)](https://snapcraft.io/ght)

Greenhouse Tooling (`ght`) is a command line tool that will help you automate repetitive tasks on Greenhouse.

Since it only supports Ubuntu One login, this project can only be used by Canonical employees.

## Install ght

On Linux it is available as a snap:

```
snap install ght
```

## Usage

### Replicate job posts

You can use `ght` to replicate job posts from the Canonical board in regions: americas, EMEA and APAC.

```
ght replicate <JOB_POST_ID> --regions=europe,americas
```

If you want to use the interactive mode you can run the command with the flag `-i`. Let yourself be guided by the tool:

```
ght replicate -i
```

### Assign graders to written interviews

You can use `ght` to assign random graders to written interviews. You should have a `ght-graders.yml` file in your home directory with the format:

```
Job name 1:
  Written Interview:
    - name: Grader One
      active: true
    - name: Grader Two
      active: false
    - name: Grader Three
      active: true
Job name 2:
  Written Interview:
    - name: Grader Four
      active: true
```

Running `ght assign -i` will guide you through the process of selecting the jobs. For the selected jobs, it will go through the written interviews needing graders (applications where only the hiring lead is assigned, since this is the default behaviour in Greenhouse) and will assign two random names from the list provided.

-   `name`: should exactly match the name used when selecting the person is the scorecard asignment modal in Greenhouse
-   `active`: only people with active set to `true` will be randomly selected. This allows you to define people that are on holiday or unavailable for a time.

### Authentication

The CLI will manage authentication. To avoid entering credentials every time the command runs, the authorization cookie created by Greenhouse and SSO will be stored in the file: `~/.canonical-greenhouse.json`.

Every time the authentication requires a refresh, you will be requested to authenticate.

**Happy hiring!**
