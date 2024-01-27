import React from 'react';
import ReactDOM from 'react-dom';


function TrajectoryWindow() {
    let segments = makeTestSegment(20);
    let listItems = segments.map((segment: Segment, index: number) => {
        return <li key={index}>
            {segment.coords.x}, {segment.coords.y}
        </li>
    })
    return (<div>
        <h1>Test Segments</h1>
        <ul>
            {listItems}
        </ul>
    </div>)
};

function returnRandomNumber() {
    return (Math.random() * 10).toString();
};

interface Coords {
    x: number,
    y: number
}

interface Segment {
    moveId: number,
    startVelocity: number,
    endVelocity: number,
    coords: {
        x: number,
        y: number
    }
}

interface LineSegment {
    parent: number,
    start: Coords,
    end: Coords,
    unit: Coords,
    profile: FirstOrder,
    amax: number
}

interface Kinematics {
    maxVelocity: number,
    maxAcceleration: number,
    junctionSpeed: number,
    junctionDeviation: number
}

interface FirstOrder {
    v0: number,
    v: number,
    a: number,
    t: number,
    x: number
}

function coords(x: number, y: number): Coords {
    return {
        x: x,
        y: y
    }
}
function segment(moveId: number, startVelocity: number, endVelocity: number, 
        coords: Coords): Segment {
    return {
        moveId: moveId,
        startVelocity: startVelocity,
        endVelocity: endVelocity,
        coords: coords
    }
}

function lineSegment(parent: number, start: Coords, end: Coords, unit: Coords, 
                     profile: FirstOrder, amax: number): LineSegment {
    return {
        parent: parent,
        start: start,
        end: end,
        unit: unit,
        profile: profile,
        amax: amax
    }
}

function kinematics(maxVelocity: number, maxAcceleration: number, 
         junctionSpeed: number, junctionDeviation: number): Kinematics {
    return {
        maxVelocity: maxVelocity,
        maxAcceleration: maxAcceleration,
        junctionSpeed: junctionSpeed,
        junctionDeviation: junctionDeviation
    }
}

function firstOrder(initialVelocity: number, finalVelocity: number, acceleration: number,
         timeDuration: number, length: number): FirstOrder {
    return {
        v0: initialVelocity,
        v: finalVelocity,
        a: acceleration,
        t: timeDuration,
        x: length
    }
}

function fromGeo(parent: number, v0: number, v1: number, start: Coords, end: Coords, k1: Kinematics): LineSegment {
    let startVel = Math.abs(v0);
    let endVel = Math.abs(v1);

    let delta = Math.sqrt((end.x - start.x)**2 + (end.y - start.y)**2);

}


function normalize(v0: number | null, v: number | null, a: number | null, t: number | null, x: number | null): FirstOrder | null {
    let arr = [v0, v, a, t, x];
    if ((arr.length - arr.filter(Number).length) != 2) {
        return null;
    }

    if (v0 === null) {
        if (v === null) {
            //@ts-expect-error
            let startVel = x / t - a * t / 2;
            //@ts-expect-error
            return firstOrder(startVel, startVel + a * t, a, t, x);
        }
    }
}

function makeTestSegment(n: number): Segment[] {
    let segments: Segment[] = [];
    let arr: number[] = linspace(0, Math.PI / 2, n);

    arr.forEach(function (val: number, index: number) {
        let seg = segment(index + 1, 2.0, 2.0, coords(Math.cos(val), Math.sin(val)));
        segments.push(seg);
    });

    let end: Segment = segment(n + 1, 3.0, 3.0, coords(0, -5));
    segments.push(end);
    return segments;
}

function linspace(start: number, stop: number, cardinality: number): number[] {
    let arr: number[] = [];
    let step = (stop - start) / (cardinality - 1);
    for (let i = 0; i < cardinality; i++) {
        arr.push(start + (step * i));
    }

    return arr;
}

ReactDOM.render(
    <TrajectoryWindow></TrajectoryWindow>,
    document.getElementById("app")
);