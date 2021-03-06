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

### Authentication

The CLI will manage authentication. To avoid entering credentials every time the command runs, the authorization cookie created by Greenhouse and SSO will be stored in the file:  `~/.canonical-greenhouse.json`.

Every time the authentication requires a refresh, you will be requested to authenticate.

__Happy hiring!__