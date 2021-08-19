import { h, render, Component } from 'preact'
import './css/sim-card.css'


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

    <SimCard title="Planetary Orbits" grades="8-10" link="../__/simulations/planetaryOrbit/planetary-orbit.html" 
    img={require("./thumbnails/nike_shoe.png")} color="#00ff00">
        Desc: This is a test rly long desc cuz I do not like to sdjflk sdlk kajshfjk sf dsjfkjsd sdgj jkg hfd dfjgdkjfg 
        ddkfj gd fjgh jkdf fdg kjdfj.
    </SimCard>

, document.body)