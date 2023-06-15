# Getting Started

## Local Development

-   Clone this repository
-   This project uses Node.js with TypeScript. "ts-node" should be installed globally.

```
npm install -g ts-node
```

-   Install dependencies with:

```
yarn
```

-   Run command with the given format:

```
ts-node ./src/index.ts <command-name> <options>
```

## Using Snapcraft

-   Install snapcraft

```
snap install --classic snapcraft
```

-   Build the snap (the first time will be long, and install's multipass)

```
snapcraft
```

Make sure there is no error and a file called `ght.0.0_amd64.snap` is generated.

-   Install the snap:

```
snap install --dangerous ght_1.0.0_amd64.snap
```

Now the program can be ran with:

```
ght <command-name> <arguments>
```
