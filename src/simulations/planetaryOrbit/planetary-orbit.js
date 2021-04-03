import * as BABYLON from 'babylonjs';

//when browser is loaded, create the scene
window.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('canvas');
    var engine = new BABYLON.Engine(canvas, true);

    var createScene = function () {
        var scene = new BABYLON.Scene(engine);
        scene.collisionsEnabled = true;

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
        camera.collisionRadius = new BABYLON.Vector3(1.1,1.1,1.1); 
        camera.checkCollisions = true;
        camera.upperRadiusLimit = 650;
        camera.pinchPrecision = 85.0;
        camera.wheelDeltaPercentage = 0.0025;
        camera.allowUpsideDown = true;
        camera.panningAxis = new BABYLON.Vector3(1,1,0);
        camera.panningInertia = .9;
        camera.panningSensibility = 850;
        //camera.target = 
        //console.log(camera);
        

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
        var sun = BABYLON.Mesh.CreateSphere("pseudoSun", 32, 2.1, scene);

        //create Earth
        var earth = BABYLON.Mesh.CreateSphere("earth", 32, .5, scene);
        earth.position.z = 5;
        earth.rotation = new BABYLON.Vector3(0,0,Math.PI);
        earth.rotate(BABYLON.Axis.X, BABYLON.Tools.ToRadians(21.5), BABYLON.Space.WORLD);        //earth's tilt on the axis
        earth.renderingGroupId = 3;

        //create earth's texture
        var earthMat = new BABYLON.StandardMaterial("earth-material", scene);
        earthMat.diffuseTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-daymap.jpg"), scene);
        earthMat.bumpTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-normal.jpg"), scene);
        earthMat.bumpTexture.level = 1.5;
        earthMat.specularColor = new BABYLON.Color3(0, 0, 0);
        earth.material = earthMat;

        var sunlight = new BABYLON.PointLight("sunlight", new BABYLON.Vector3(0,0,0), scene);

        //environment lighting
        var downLight = new BABYLON.HemisphericLight("downlight", new BABYLON.Vector3(0, 1, 0), scene);
        downLight.intensity = 0.2;
        downLight.includedOnlyMeshes.push(earth);
        var upLight = new BABYLON.HemisphericLight("uplight", new BABYLON.Vector3(0, -1, 0), scene);
        upLight.intensity = 0.2;
        upLight.includedOnlyMeshes.push(earth);

        //set common settings for all meshes in the scene
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
