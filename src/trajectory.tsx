import React, { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import ReactDOM from 'react-dom';
import {useEffect, useRef} from "react";
import { norm, number, dot } from "mathjs";
import { IR } from './type-utils';
import { lowerEBB, lowerGCode, lowerSBP } from './ir';
import { toolpath, Toolpath } from './type-utils';
import { exampleToolpaths } from './example-toolpaths';

import * as Plot from "@observablehq/plot";

import './trajectory.css'

const DEBUG: boolean = false;

interface TrajectoryWindowProps {
    toolpath: Toolpath | null;
    min: number;
    max: number;
}

interface DashboardSettingsProps {
    onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface RangeSliderProps {
    max: number;
    onChange: (newRange: number[] | number) => void;
}

interface SegmentPlotProps {
    segments: Segment[];
    min: number;
    max: number;
}

interface ProfilePlotProps {
    lineSegments: LineSegment[];
    min: number;
    max: number;
}

const TOOLPATH_TABLE: Record<string, Toolpath> = {
    testToolpath: toolpath("sbp", ["M2, 0, 0", "M2, 10, 10"]),
    rectangle: toolpath("sbp", ["M2, 0, 0", "M2, 10, 0", "M2, 10, 5", "M2, 0, 5", "M2, 0, 0"]),
    triangle: toolpath("sbp", ["M2, 0, 0", "M2, 10, 0", "M2, 5, 5", "M2, 0, 0"]),
    star: toolpath("sbp", ["M2, 50, 0", "M2, 65, 35", "M2, 100, 35", "M2, 75, 60", "M2, 90, 95", "M2, 50, 75",
                   "M2, 10, 95", "M2, 25, 60", "M2, 0, 35", "M2, 35, 35", "M2, 50, 0"]),
    wave: exampleToolpaths.gCodeWave,
    box: exampleToolpaths.ebbBox,
    signature: exampleToolpaths.ebbSignature,
    gears: exampleToolpaths.gears


};

function DashboardSettings({ onSelect }: DashboardSettingsProps) {
    const toolpathsOptionElements = [
        <option value="" key="blank">Select a Toolpath</option>,
        Object.keys(TOOLPATH_TABLE).map(tpName => {
        return <option value={tpName} key={tpName}>{tpName}</option>
    })];
    return (
        <div className="dashboard-settings">
            <select onChange={onSelect} name="toolpath-select" id="toolpath-select">
                {toolpathsOptionElements}
            </select>
        </div>
    );
}

function RangeSlider({ max, onChange }: RangeSliderProps) {
    const [range, setRange] = useState<number[]>([0, max]);

    const handleRangeChange = (newRange: number | number[]) => {
        setRange(newRange as number[]);
        onChange(newRange);
    };

    useEffect(() => {
        if (max) {
            setRange([0, max]);
        }
    }, [max]);

    return (
        <div className="range-slider">
            <Slider
              range
              min={0}
              max={max}
              value={range}
              onChange={handleRangeChange}
            />
            <div className="range-label">
                Range: {range[0]} - {range[1]}
            </div>

        </div>
    )
}

function SegmentPlot({ segments, min, max }: SegmentPlotProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (segments === undefined) return;
        const plot = Plot.plot({
          grid: true,
          marks: [
            Plot.dot(segments, {
                x: (d: Segment) => d.coords.x,
                y: (d: Segment) => d.coords.y,
                r: 1
            }),
            Plot.line(segments, {
                filter: (_, i) => i <= max && i >= min,
                x: (d: Segment) => d.coords.x,
                y: (d: Segment) => d.coords.y,
                stroke: "red"
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

function ProfilePlot({ lineSegments, min, max }: ProfilePlotProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (lineSegments === undefined) return;
        let cumulativeTimes: (number | null)[] = [];
        let soFar = 0;
        lineSegments.forEach((ls: LineSegment) => {
            let newTime = soFar + ls.profile.t;
            cumulativeTimes.push(soFar);
            cumulativeTimes.push(newTime);
            cumulativeTimes.push(null);
            soFar = newTime;
        });

        cumulativeTimes = cumulativeTimes.slice(min, max);
        const vPairs = lineSegments.map((ls: LineSegment) => [ls.profile.v0, ls.profile.v, null]).flat().slice(min, max);
        const aPairs = lineSegments.map((ls: LineSegment) => [ls.profile.a, ls.profile.a, null]).flat().slice(min, max);

        const plot = Plot.plot({
            x: {
                grid: true,
                label: "time (s)",
            },
            y: {
              grid: true,
              label: "mm / s ( / s)"
            },
            marks: [
              Plot.line(cumulativeTimes, {
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => vPairs[i],
                stroke: "#4e79a7"
              }),
              Plot.text(cumulativeTimes, Plot.selectLast({
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => vPairs[i],
                text: (_) => "Velocity",
                lineAnchor: "top",
                dy: -5
              })),
              Plot.line(cumulativeTimes, {
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => aPairs[i],
                stroke: "#e15759"
              }),
              Plot.text(cumulativeTimes, Plot.selectLast({
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => aPairs[i],
                text: (_) => "Acceleration",
                lineAnchor: "top",
                dy: -5
              }))
            ]
          })
        if (containerRef.current) {
            containerRef.current.append(plot);
        }
        return () => plot.remove();
      }, [lineSegments]);

    return <div ref={containerRef}/>;
}

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

interface TrajectoryPasses {
    locations: Segment[],
    prePlanned: LineSegment[],
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

function planTriplets(locations: Segment[], prePlanned: LineSegment[], halfPlanned: LineSegment[], fullyPlanned: LineSegment[]): TrajectoryPasses {
    return {
        locations: locations,
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
    if ((arr.length - arr.filter(element => element !== null && !isNaN(element)).length) != 2) {
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

/*
function makeTestSegment(n: number): TrajectoryPasses {
    let segments: Segment[] = [segment(0, 1.0, 1.0, coords(1.0, 0.0))];
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
    });

    let halfPlanned = forwardPass(plannerSegments, 0, limits);

    let plannedSegments: LineSegment[] = [];

    planSegments(plannerSegments, limits).forEach(function (s: LineSegment) {
        plannedSegments.push(s);
    });

    return planTriplets(segments, plannerSegments, halfPlanned, plannedSegments);
}
*/

function main(tp: Toolpath): TrajectoryPasses {
    let irs;
    // handles lowering
    if (tp.isa == "ebb") {
        irs = lowerEBB(tp);
    } else if (tp.isa == "sbp") {
        irs = lowerSBP(tp);
    } else {
        irs = lowerGCode(tp);
    }
    //console.log(irs);
    let segments: Segment[] = [];
    irs.forEach(function (ir: IR, index: number) {
        let seg = segment(index, 1.0, 1.0, coords(ir.args.x!, ir.args.y!));
        segments.push(seg);
    });
    let limits = kinematicLimits(coords(1.0, 1.0), coords(1.0, 1.0), 1e-3, 1e-2); // can change later
    let startLocation = segments[0].coords;
    let plannerSegments: LineSegment[] = [];

    segments.forEach(function (s: Segment) {
        let endLocation = s.coords;
        let segmentNorm = number(norm([startLocation.x - endLocation.x, startLocation.y - endLocation.y]));

        if (segmentNorm >= 1e-18) {
            let segment = fromGeo(s.moveId, s.startVelocity, s.endVelocity, startLocation, endLocation, limits);
            plannerSegments.push(segment);
            startLocation = endLocation;
        }
    });

    let halfPlanned = forwardPass(plannerSegments, 0, limits);

    let plannedSegments: LineSegment[] = [];

    planSegments(plannerSegments, limits).forEach(function (s: LineSegment) {
        plannedSegments.push(s);
    });

    return planTriplets(segments, plannerSegments, halfPlanned, plannedSegments);
}

function planSegments(segs: LineSegment[], k1: KinematicLimits, v0: number = 0.0): LineSegment[] {
    return backwardPass(forwardPass(segs, v0, k1)).flat();
}

function backwardPass(segments: LineSegment[], v: number = 0): LineSegment[][] {
    let out = [];
    let runningV = v;
    for (let i = segments.length - 1; i >= 0; i--) {
        out[i] = planSegment(segments[i], runningV, true);
        runningV = out[i][0].profile.v0;
    }
    return out;
}

function forwardPass(segments: LineSegment[], v0: number, limits: KinematicLimits): LineSegment[] {
    let res: LineSegment[] = [];
    if (segments.length == 0) {
        return res;
    }
    let prev: LineSegment | null = null;
    let velocityInit = v0;
    segments.forEach(function (s: LineSegment) {
        let p = s.profile;
        let v = limitVector(s.unit, limits.vMax);

        if (prev != null) {
            let jv = computeJunctionVelocity(prev, s, limits);
            if (jv != null) {
                velocityInit = Math.min(velocityInit, jv);
            }
        }

        let changed = false;
        if (p.v0 > v || p.v > v) {
            p = normalize(Math.min(p.v0, v), Math.min(p.v, v), null, null, p.x) as FirstOrder;
            changed = true;
        }
        if (Math.abs(p.a) > s.aMax) {
            p = normalize(p.v0, null, s.aMax * p.a / Math.abs(p.a), null, p.x) as FirstOrder;
            changed = true;
        }
        let seg = s;
        if (changed) {
            seg = lineSegment(s.parent, s.start, s.end, s.unit, p, s.aMax);
        }

        planSegment(seg, velocityInit).forEach(function (sub: LineSegment) {
            velocityInit = sub.profile.v;
            res.push(sub);
        });

        prev = seg;
    })

    return res;
}

function planSegment(s: LineSegment, v: number, reverse: boolean = false): LineSegment[] {
    let a = s.aMax;
    let p;
    if (!reverse) {
        p = reverseFirstOrder(s.profile);
    } else {
        p = s.profile;
    }

    if (p.v0 <= v) {
        return [s];
    }

    let da = a - p.a;
    let dv = p.v0 - v;

    if (da <= 0 || p.t * da <= dv) {
        if (reverse) {
            p = normalize(null, v, -1 * a, null, p.x);
        } else {
            p = normalize(v, null, a, null, s.profile.x);
        }
        return [lineSegment(s.parent, s.start, s.end, s.unit, p!, s.aMax)];
    }

    let firstProfile = normalize(v, null, a, dv / da, null) as FirstOrder;
    let secondProfile = normalize(firstProfile.v, p.v, null, null,  p.x - firstProfile.x) as FirstOrder;

    if (reverse) {
        // potential area for error
        let firstProfileOg = firstProfile;
        firstProfile = reverseFirstOrder(secondProfile);
        secondProfile = reverseFirstOrder(firstProfileOg);
    }

    let crossing = coords(s.start.x + s.unit.x * firstProfile.x, s.start.y + s.unit.y * firstProfile.x);

    return [lineSegment(s.parent, s.start, crossing, s.unit, firstProfile, s.aMax),
            lineSegment(s.parent, crossing, s.end, s.unit, secondProfile, s.aMax)];
}

function reverseFirstOrder(profile: FirstOrder): FirstOrder {
    return firstOrder(profile.v, profile.v0, 0 - profile.a, profile.t, profile.x);
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
        junctionVect.y /= Math.sqrt(dot([junctionVect.x, junctionVect.y], [junctionVect.x, junctionVect.y]));

        let junctionAcceleration = limitValueByAxis(limits.aMax, junctionVect);
        let sinThetaD2 = Math.sqrt(0.5 * (1 - junctionCos));
        let junctionVelocity = (junctionAcceleration * limits.junctionDeviation * sinThetaD2) / (1 - sinThetaD2);
        return Math.max(limits.junctionSpeed, junctionVelocity);
    }
}

function limitValueByAxis(limits: Coords, vector: Coords): number {
    let limitValue = 1e19;
    // handle x coord
    if (vector.x != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.x / vector.x));
    }

    // handle y coord
    if (vector.y != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.y / vector.y));
    }

    return limitValue;
}

/*
function linspace(start: number, stop: number, cardinality: number): number[] {
    let arr: number[] = [];
    let step = (stop - start) / (cardinality - 1);
    for (let i = 0; i < cardinality; i++) {
        arr.push(start + (step * i));
    }

    return arr;
}
*/

function TrajectoryWindow({ toolpath, min, max }: TrajectoryWindowProps) {
    // TODO: do all the planning using the toolpath parameter passed in the props
    // let { locations, prePlanned, halfPlanned, fullyPlanned} = makeTestSegment(20);
    if (!toolpath) {
        // If no toolpath is selected, render empty divs for the graphs
        return (
            <div>
                <div className="plot-title">Locations to be visited</div>
                <div className="empty-plot">No toolpath selected</div>

                {DEBUG && (
                    <React.Fragment>
                    <div className="plot-title">Pre-planned Segments</div>
                    <div className="empty-plot">No toolpath selected</div>
                    <div className="plot-title">Half-planned Segments</div>
                    <div className="empty-plot">No toolpath selected</div>
                    </React.Fragment>
                )}
                <div className="plot-title">Fully-planned Segments</div>
                <div className="empty-plot">No toolpath selected</div>
            </div>
        );
    }

    let { locations, prePlanned, halfPlanned, fullyPlanned } = main(toolpath);
    return (<div>
        <div className="plot-title">Locations to be visited</div>
        <SegmentPlot segments={locations} min={min} max={max}></SegmentPlot>

        {DEBUG && (
            <React.Fragment>
            <div className="plot-title">Pre-planned Segments</div>
            <ProfilePlot lineSegments={prePlanned} min={min} max={max}></ProfilePlot>
            <div className="plot-title">Half-planned Segments</div>
            <ProfilePlot lineSegments={halfPlanned} min={min * 3} max={max * 3}></ProfilePlot>
            </React.Fragment>
        )}
        <div className="plot-title">Fully-planned Segments</div>
        <ProfilePlot lineSegments={fullyPlanned} min={min * 9} max={max * 9}></ProfilePlot>
    </div>)
};

function App() {
    const [currentToolpath, setCurrentToolpath] = useState<Toolpath | null>(null);
    const selectToolpath = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const toolpathName = event.target.value;
        const toolpath = TOOLPATH_TABLE[toolpathName];
        setCurrentToolpath(toolpath);
    };

    let max = 0;
    if (currentToolpath != null) {
        max = currentToolpath.instructions.length - 1;
    }

    const [minValue, setMinValue] = useState<number>(0);
    const [maxValue, setMaxValue] = useState<number>(0);

    
    useEffect(() => {
        // Update maxValue whenever currentToolpath changes
        setMaxValue(max);
    }, [max, currentToolpath]);
    

    const handleRangeChange = (newRange: number[] | number) => {
        let range = newRange as number[];
        setMinValue(range[0]);
        setMaxValue(range[1]);
    }

    return (
        <div>
            <DashboardSettings onSelect={selectToolpath}></DashboardSettings>
            <RangeSlider max={max} onChange={handleRangeChange}></RangeSlider>
            <TrajectoryWindow 
              toolpath={currentToolpath}
              min={minValue}
              max={maxValue}>
            </TrajectoryWindow>
        </div>
    );
}

ReactDOM.render(<App></App>, document.getElementById("app"));
