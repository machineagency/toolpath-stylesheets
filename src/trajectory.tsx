import React from 'react';
import ReactDOM from 'react-dom';
import {useEffect, useRef} from "react";
import { norm, number, dot } from "mathjs";

import * as Plot from "@observablehq/plot";

interface SegmentPlotProps {
    segments: Segment[];
}

function SegmentPlot({ segments }: SegmentPlotProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (segments === undefined) return;
        const plot = Plot.plot({
          grid: true,
          marks: [
            Plot.dot(segments, {
                x: (d: Segment) => d.coords.x,
                y: (d: Segment) => d.coords.y
            })
          ]
        });
        if (containerRef.current) {
            containerRef.current.append(plot);
        }
        return () => plot.remove();
      }, [segments]);

    return <div ref={containerRef}/>;
}

function TrajectoryWindow() {
    let segments = makeTestSegment(20);
    let listItems = segments.map((segment: Segment, index: number) => {
        return <li key={index}>
            {segment.coords.x}, {segment.coords.y}
        </li>
    })
    return (<div>
        <h1>Test Segments</h1>
        <SegmentPlot segments={segments}></SegmentPlot>
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
    aMax: number
}

interface KinematicLimits {
    vMax: Coords,
    aMax: Coords,
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

interface PlanTriplets {
    prePlanned: Segment[],
    halfPlanned: LineSegment[],
    fullyPlanned: LineSegment[]
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
        aMax: amax
    }
}

function kinematicLimits(maxVelocity: Coords, maxAcceleration: Coords, 
         junctionSpeed: number, junctionDeviation: number): KinematicLimits {
    return {
        vMax: maxVelocity,
        aMax: maxAcceleration,
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

function planTriplets(prePlanned: Segment[], halfPlanned: LineSegment[], fullyPlanned: LineSegment[]): PlanTriplets {
    return {
        prePlanned: prePlanned,
        halfPlanned: halfPlanned,
        fullyPlanned: fullyPlanned
    }
}

function fromGeo(parent: number, v0: number, v1: number, start: Coords, end: Coords, k1: KinematicLimits): LineSegment {
    let startVel = Math.abs(v0);
    let endVel = Math.abs(v1);
    let delta = coords(end.x - start.x, end.y - start.y)

    let length = Math.sqrt((end.x - start.x)**2 + (end.y - start.y)**2);
    let profile = normalize(startVel, endVel, null, null, length) as FirstOrder;
    let unit = coords(delta.x / length, delta.y / length);
    return lineSegment(parent, start, end, unit, profile, limitVector(unit, k1.aMax));

}

function limitVector(v: Coords, l: Coords): number {
    let absV = coords(Math.abs(v.x) / l.x, Math.abs(v.y) / l.y);
    let max = Math.max(absV.x, absV.y);
    return 1 / max;
}


function normalize(v0: number | null, v: number | null, a: number | null, t: number | null, x: number | null): FirstOrder | null {
    let arr = [v0, v, a, t, x];
    if ((arr.length - arr.filter(Number).length) != 2) {
        return null;
    }

    if (v0 === null) {
        if (v === null) {
            let startVel = x! / t! - a! * t! / 2;
            return firstOrder(startVel, startVel + a! * t!, a!, t!, x!);
        } else if (a === null) {
            let startVel = 2 * x! / t! - v;
            return firstOrder(startVel, v, (v - startVel) / t!, t!, x!);
        } else if (t === null) {
            let startVel = Math.sqrt(v**2 - 2 * a * x!);
            return firstOrder(startVel, v, a, (v - startVel) / a, x!);
        } else if (x === null) {
            let startVel = v - a * t;
            return firstOrder(startVel, v, a, t, t * (startVel + v) / 2);
        }
    }
    if (v === null) {
        if (a === null) {
            let endVel = 2 * x! / t! - v0!;
            return firstOrder(v0!, endVel, (endVel - v0!) / t!, t!, x!);
        } else if (t === null) {
            let endVel = Math.sqrt(v0!**2 + 2 * a * x!);
            return firstOrder(v0!, endVel, a, (endVel - v0!) / a, x!);
        } else {
            let endVel = v0! + a * t;
            return firstOrder(v0!, endVel, a, t, t * (v0! + endVel) / 2);
        }
    }
    if (a === null) {
        if (t === null) {
            let time = 2 * x! / (v0! + v);
            return firstOrder(v0!, v, (v - v0!) / time, time, x!);
        } else if (x === null) {
            let acc = (v - v0!) / t;
            return firstOrder(v0!, v, acc, t, t * (v0! + v) / 2);
        }
    }
    let time = (v - v0!) / a!;
    return firstOrder(v0!, v, a!, time, time * (v0! + v) / 2);
}

function makeTestSegment(n: number): PlanTriplets {
    let segments: Segment[] = [];
    let arr: number[] = linspace(0, Math.PI / 2, n);

    arr.forEach(function (val: number, index: number) {
        let seg = segment(index + 1, 2.0, 2.0, coords(Math.cos(val), Math.sin(val)));
        segments.push(seg);
    });

    let end: Segment = segment(n + 1, 3.0, 3.0, coords(0, -5));
    segments.push(end);

    let limits = kinematicLimits(coords(1.0, 1.0), coords(1.0, 1.0), 1e-3, 1e-2);
    let startLocation = coords(0, 0);
    let plannerSegments: LineSegment[] = [];

    segments.forEach(function (s: Segment) {
        let endLocation = s.coords;
        let segmentNorm = number(norm([startLocation.x - endLocation.x, startLocation.y - endLocation.y]));

        if (segmentNorm >= 1e-18) {
            let segment = fromGeo(s.moveId, s.startVelocity, s.endVelocity, startLocation, endLocation, limits);
            plannerSegments.push(segment);
            startLocation = endLocation;
        }
    })

    let plannedSegments = [];
    


    return planTriplets(segments, plannerSegments, []);
}

function forwardPass(segments: LineSegment[], v0: number, limits: KinematicLimits): LineSegment[] {
    if (segments.length == 0) {
        return [];
    }
    let prev: LineSegment = segments[0];
    segments.forEach(function (s: LineSegment) {
        let p = s.profile;
        let v = limitVector(s.unit, limits.vMax);

        let jv = computeJunctionVelocity(prev, s, limits);
    })
}

function computeJunctionVelocity(p: LineSegment, s: LineSegment, limits: KinematicLimits): number | null {
    let junctionCos = -1 * dot([s.unit.x, s.unit.y], [p.unit.x, p.unit.y]);

    if (junctionCos > 0.9999) {
        return limits.junctionSpeed;
    } else if (junctionCos < -0.9999) {
        return null;
    } else {
        let junctionVect = coords(s.unit.x - p.unit.x, s.unit.y - p.unit.y);
        junctionVect.x /= Math.sqrt(dot([junctionVect.x, junctionVect.y], [junctionVect.x, junctionVect.y]));

    }
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