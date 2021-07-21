import * as BABYLON from 'babylonjs'
import * as BGUI from 'babylonjs-gui'
import { TweenMax, Power2 } from "gsap"
import {rotatePlanet, animOrbit, orbitPath} from './planet-movements'
const earcut = window.earcut

//when browser is loaded, create the scene
var canvas = document.getElementById('canvas')
var engine = new BABYLON.Engine(canvas, true)
var voiceover = new Audio(require('./planetary-orbit-voiceover.mp3'))
var isPlaying = true

var createScene = function () {
    var scene = new BABYLON.Scene(engine)
    scene.collisionsEnabled = true
    scene["planets"] = []

    //keep track of all pressed keys
    var pressedKeys = {};
    window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
    window.onkeydown = function(e) { pressedKeys[e.keyCode] = true; }

    //gets skybox assets/texture
    var envTexture = BABYLON.CubeTexture.CreateFromImages([require("../../simAssets/skybox/milkyway/milkyway_px.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_py.jpg"), require("../../simAssets/skybox/milkyway/milkyway_pz.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_nx.jpg"), require("../../simAssets/skybox/milkyway/milkyway_ny.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_nz.jpg")], scene, false);
    scene.createDefaultSkybox(envTexture, false, 1000)

    //set arc rotate cam
    var camera = new BABYLON.ArcRotateCamera("arcCamera", 0, 0, 7, BABYLON.Vector3.Zero(), scene)
    camera.attachControl(canvas, true)
    camera.collisionRadius = new BABYLON.Vector3(1,1,1)
    camera.checkCollisions = true
    camera.upperRadiusLimit = 600
    camera.pinchPrecision = 85.0
    camera.wheelDeltaPercentage = 0.005
    camera.allowUpsideDown = true
    camera.panningAxis = new BABYLON.Vector3(1,1,0)
    camera.panningInertia = .9
    camera.panningSensibility = 850
    

    // Set up rendering pipeline
    var pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene)

    //Anti-Aliasing (add setting to enable/disable this)
    // pipeline.samples = 4;
    // pipeline.grainEnabled = true;
    // pipeline.grain.intensity = 3; 
    
    //change exposure/saturation
    scene.imageProcessingConfiguration.toneMappingEnabled = true
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES
    scene.imageProcessingConfiguration.exposure = 3


    //------------------Meshes & Lights----------------------
    //create particle system from provided assets: https://github.com/BabylonJS/Assets/blob/master/particles/systems/sun.json
    var sunParticles = new BABYLON.ParticleHelper.CreateAsync("sun", scene).then(function(set) {
        set.systems[0].renderingGroupId = 3
        set.systems[1].renderingGroupId = 1
        set.systems[2].renderingGroupId = 3

        //scale up sun
        set._emitterNode.scaling = new BABYLON.Vector3(2,2,2)
        set.systems[0].maxScaleX = 2.4
        set.systems[0].maxScaleY = 2.4
        set.systems[1].maxScaleX = 1.75
        set.systems[1].maxScaleY = 1.75
        set.systems[2].maxScaleX = 2.75
        set.systems[2].maxScaleY = 2.75

        set.start()
    }).catch((issue) => console.error (issue));
    var sun = BABYLON.Mesh.CreateSphere("pseudoSun", 32, 4.1, scene)

    //create Earth
    var earth = BABYLON.Mesh.CreateSphere("earth", 32, .5, scene)
    earth.position.z = 10
    earth.renderingGroupId = 3
    scene.planets.push(earth)

    //create earth's texture
    var earthMat = new BABYLON.StandardMaterial("earth-material", scene)
    earthMat.diffuseTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-daymap.jpg"), scene)
    earthMat.bumpTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-normal.jpg"), scene)
    earthMat.bumpTexture.level = 8
    earthMat.specularColor = new BABYLON.Color3(0, 0, 0)
    earth.material = earthMat

    var sunlight = new BABYLON.PointLight("sunlight", new BABYLON.Vector3(0,0,0), scene)
    sunlight.intensity = 1.5

    //environment lighting
    var downLight = new BABYLON.HemisphericLight("downlight", new BABYLON.Vector3(0, 1, 0), scene)
    downLight.intensity = 0.2
    downLight.includedOnlyMeshes.push(earth)
    var upLight = new BABYLON.HemisphericLight("uplight", new BABYLON.Vector3(0, -1, 0), scene)
    upLight.intensity = 0.2
    upLight.includedOnlyMeshes.push(earth)


    //set settings for focusing and camera action w/ meshes in scene
    for (var i = 1; i < scene.meshes.length; i++){
        scene.meshes[i].checkCollisions = true
        scene.meshes[i].isPickable = true

        //make camera focus on mesh when mesh clicked and 'f' key held
        scene.meshes[i].actionManager = new BABYLON.ActionManager(scene)

        scene.meshes[i].actionManager.registerAction(new BABYLON.InterpolateValueAction(                  //camera rotate
            BABYLON.ActionManager.OnLeftPickTrigger, camera, 'target', scene.meshes[i].position, 300,
            new BABYLON.PredicateCondition(scene.meshes[i].actionManager, () => pressedKeys["70"])));

        scene.meshes[i].actionManager.registerAction(new BABYLON.InterpolateValueAction(                  //zoom
            BABYLON.ActionManager.OnLeftPickTrigger, camera, 'radius', 1.5, 300,
            new BABYLON.PredicateCondition(scene.meshes[i].actionManager, () => pressedKeys["70"])));
    }


    //--------------------------Planet Animations------------------------
    //create animations for planet rotations
    var rotationAnims = new BABYLON.AnimationGroup("rotationGroup")
    rotatePlanet(earth, 22.5, 1, rotationAnims)
    rotationAnims.normalize()
    rotationAnims.play(true)


    //create animations for planet orbits
    var orbitAnims = new BABYLON.AnimationGroup("orbitGroup")
    var earthTrack = animOrbit(earth, 0.41671, 365, 10, orbitAnims, scene)
    orbitAnims.normalize()
    orbitAnims.play(true)



    //----------------------------GUI-------------------------------
    //create Babylon GUI for speed controls in top left
    var advancedTexture = BGUI.AdvancedDynamicTexture.CreateFullscreenUI("UI")
    advancedTexture.layer.layerMask = 2
    advancedTexture.renderScale = 1

    //speed control stack panel
    var panel = new BGUI.StackPanel()
    panel.width = (window.innerWidth / 3)+ "px"
    panel.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_LEFT
    panel.verticalAlignment = BGUI.Control.VERTICAL_ALIGNMENT_TOP
    advancedTexture.addControl(panel)

    //converts the slider's value into a readable string
    const speedString = function(sliderValue) {

        if (sliderValue === 0){
            return "Paused"
        }
        var conversion = "";
        if (sliderValue === 730){
            conversion = "1 Earth year"
        }
        else if (sliderValue > 60){
            conversion = Math.round(sliderValue / 2 / 30 * 100) / 100 + " Earth months"
        }
        else if (sliderValue === 60){
            conversion = "1 Earth month"
        }
        else if (sliderValue > 14){
            conversion = Math.round(sliderValue / 2 / 7 * 10) / 10 + " Earth weeks"
        }
        else if (sliderValue === 14){
            conversion = "1 Earth week"
        }
        else if (sliderValue === 2){
            conversion = "1 Earth day"
        }
        else {
            conversion = Math.round(sliderValue / 2 * 10) / 10 + " Earth days"
        }
        return "Speed: " + Math.round(sliderValue * 43200) + "x   |   1 second = " + conversion
    }

    //text for and slider for the speed
    var header = new BGUI.TextBlock()
    header.text = speedString(1)
    header.height = "40px"
    header.widthInPixels = panel.widthInPixels
    header.color = "white"
    header.fontSize = 16
    header.fontFamily = 'Roboto'
    header.fontStyle = 'Light 100'
    header.textHorizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_CENTER
    header.marginTop = "10px"
    panel.addControl(header)
    
    var slider = new BGUI.Slider()
    slider.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_CENTER
    slider.minimum = 0
    slider.maximum = 730
    slider.color = "orange"
    slider.background = "#050505"
    slider.value = 1
    slider.height = "20px"
    slider.width = (window.innerWidth / 3 - 50)+ "px"
    slider.onValueChangedObservable.add(function(value) {
        header.text = speedString(value)
        orbitAnims.speedRatio = value

        //cap the rotation speed at 20pi radians/sec
        if (value <= 40) {
            rotationAnims.speedRatio = value;
        }
        else {
            rotationAnims.speedRatio = 40;
        }
    });
    panel.addControl(slider);


    //-----------------Dragging Controls---------------
    //Plane on xz axis for projection of mouse rays when dragging
    var orbitPlane = BABYLON.MeshBuilder.CreateGround("orbitPlane", {width:500, height:500}, scene);
    orbitPlane.isPickable = true
    orbitPlane.isBlocker = false
    orbitPlane.isVisible = false
    scene.pointerDownPredicate = function(mesh) {
        return mesh.isPickable;
    }

    //Uses orbitPlane to pick mouse position
    var startingPoint;
    var currentMesh;
    var getPickPosition = function () {
        var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == orbitPlane; });
        if (pickinfo.hit) {
            return pickinfo.pickedPoint;
        }
        return null;
    }
    //enable dragging controls
    var pointerDragDown = function (mesh) {
        currentMesh = mesh;
        startingPoint = getPickPosition();
        if (startingPoint) {                
            setTimeout(function () {
                camera.detachControl(canvas)
            }, 0);
        }
    }
    //disable dragging controls
    var pointerUp = function () {
        if (startingPoint) {
            camera.attachControl(canvas, true)
            startingPoint = null
            return
        }
    }
    //when cursor moves
    var pointerMove = function () {
        if (!startingPoint) {
            return
        }
        var current = getPickPosition()
        if (!current) {
            return
        }

        //check which quadrant the mouse is in and set the appropriate section of ellipse to check for it
        var startIndex, endIndex
        if (current.x <=0 && current.z >= 0){
            startIndex = 0
            endIndex = currentMesh.ellipse.length / 4
        }
        else if (current.x <=0 && current.z <= 0){
            startIndex = currentMesh.ellipse.length / 4
            endIndex = currentMesh.ellipse.length / 2
        }
        else if (current.x > 0 && current.z <= 0){
            startIndex = currentMesh.ellipse.length / 2
            endIndex = 3 * currentMesh.ellipse.length / 4
        }
        else {
            startIndex = 3 * currentMesh.ellipse.length / 4
            endIndex = currentMesh.ellipse.length
        }

        //check for closest point to mouse on orbit path
        var closestFrame = startIndex
        var closestDist = current.subtract(currentMesh.ellipse[closestFrame]).length()
        for (var i = startIndex + 1; i < endIndex; i++){
            if (current.subtract(currentMesh.ellipse[i]).length() <= closestDist){
                closestDist = current.subtract(currentMesh.ellipse[i]).length()
                closestFrame = i
            }
        }
        orbitAnims.goToFrame(closestFrame)
    }

    //call methods when mouse clicked or dragged
    scene.onPointerObservable.add((pointerInfo) => {      		
        switch (pointerInfo.type) {
			case BABYLON.PointerEventTypes.POINTERDOWN:
                //if for a drag on a planet, call the method
				if(pointerInfo.pickInfo.hit && scene.planets.includes(pointerInfo.pickInfo.pickedMesh) && pressedKeys["68"]) {
                    pointerDragDown(pointerInfo.pickInfo.pickedMesh)
                }
				break
			case BABYLON.PointerEventTypes.POINTERUP:
                pointerUp()
				break
			case BABYLON.PointerEventTypes.POINTERMOVE:          
                pointerMove()
				break
        }
    });



    // change eccentricity
    // var e = 0.01671;
    // setInterval(function(){
    //     e += .005;
    //     var path = orbitPath(e, 365, 10);
    //     earthTrack = BABYLON.Mesh.CreateLines(null, path, null, null, earthTrack);
    //     earth.ellipse = path;
    //     console.log(path);
    // }, 2000);


    //--------------Debugging Axis----------------
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
    //localAxes(4, earth);

    //loading screen
    engine.displayLoadingUI();
    scene.executeWhenReady(function() {
        engine.hideLoadingUI();
    })

    return scene;
}

