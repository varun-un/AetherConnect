import * as BABYLON from 'babylonjs';

//when browser is loaded, create the scene
window.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('canvas');
    var engine = new BABYLON.Engine(canvas, true);

    var createScene = function () {
        var scene = new BABYLON.Scene(engine);
    
        //Create background material via skybox
        var skybox = BABYLON.Mesh.CreateBox("BackgroundSkybox", 500, scene, undefined, BABYLON.Mesh.BACKSIDE);
        var backgroundMaterial = new BABYLON.BackgroundMaterial("backgroundMaterial", scene);

        //gets skybox assets/texture
        backgroundMaterial.reflectionTexture = BABYLON.CubeTexture.CreateFromImages([require("../../simAssets/skybox/milkyway/milkyway_px.jpg"), 
            require("../../simAssets/skybox/milkyway/milkyway_py.jpg"), require("../../simAssets/skybox/milkyway/milkyway_pz.jpg"), 
            require("../../simAssets/skybox/milkyway/milkyway_nx.jpg"), require("../../simAssets/skybox/milkyway/milkyway_ny.jpg"), 
            require("../../simAssets/skybox/milkyway/milkyway_nz.jpg")], scene, false);
        backgroundMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skybox.material = backgroundMaterial;
        
        //temp box for render
        var box = BABYLON.Mesh.CreateBox("Box", 1.0, scene);

        //set arc rotate cam
        var camera = new BABYLON.ArcRotateCamera("arcCamera", BABYLON.Tools.ToRadians(45), BABYLON.Tools.ToRadians(45), 7, 
        box.position, scene);
        camera.attachControl(canvas, true);   
        camera.lowerRadiusLimit = 2.1;
        camera.upperRadiusLimit = 400;
        camera.pinchPrecision = 100.0;
        camera.wheelDeltaPercentage = 0.02;
        
        

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

        //create particle system from provided assets
        //https://github.com/BabylonJS/Assets/blob/master/particles/systems/sun.json
        var sun = new BABYLON.ParticleHelper.CreateAsync("sun", scene).then(function(set) {
            set.start();
        });

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
