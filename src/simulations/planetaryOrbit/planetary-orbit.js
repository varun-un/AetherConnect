import * as BABYLON from 'babylonjs';
import * as BGUI from 'babylonjs-gui';
import {rotatePlanet, animOrbit, orbitPath} from './planet-movements';

//when browser is loaded, create the scene
var canvas = document.getElementById('canvas');
var engine = new BABYLON.Engine(canvas, true);

var createScene = function () {
    var scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;
    scene["planets"] = [];

    var selectedMesh;
    var pressedKeys = {};
    window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
    window.onkeydown = function(e) { pressedKeys[e.keyCode] = true; }

    //gets skybox assets/texture
    var envTexture = BABYLON.CubeTexture.CreateFromImages([require("../../simAssets/skybox/milkyway/milkyway_px.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_py.jpg"), require("../../simAssets/skybox/milkyway/milkyway_pz.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_nx.jpg"), require("../../simAssets/skybox/milkyway/milkyway_ny.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_nz.jpg")], scene, false);
    scene.createDefaultSkybox(envTexture, false, 1000);

    //set arc rotate cam
    var camera = new BABYLON.ArcRotateCamera("arcCamera", 0, 0, 7, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);  
    camera.collisionRadius = new BABYLON.Vector3(1,1,1); 
    camera.checkCollisions = true;
    camera.upperRadiusLimit = 600;
    camera.pinchPrecision = 85.0;
    camera.wheelDeltaPercentage = 0.0025;
    camera.allowUpsideDown = true;
    camera.panningAxis = new BABYLON.Vector3(1,1,0);
    camera.panningInertia = .9;
    camera.panningSensibility = 850;
    

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

        //scale up sun
        set._emitterNode.scaling = new BABYLON.Vector3(2,2,2);
        set.systems[0].maxScaleX = 2.4;
        set.systems[0].maxScaleY = 2.4;
        set.systems[1].maxScaleX = 1.75;
        set.systems[1].maxScaleY = 1.75;
        set.systems[2].maxScaleX = 2.75;
        set.systems[2].maxScaleY = 2.75;

        set.start();
    }).catch((issue) => console.error (issue));
    var sun = BABYLON.Mesh.CreateSphere("pseudoSun", 32, 4.1, scene);

    //create Earth
    var earth = BABYLON.Mesh.CreateSphere("earth", 32, .5, scene);
    earth.position.z = 10;
    earth.renderingGroupId = 3;
    scene.planets.push(earth);

    //create earth's texture
    var earthMat = new BABYLON.StandardMaterial("earth-material", scene);
    earthMat.diffuseTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-daymap.jpg"), scene);
    earthMat.bumpTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-normal.jpg"), scene);
    earthMat.bumpTexture.level = 8;
    earthMat.specularColor = new BABYLON.Color3(0, 0, 0);
    earth.material = earthMat;

    var sunlight = new BABYLON.PointLight("sunlight", new BABYLON.Vector3(0,0,0), scene);
    sunlight.intensity = 1.5;

    //environment lighting
    var downLight = new BABYLON.HemisphericLight("downlight", new BABYLON.Vector3(0, 1, 0), scene);
    downLight.intensity = 0.2;
    downLight.includedOnlyMeshes.push(earth);
    var upLight = new BABYLON.HemisphericLight("uplight", new BABYLON.Vector3(0, -1, 0), scene);
    upLight.intensity = 0.2;
    upLight.includedOnlyMeshes.push(earth);


    //set settings for focusing and camera action w/ meshes in scene
    for (var i = 1; i < scene.meshes.length; i++){
        scene.meshes[i].checkCollisions = true;

        //make camera focus on mesh when mesh clicked and 'f' key held
        scene.meshes[i].actionManager = new BABYLON.ActionManager(scene);
        scene.meshes[i].actionManager.registerAction(new BABYLON.InterpolateValueAction(                  //camera rotate
            BABYLON.ActionManager.OnLeftPickTrigger, camera, 'target', scene.meshes[i].position, 300,
            new BABYLON.PredicateCondition(scene.meshes[i].actionManager, () => pressedKeys["70"])));
        scene.meshes[i].actionManager.registerAction(new BABYLON.InterpolateValueAction(                  //zoom
            BABYLON.ActionManager.OnLeftPickTrigger, camera, 'radius', 1.5, 300,
            new BABYLON.PredicateCondition(scene.meshes[i].actionManager, () => pressedKeys["70"])));
    }


    //create animations for planet rotations
    var earthRotAnimatable = rotatePlanet(earth, 22.5, 1, scene, true);


    //create animations for planet orbits
    var earthOrbit = animOrbit(earth, 0.01671, 365, 10, scene);
    var earthOrbitAnimatable = earthOrbit[0];
    var earthTrack = earthOrbit[1];

    var advancedTexture = BGUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    advancedTexture.layer.layerMask = 2;

    var panel = new BGUI.StackPanel();
    panel.width = "220px";
    panel.fontSize = "14px";
    panel.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BGUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    var header = new BGUI.TextBlock();
    header.text = "Speed: 1 unit";
    header.height = "40px";
    header.color = "white";
    header.textHorizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    header.marginTop = "10px";
    panel.addControl(header); 

    var slider = new BGUI.Slider();
    slider.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    slider.minimum = 1;
    slider.maximum = 730;
    slider.color = "green";
    slider.value = 1;
    slider.height = "20px";
    slider.width = "200px";
    slider.onValueChangedObservable.add(function(value) {
        header.text = "Speed: " + value + " units";
        earthOrbitAnimatable.speedRatio = value;
    });
    panel.addControl(slider);

    earthOrbitAnimatable.speedRatio = slider.value;

    // change eccentricity
    // var e = 0.01671;
    // setInterval(function(){
    //     e += .005;
    //     var path = orbitPath(e, 365, 10);
    //     earthTrack = BABYLON.Mesh.CreateLines(null, path, null, null, earthTrack);
    //     earth.ellipse = path;
    //     console.log(path);
    // }, 2000);

    function showWorldAxis(size) {
        var makeTextPlane = function(text, color, size) {
            var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
            dynamicTexture.hasAlpha = true;
            dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
            var plane = BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
            plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
            plane.material.backFaceCulling = false;
            plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
            plane.material.diffuseTexture = dynamicTexture;
        return plane;
            };
        var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
            BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
            new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
            ], scene);
        axisX.color = new BABYLON.Color3(1, 0, 0);
        var xChar = makeTextPlane("X", "red", size / 10);
        xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
        var axisY = BABYLON.Mesh.CreateLines("axisY", [
            BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
            new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
            ], scene);
        axisY.color = new BABYLON.Color3(0, 1, 0);
        var yChar = makeTextPlane("Y", "green", size / 10);
        yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
        var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
            BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
            new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
            ], scene);
        axisZ.color = new BABYLON.Color3(0, 0, 1);
        var zChar = makeTextPlane("Z", "blue", size / 10);
        zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
    };
    showWorldAxis(15);

    function localAxes(size, mesh) {
        var pilot_local_axisX = BABYLON.Mesh.CreateLines("pilot_local_axisX", [ 
        new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
        ], scene);
        pilot_local_axisX.color = new BABYLON.Color3(1, 0, 0);
    
        var pilot_local_axisY = BABYLON.Mesh.CreateLines("pilot_local_axisY", [
            new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
            new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
        ], scene);
        pilot_local_axisY.color = new BABYLON.Color3(0, 1, 0);
    
        var pilot_local_axisZ = BABYLON.Mesh.CreateLines("pilot_local_axisZ", [
            new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
            new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
            ], scene);
        pilot_local_axisZ.color = new BABYLON.Color3(0, 0, 1);
    
        var local_origin = mesh.clone("testerHee");
        local_origin.isVisible = false;
        
        pilot_local_axisX.parent = local_origin;
        pilot_local_axisY.parent = local_origin;
        pilot_local_axisZ.parent = local_origin; 
        
        return local_origin;
        
    }
    localAxes(4, earth);

    //loading screen
    engine.displayLoadingUI();
    scene.executeWhenReady(function() {
        engine.hideLoadingUI();
    })

    return scene;
}

var scene = createScene();
engine.runRenderLoop(function () {    

    //planet rotations and movements
    for (var i = 0; i < scene.planets.length; i++){
        scene.planets[i].rotate(BABYLON.Axis.Y, scene.planets[i].rotYLocal - scene.planets[i].prevRotYLocal, BABYLON.Space.LOCAL);
        scene.planets[i].prevRotYLocal = scene.planets[i].rotYLocal;  

        scene.planets[i].setAbsolutePosition(scene.planets[i].ellipse[Math.floor(scene.planets[i].orbitSegment)]);
    }
    
    scene.render();
});

window.addEventListener("resize", function () {
    engine.resize();
});