var scene = createScene()
engine.runRenderLoop(function () {    

    //planet rotations and movements
    for (var i = 0; i < scene.planets.length; i++){
        scene.planets[i].rotate(BABYLON.Axis.Y, scene.planets[i].rotYLocal - scene.planets[i].prevRotYLocal, BABYLON.Space.LOCAL)
        scene.planets[i].prevRotYLocal = scene.planets[i].rotYLocal

        scene.planets[i].setAbsolutePosition(scene.planets[i].ellipse[Math.floor(scene.planets[i].orbitSegment)])
    }
    
    scene.render()
});

window.addEventListener("resize", function () {
    engine.resize()
});


//-----------Panel Events--------------
var controlsCard = document.getElementsByClassName('controlsCard')[0]
controlsCard.addEventListener('click', startSim)

function startSim() {
    document.getElementById('canvas').style.filter = 'blur(0px)'

    TweenMax.to('.controlsCard', 2, {
        opacity:0, 
        y:'-112%', 
        ease:Power2.easeOut
    })

    controlsCard.removeEventListener('click', startSim)

    voiceover.play()

    //set audio slider max to voiceover duration
    audioSlider.max = voiceover.duration
    
}

//--------------Audioplayer----------------
var playButton = document.getElementById("audioButton")
playButton.addEventListener('click', pauseAudio)

