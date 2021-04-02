import * as BABYLON from 'babylonjs';

//const BABYLON = window.BABYLON;

//when browser is loaded, call this function
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

        var box = BABYLON.Mesh.CreateBox("Box", 4.0, scene);
                
        var camera = new BABYLON.ArcRotateCamera("arcCamera", BABYLON.Tools.ToRadians(45), BABYLON.Tools.ToRadians(45), 10, 
        box.position, scene);
                
        camera.attachControl(canvas, true);                     

        var light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0,10,0), scene);
        light.parent = camera;          //makes the light move with the camera
        light.diffuse = new BABYLON.Color3(1,1,1);          //sets its color

        return scene;
    }

    var scene = createScene();
    engine.runRenderLoop(function () {      
        scene.render();
    });
});
