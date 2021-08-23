import { h, render, Fragment } from 'preact'
/** @jsx h */

import './css/sim-card.css'


/**
 * @typedef {Object} SimulationDetails
 * @property {string} title - The title of the simulation
 * @property {string} creator - The creator(s) of the simulation
 * @property {string} description - A short description of the simulation (under 180 characters)
 * @property {string} grades - The range of grades levels that the simulation is suitable for
 * @property {string} fileLocation - The location of the simulation's start HTML file (relative to this file)
 * @property {any} imageLocation - The path to the thumbnail image of the simulation (relative to this file) passed into require().
 * The recommended image aspect ratio is 16:9.
 * @property {string} color - The color to use for the simulation's card
**/

/**
 * Add new simulations' details here
 * @type {Array.<SimulationDetails>} - An array of SimulationDetails objects
**/
var simulations = [
    {
        title: "Planetary Orbit",
        creator: "Varun Unnithan",
        description: "Learn about the shape a planet's orbit follows, and the features of its orbit.",      
        grades: "8 - 11",
        fileLocation: "../simulations/planetaryOrbit/planetary-orbit.html",
        imageLocation: require("./thumbnails/planetaryOrbit.png"),
        color: "#ed7117"        //ff8c00
    },
    
]

//add underscore to sim links bc for some reason it doesn't work without it
for (let i = 0; i < simulations.length; i++) {
    if (simulations[i].fileLocation.startsWith("../")) {
        simulations[i].fileLocation = simulations[i].fileLocation.slice(0, 3) + "__/" + simulations[i].fileLocation.slice(3)
    }
}

function SimCard(props) {
    return (
        <div class="container">
            <div class="card" style={`--color: ${props.color};`}>
                <div class="imgBx">
                    <img src={props.img} />
                </div>

                <div class="contentBx">
                    <h2>{props.title}</h2>
                    <div class="desc">
                        <p>
                            {props.children}
                        </p>
                    </div>

                    <div class="grades">
                        <h3>Grades: {props.grades}</h3>
                    </div>

                    <a href={props.link} target="_blank" style={`--color: ${props.color};`}>Start</a>
                </div>
            </div>
        </div>
    )
}

render(
    <Fragment>
        {simulations.map(sim => (
            <SimCard title={sim.title} img={sim.imageLocation} color={sim.color} grades={sim.grades} 
                link={sim.fileLocation}>
                    {sim.description}
            </SimCard>
        ))}
    </Fragment>
, document.getElementById('root'))