function pauseAudio() {
    if (isPlaying) {
        voiceover.pause()
        isPlaying = false
        playButton.src = require('../../simAssets/audioIcons/play button.png')
    }
    else {
        voiceover.play()
        isPlaying = true
        playButton.src = require('../../simAssets/audioIcons/pause button.png')
    }
}

var audioSlider = document.getElementById("audioSlider")
var audioDuration = document.getElementById("audioDuration")

//use html audioSlider to control voiceover duration
audioSlider.addEventListener('input', function() {  
    voiceover.currentTime = audioSlider.value
})

//method to convert seconds to minutes and seconds
function getMinutes(time) {
    var minutes = Math.floor(time / 60)
    var seconds = time % 60
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds
}

//when audio slider change, update the audio duration
audioSlider.addEventListener('input', function() {
    audioDuration.innerHTML = getMinutes(audioSlider.value)
})


//every second, run the loop
setInterval(function () {

    //update the slider location
    audioSlider.value = voiceover.currentTime

    //if audio is at the end, call pauseAudio
    if (voiceover.currentTime >= voiceover.duration) {
        isPlaying = true
        pauseAudio()
    }

    audioDuration.innerHTML = getMinutes(audioSlider.value)




    //------------------Scene Events-------------------
    //add major and minor axis
    if (voiceover.currentTime > 43 && !(scene.getMeshByName("majorAxis"))) {

        var earthPath = scene.getMeshByName("earth").ellipse

        var majorAxis = BABYLON.MeshBuilder.CreateLines("majorAxis", {points: [
            earthPath[0], earthPath[Math.floor(earthPath.length / 2)]
        ]}, scene)
        majorAxis.color = BABYLON.Color3.Blue()

        var minorAxis = BABYLON.MeshBuilder.CreateLines("minorAxis", {points: [
            earthPath[16080], earthPath[earthPath.length - 16080]
        ]}, scene)
        minorAxis.color = BABYLON.Color3.Green()
    }

    //add major and minor axis labels
    if (voiceover.currentTime > 47 && !(scene.getMeshByName("majorAxisLabel"))) {
        
        //add BGUI label with advanced dynamic texture to label major axis
        var majorAxisLabel = BABYLON.Mesh.CreatePlane("majorAxisLabel", 2, scene);
        majorAxisLabel.position = new BABYLON.Vector3(-.3, 0, -12.5)
        majorAxisLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)
        majorAxisLabel.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.GLOBAL)

        var majorAxisTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(majorAxisLabel);

        var majorAxisText = new BGUI.TextBlock();
        majorAxisText.text = "major axis";
        majorAxisText.color = "blue";
        majorAxisText.fontSize = 162;
        majorAxisText.fontFamily = 'Roboto'
        majorAxisTexture.addControl(majorAxisText); 

        //add BGUI label with advanced dynamic texture to label minor axis
        var minorAxisLabel = BABYLON.Mesh.CreatePlane("minorAxisLabel", 2, scene);
        minorAxisLabel.position = new BABYLON.Vector3(-7.4, 0, -3.85)
        minorAxisLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)

        var minorAxisTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(minorAxisLabel);

        var minorAxisText = new BGUI.TextBlock();
        minorAxisText.text = "minor axis";
        minorAxisText.color = "green";
        minorAxisText.fontSize = 162;
        minorAxisText.fontFamily = 'Roboto'
        minorAxisTexture.addControl(minorAxisText);
    }

    //create focus points
    if (voiceover.currentTime > 55 && !(scene.getMeshByName("focusPoint"))) {

        var c = 0.41671 * 10

        //create focal point
        var focusSphere = new BABYLON.Mesh.CreateSphere("focusPoint", 32, .4, scene)
        focusSphere.position = new BABYLON.Vector3(0, 0, -2 * c)

        var focusMat = new BABYLON.StandardMaterial("focusMat", scene)
        focusMat.emissiveColor = new BABYLON.Color3(.7, .7, .7)
        focusSphere.material = focusMat
    }

    //destroy focus points
    if ((voiceover.currentTime > 70 || voiceover.currentTime < 55) && scene.getMeshByName("focusPoint") != null) {
        scene.removeMesh(focusSphere)
        scene.getMeshByName("focusPoint").dispose()
    }

    //create perihelion and aphelion labels
    if (voiceover.currentTime > 82 && !(scene.getMeshByName("perihelionLabel"))) {

        //add BGUI label with advanced dynamic texture to label perihelion
        var perihelionLabel = BABYLON.Mesh.CreatePlane("perihelionLabel", 2, scene);
        perihelionLabel.position = new BABYLON.Vector3(0, 0, 7)
        perihelionLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)
        perihelionLabel.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.GLOBAL)
        var perihelionTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(perihelionLabel);
        var perihelionText = new BGUI.TextBlock();
        perihelionText.text = "Perihelion";
        perihelionText.color = "white";
        perihelionText.fontSize = 162;
        perihelionText.fontFamily = 'Roboto'
        perihelionTexture.addControl(perihelionText);

        //add BGUI label with advanced dynamic texture to label aphelion
        var aphelionLabel = BABYLON.Mesh.CreatePlane("aphelionLabel", 2, scene);
        aphelionLabel.position = new BABYLON.Vector3(-.025, 0, -15.2)
        aphelionLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)
        aphelionLabel.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.GLOBAL)
        var aphelionTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(aphelionLabel);
        var aphelionText = new BGUI.TextBlock();
        aphelionText.text = "Aphelion";
        aphelionText.color = "white";
        aphelionText.fontSize = 162;
        aphelionText.fontFamily = 'Roboto'
        aphelionTexture.addControl(aphelionText);
    }

    
    //destroy axis labels
    if ((voiceover.currentTime > 90 || voiceover.currentTime < 47) && scene.getMeshByName("majorAxisLabel") != null) {
        scene.removeMesh(majorAxisLabel)
        scene.removeMesh(minorAxisLabel)

        scene.getMeshByName("majorAxisLabel").dispose()
        scene.getMeshByName("minorAxisLabel").dispose()
    }

    //create the shaded sectors
    if(voiceover.currentTime > 90 && !(scene.getMeshByName("rightSector"))) {

        var earthPath = scene.getMeshByName("earth").ellipse
        var rightSectorPoints = [new BABYLON.Vector2(0, 0)], leftSectorPoints = [new BABYLON.Vector2(0, 0)]

        //get the points for the right sector under 0
        for (var i = earthPath.length - Math.floor(earthPath.length / 24); i < earthPath.length; i++) {   
            rightSectorPoints.push(new BABYLON.Vector2(earthPath[i].x, earthPath[i].z))
        }
        //get the points for the right sector over 0
        for (var i = 0; i <= Math.floor(earthPath.length / 24); i++) {
            rightSectorPoints.push(new BABYLON.Vector2(earthPath[i].x, earthPath[i].z))
        }
        rightSectorPoints.push(new BABYLON.Vector2(0, 0))


        //get the points for the left sector
        for (var i = Math.floor(earthPath.length * 11 / 24); i <= Math.floor(earthPath.length * 13 / 24); i++) {
            leftSectorPoints.push(new BABYLON.Vector2(earthPath[i].x, earthPath[i].z))
        }
        leftSectorPoints.push(new BABYLON.Vector2(0, 0))

        //create the right sector
        var rightSector = new BABYLON.PolygonMeshBuilder("rightSector", rightSectorPoints, scene, earcut).build()
        var sectorMat = new BABYLON.StandardMaterial("rightSector", scene)
        sectorMat.emissiveColor = new BABYLON.Color3(1, 0, 0)
        rightSector.material = sectorMat

        //create the left sector
        var leftSector = new BABYLON.PolygonMeshBuilder("leftSector", leftSectorPoints, scene, earcut).build()
        leftSector.material = sectorMat

    }


}, 1000)
