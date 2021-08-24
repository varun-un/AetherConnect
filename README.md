# Aether Connect
Aether Connect is a website that provides 3D simulations to help teach a variety of topics in an easy-to-use, yet engaging, way. Its end goal is to be a database which houses many different 3D simulations in both science and mathematics that do well to teach users, all while being accessible to all. It also hopes to establish a community of volunteer developers to help create these simulations, helping to reach its end goal.

Visit the website at: https://aetherconnect.netlify.app/   

[![Netlify Status](https://api.netlify.com/api/v1/badges/fac59de9-6fe9-40bb-9603-989655aea73d/deploy-status)](https://app.netlify.com/sites/aetherconnect/deploys)

## Contribute
In order to reach its end goal and to expand the collection of simulations it houses, Aether Connect needs the help of community contributions. If you have an idea for a simulation you would like to add to the site, and know how to code such, create a branch for that simulation and, within the [simulations](/src/simulations/) folder, create a folder with the same name as your prospective simulation, and code it within this folder.

In this folder, the simulation should include the code for the entire simulation, including the HTML code for the webpage itself as well. Common assets can be found, or put, in the [simAssets](/src/simAssets/) folder. 

Then, when the simulation is done, add it as another `SimulationDetails` object in the `simulations` array within the [sim-cards.jsx](/src/site/sim-cards.jsx) file, in order to have the simulation's card show up on the website. This includes adding, and linking, a thumbnail image for the simulation, which can be put in the [thumbnails](/src/site/thumbnails/) folder, and has a recommended aspect ratio of 16:9. Finally, create a pull request for your simulation, and you're done!

## Dependencies
Aether Connect is built using external, third-party libraries:

#### BabylonJS
BabylonJS is a Javascript-based 3D rendering and game engine that allows for 3D assets and animations to be created and used within the browser. It takes advantage of the WebGL API to allow for faster render times and hardware acceleration. See more at [BabylonJS](https://www.babylonjs.com/).

#### Preact
Preact is used as a fast and lightweight alternative to React for creating components for the website. See more at [Preact](https://preactjs.com/)

#### GSAP
GSAP is used to create animations for HTML elements, and is mainly used within the simulations themselves. See more at [GSAP](https://greensock.com/gsap/)


## Build
Aether Connect is bundled using [Parcel](https://parceljs.org/). For further instructions or configuration details visit their [Github](https://github.com/parcel-bundler/parcel#packagejson).
