import * as BABYLON from 'babylonjs';

/**
 * 
 * @param {Mesh} planet - The Mesh for which to perform the rotation on
 * @param {number} tilt - The angle of tilt of the planet in degrees
 * @param {number} dayLength - The length of one rotation period of the planet (in Earth days)
 * @param {Scene} scene - The scene for which this animation occurs
 * @param {boolean} loops - Whether or not this animation will loop forever
 * @returns An animatable representing the rotation of the passed planet, at the rate of 1 second = 12 hrs
 */
const rotatePlanet = function (planet, tilt, dayLength, scene, loops = true) {

    //tilt on axis
    planet.rotation = new BABYLON.Vector3(tilt * Math.PI / 180, 0, Math.PI);

    planet["rotYLocal"] = 0;
    planet["prevRotYLocal"] = 0;

    var frameRate = 30;
    //create planet's rotation animation             
    var planetRotAnim = new BABYLON.Animation(planet.name + "Rotation", "rotYLocal", frameRate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var planetRotKeys = [];
    planetRotKeys.push({
        frame: 0,
        value: 0
    });
    planetRotKeys.push({
        frame: frameRate,
        value: Math.PI / dayLength
    });
    planetRotKeys.push({
        frame: 2 * frameRate,
        value: 2 * Math.PI / dayLength
    });

    planetRotAnim.setKeys(planetRotKeys);
    var animatable = scene.beginDirectAnimation(planet, [planetRotAnim], 0, 2 * frameRate, loops, 1);

    return animatable;
};

const calcOrbitPath = function() {
    
};


export {rotatePlanet, calcOrbitPath};