import * as BABYLON from 'babylonjs';

//when browser is loaded, create the scene
window.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('canvas');
    var engine = new BABYLON.Engine(canvas, true);

    var createScene = function () {
        var scene = new BABYLON.Scene(engine);

        //gets skybox assets/texture
        var envTexture = BABYLON.CubeTexture.CreateFromImages([require("../../simAssets/skybox/milkyway/milkyway_px.jpg"), 
            require("../../simAssets/skybox/milkyway/milkyway_py.jpg"), require("../../simAssets/skybox/milkyway/milkyway_pz.jpg"), 
            require("../../simAssets/skybox/milkyway/milkyway_nx.jpg"), require("../../simAssets/skybox/milkyway/milkyway_ny.jpg"), 
            require("../../simAssets/skybox/milkyway/milkyway_nz.jpg")], scene, false);
        scene.createDefaultSkybox(envTexture, false, 1000);

        //set arc rotate cam
        var camera = new BABYLON.ArcRotateCamera("arcCamera", 0, 0, 7, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvas, true);   
        camera.lowerRadiusLimit = 2.1;
        camera.upperRadiusLimit = 650;
        camera.pinchPrecision = 100.0;
        camera.wheelDeltaPercentage = 0.005;
        
        
        // Set up rendering pipeline
        var pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene);

        //Anti-Aliasing (add setting to enable/disable this)
        // pipeline.samples = 4;
        // pipeline.grainEnabled = true;
        // pipeline.grain.intensity = 3; 
        
        //change exposure/saturation
        scene.imageProcessingConfiguration.toneMappingEnabled = true;
        scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        scene.imageProcessingConfiguration.exposure = 3;

        //bloom (optional) (~setting tbd)
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 1;
        pipeline.bloomWeight = 0.4;
        pipeline.bloomKernel = 64;
        pipeline.bloomScale = 0.5;

        //create particle system from provided assets: https://github.com/BabylonJS/Assets/blob/master/particles/systems/sun.json
        var sunParticles = new BABYLON.ParticleHelper.CreateAsync("sun", scene).then(function(set) {
            set.systems[0].renderingGroupId = 3;
            set.systems[1].renderingGroupId = 1;
            set.systems[2].renderingGroupId = 3;
            set.start();
        }).catch((issue) => console.log(issue));

        //create Earth
        var earth = BABYLON.Mesh.CreateSphere("earth", 32, 15.0, scene);
        earth.position.x = 15;
        earth.position.z = 15;
        earth.renderingGroupId = 3;

        //create earth's texture
        var earthMat = new BABYLON.StandardMaterial("earth-material", scene);
        earthMat.diffuseTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-daymap.jpg"), scene);
        earthMat.bumpTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-normal.jpg"), scene);
        earthMat.bumpTexture.level = 1.5;
        earthMat.specularColor = new BABYLON.Color3(0, 0, 0);
        earth.material = earthMat;

        var sunlight = new BABYLON.PointLight("sunlight", new BABYLON.Vector3(0,0,0), scene);

        var downLight = new BABYLON.HemisphericLight("downlight", new BABYLON.Vector3(0, 1, 0), scene);
        downLight.intensity = 0.2;
        downLight.includedOnlyMeshes.push(earth);
        var upLight = new BABYLON.HemisphericLight("uplight", new BABYLON.Vector3(0, -1, 0), scene);
        upLight.intensity = 0.2;
        upLight.includedOnlyMeshes.push(earth);


        //loading screen
        engine.displayLoadingUI();
        scene.executeWhenReady(function() {
            engine.hideLoadingUI();
        })

        return scene;
    }

    var scene = createScene();
    engine.runRenderLoop(function () {      
        scene.render();
    });
});
