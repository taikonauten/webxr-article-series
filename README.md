<p align="center">
  <img src="https://i.imgur.com/dV1aZjJ.png" title="Taikonauten">
</p>

<h1 align="center">Taikonauten WebXR article series</h1>

# Introduction to WebXR using Babylon.js

This series is aimed at experienced web developers who want to get started with WebXR. The series is based on the Babylon.js framework and is intended to provide a quick and easy introduction to the topic. The series is divided into 9 parts. Each part builds up on the previous one and introduces new concepts and techniques. The series is based on the [Babylon.js WebXR Tutorial](https://doc.babylonjs.com/divingDeeper/webXR) and is intended to provide a more detailed and in-depth introduction to the topic.


> This repository is published alongside an article series on
[Dev.to (WebXR with Babylon.js Series)](https://dev.to/ibryan/series/26020)

## Technology Stack

![Nodejs](https://img.shields.io/badge/NodeJs-v20.9.0-green.svg) ![Babylonjs](https://img.shields.io/badge/Babylon.js-v6.31.0-orange.svg) ![Webpack](https://img.shields.io/badge/Webpack-v5.89.0-blue.svg) ![Typescript](https://img.shields.io/badge/Typescript-v5.3.2-blue.svg) ![LocalTunnel](https://img.shields.io/badge/LocalTunnel-v2.0.2-009447.svg) ![ESLint](https://img.shields.io/badge/ESLint-v8.54.0-475467.svg)

## Requirements

* General understanding and experience in working with Javascript and Typescript
* A MetaQuest 3 device


## Content

1. Introduction to WebXR using Babylon.js
2. Plane Detection
3. Meshes & Materials
4. Hit Testing
5. Input/Controllers & Ray Casting
6. Animating a Mesh
7. Anchors
8. Models & Assets
9. Asset Handling & Animation

## Getting Started

### Installation

```bash
npm install
```

To install all dependencies.

### Quick start

```bash
npm run start
```

### Running a specific article part

**Note:** Replace `PART_ID` with the part id you want to run.
There are currently 10 parts available.

```bash
npm run start --part=PART_ID
//i.e. npm run start --part=1
```

To start the development server.

```bash
npx localtunnel --port 8080
```

To start the tunnel server to be able to request our local development server from the internet and our WebXR compatible device.

## Authors

* [Taikonauten](https://taikonauten.com)

---

Made with ♡ by Taikonauten
